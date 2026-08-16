# Plan — Seasonal baseline via continuous aggregate (+ Toolkit distribution)

> Status: **written plan, pre-implementation** (2026-07-14). Reviewed adversarially by
> Database Optimizer + Infrastructure Maintainer; findings folded. Consolidated after a
> CodeRabbit pass on PR #270 removed the internal contradictions of the first draft.
> Covers GitHub **#253** (supersede the seasonal baseline via an hourly rollup) + its
> prerequisites. ADR §6c · Epic #248 · #252 merged (#268).

## TL;DR

`getSeasonalBaseline` scans **7 days of raw `queue_metric_snapshots`** per explain to compute
`median` + `p95` of a metric at a given hour-of-day. At 100k servers the non-sargable
`EXTRACT(HOUR …)` over compressed chunks is a decompression cliff (ADR §6c). We replace it with
a **pre-aggregated hourly rollup** (a TimescaleDB continuous aggregate, "CAGG") and repoint the
service to read it. Percentiles in a CAGG need the **Toolkit** (`percentile_agg` /
`approx_percentile`, uddsketch) → the Toolkit must be present on every deploy path (resolved
below, no home-made image).

Two coupled decisions shape the work:

1. **Toolkit distribution** — official `timescale/timescaledb-ha` image everywhere
   containerised + apt package for binary. **No home-made image, no Tiger Cloud.**
2. **`counter_agg` / Philosophy B** — whether to replace #252's hand-rolled `deriveRate` by
   storing only raw counters and deriving the rate at read. This is decided by a **perf-gate**
   (below) and **reshapes the CAGG**, so it comes **before** #253.

## Decisions (resolved)

### Toolkit distribution — official `-ha` everywhere, nothing home-made
The Toolkit ships in the official `timescale/timescaledb-ha` image (and Timescale Cloud), not
the plain image. Rather than build/own an image, standardise on the official one:

| Deploy path | Toolkit via | Home-made? |
|---|---|---|
| Our infra (staging/prod) | official `-ha`, self-hosted on our Hetzner box (Toolkit free) | no |
| Self-hosted Docker Compose | official `-ha` (already pinned) | no |
| Self-hosted Dokku | Postgres `-ha` via **plain Docker** (NOT the `dokku-postgres` plugin) | no |
| Self-hosted binary | apt `timescaledb-toolkit-postgresql-17` | no |

The `dokku-postgres` plugin mounts `/var/lib/postgresql/data`, which clashes with `-ha`'s
`/home/postgres/pgdata` (silent data-loss). Running `-ha` as a plain Docker container on the
Dokku host (the deploy doc already points here) sidesteps that. **Standardising on `-ha`
everywhere also dissolves two review findings: version skew (all envs identical, CI finally
tests the shipped env) and image-maintenance tax (nothing to maintain).** Tiger Cloud rejected
on cost (≥$30/mo + $/GB storage, scaling with our trace disk wall) vs the ~€17/mo Hetzner box
we already run.

### Direction — approximate p95 on a Toolkit foundation
The baseline reports `median` + **approximate p95** via `approx_percentile` over a uddsketch.
This is **not bit-exact** vs `PERCENTILE_CONT` — uddsketch default relative error ≈ **0.1%**.
That is indistinguishable for an LLM anomaly judgment, but the plan and the acceptance criteria
must say **approximate p95** and make **"within uddsketch error tolerance (~0.1% relative)"**
the explicit validation criterion — never "exact". mean±σ remains the documented **plan B**
(only if we ever refuse a Toolkit dependency; see end).

### Sequencing — `counter_agg` (perf-gated) before #253
`counter_agg` is not a drop-in for `deriveRate`. `deriveRate` (#252) is ingest-time, two-point,
stored in the `publishRate`/`consumeRate` columns (**Philosophy A**). `counter_agg` is a
read-time aggregate over stored counters (**Philosophy B**). Adopting it = the reader migration
#252 deferred (it kept the raw counters precisely to keep this door open), and it **reshapes
#253** (no stored rate column → the CAGG aggregates counters, not a rate column). So:

1. **PR-A** — the `counter_agg` / Philosophy-B question, decided by the **perf-gate**.
2. **#253** — the baseline CAGG, in the shape PR-A settles.

## The hard ordering gate (extensions + CAGG DDL)

`prisma migrate deploy` (Compose/Dokku) and the binary's in-process `runMigrations`
(`core/migrate.ts`) both run at the migrate step. Two facts:

- **A CAGG cannot be created in a transaction**, and both runners wrap each migration file in
  one (Prisma has no per-file opt-out; the binary runner's `nonTransactional` regex doesn't
  match `CREATE MATERIALIZED VIEW`). So CAGG DDL **must not live in a migration file** — it goes
  in the out-of-Prisma bootstrap (below).
- **`CREATE EXTENSION timescaledb_toolkit` hard-errors when the Toolkit isn't on the server**
  (`IF NOT EXISTS` doesn't help — it only skips when already installed in the DB). So the
  Toolkit image/package must be live on an environment **before** #253's bootstrap runs there.
  A startup **preflight** (`SELECT 1 FROM pg_available_extensions WHERE name =
  'timescaledb_toolkit'`) fails fast with an operator message instead of a cryptic crash. On
  Dokku (migrations are a manual/CI step, not web boot) a missing Toolkit surfaces at that step
  or as a runtime feature failure, not a boot crash-loop — a **version-gated upgrade note** in
  `SELF_HOSTED_DEPLOYMENT.md` + release notes tells self-hosters to be on `-ha`/apt-Toolkit
  before upgrading. (`timescaledb-toolkit` has **no Homebrew formula** → the macOS binary path
  can't have it; call it out or drop macOS support for this feature.)

## PR-A — `counter_agg` / Philosophy B, decided by a perf-gate

### What the code actually reads (grounding)
**No tight hot loop reads the DB rate column.** `alert.analyzer` (the periodic `alert-worker`)
reads the **live broker rate** (`message_stats.publish_details.rate`), not the DB — unaffected
by A/B. Every DB-column reader is **on-demand** (`signals.ts` via incident-diagnosis explain,
the metrics chart router up to 30d, rca-page) or **infrequent batch** (`digest-worker`, 24h),
all budget-bounded (300–400 ms) + omit-on-timeout. So the gate is **not** "hot-loop
regression" — it is "does read-time derivation stay within the on-demand/batch budget at scale,
especially on windows crossing the 8h metrics compression boundary".

### The Philosophy-B read shape (`counter_agg` — no home-made calc)
Derive the rate on-read via the Toolkit primitive `counter_agg`, bucketed at whatever
granularity the reader needs — **not** a `LAG` window function (that would just be the home-made
calc moved into SQL). Two correctness points baked in:
- The counter time axis is cast to a **UTC `timestamptz`** — `counter_agg` expects `timestamptz`
  and the column is naive UTC, so an explicit `AT TIME ZONE 'UTC'` keeps `rate()`
  session-TZ-independent.
- The predicate binds **`workspaceId`** alongside `serverId`/`queueName`/`vhost`, matching the
  existing readers. (`serverId` is globally unique — ADR §4 makes it the sole hot-table key — so
  it cannot mix tenants; `workspaceId` is defense-in-depth and carries tenancy through.)
```sql
SELECT time_bucket(interval '30 minutes', "timestamp") AS bucket,
       rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision)) AS publish_rate,
       rate(counter_agg("timestamp" AT TIME ZONE 'UTC', "deliverCount"::double precision)) AS consume_rate
FROM queue_metric_snapshots
WHERE "workspaceId"=$1 AND "serverId"=$2 AND "queueName"=$3 AND "vhost"=$4
  AND "timestamp" >= $5
GROUP BY bucket ORDER BY bucket;
```

### The perf-gate (decides B-pur vs hybrid)
The one real risk: `rate(counter_agg(...))` over **compressed** chunks may force full-range
decompression of the counter columns. Short windows (<8h, hot) are trivially fine; the risk is
the **long-window** readers.

| # | Read path | Window | Crosses 8h compression? | Budget |
|---|---|---|---|---|
| G1 | Chart per-queue series (`metrics.ts`) | 30d (Enterprise ceiling) | yes, heavily | p95 < 300 ms |
| G2 | Incident signals series (`signals.ts`) | short (`windowMinutes`) + a long past-incident case | short: no / long: yes | ~400 ms |
| G3 | Digest aggregate (`digest`, 24h/server) | 24h | yes | batch (looser) |

G1 is make-or-break. Env: disposable Timescale+Toolkit box seeded to T2 (~30k series, 30d),
with chunks >8h compressed. **Prerequisite:** extend `scripts/stress/sql/02_gen_snapshots.sql`
to populate `publishCount`/`deliverCount` as monotonic counters (new since #252). Harness:
paired `gN_series_columnread.sql` (A) vs `gN_series_lag.sql` (B) under `run_read.sh`, 16
concurrent, `EXPLAIN (ANALYZE, BUFFERS)` to see decompression. ~half a day, disposable box.

### Two outcomes — and a semantic dimension, not just perf
- **PASS → B-pur:** Phil-B p95 within budget on the compressed-crossing window (esp. G1 <
  300 ms). Then **drop `publishRate`/`consumeRate`**, migrate the **~19 source readers** (alert
  engine consumes live rate so is untouched; the DB readers are signals, LLM context builders,
  digest, metrics router, rca-page) + regenerate the ~30 eval fixtures — **one PR** (ai_rules:
  no half-conversion; prefer a library over custom code). Baseline CAGG becomes counter_agg-based.
- **FAIL → hybrid:** keep `deriveRate` + the columns for the series readers (Phil A); use
  `counter_agg` only in the CAGG/analytics layer. `deriveRate` stays (~15 lines).
- **Semantic note (weigh alongside perf):** B-pur coarsens the baseline — with no per-sample
  rate column, the CAGG percentiles **hourly rates** (`rate(counter_agg(...))` per bucket), not
  per-sample rates, so the distribution is smoother than today's raw query. Hybrid keeps the
  per-sample rate column → `percentile_agg("publishRate")` matches the current raw query exactly
  (DB Optimizer verified this equivalence within uddsketch error). So hybrid is not just the
  perf-safe option, it is the **semantics-preserving** one; its only cost is keeping ~15 lines
  of `deriveRate`. The gate weighs perf **and** this semantic difference.

## #253 — the baseline CAGG

The concrete shape is **gate-contingent**. The stated direction is Philosophy B, so the primary
form below is counter_agg-based; the hybrid form is the fallback. Either way, the CAGG is
created by the **out-of-Prisma bootstrap** (next section), never a migration file.

### Primary (B-pur): counter_agg-based hourly CAGG
```sql
-- 20_queue_metric_hourly.sql   (bootstrap-managed, non-transactional)
CREATE MATERIALIZED VIEW queue_metric_hourly
WITH (timescaledb.continuous,
      timescaledb.materialized_only = true,      -- read never touches raw (see note)
      timescaledb.create_group_indexes = false) AS
SELECT "workspaceId", "serverId", "queueName", "vhost",
       time_bucket('1 hour', "timestamp")                         AS bucket,
       counter_agg("timestamp" AT TIME ZONE 'UTC', "publishCount"::double precision) AS publish_ctr,
       counter_agg("timestamp" AT TIME ZONE 'UTC', "deliverCount"::double precision) AS deliver_ctr,
       percentile_agg("messagesReady"::double precision)          AS ready_pct,
       count(*)                                                   AS n
FROM queue_metric_snapshots
GROUP BY 1, 2, 3, 4, 5
WITH NO DATA;
```
The service reads, for the matching hour-of-day over 7 days, the percentile over hourly rates:
`approx_percentile(0.5|0.95, percentile_agg(rate(publish_ctr)))` composed over the hourly
buckets, plus `sum(n)` for the min-sample gate.

### Fallback (hybrid): percentile_agg over the retained rate column
If the gate keeps the columns: `percentile_agg("publishRate")` / `("consumeRate")` per hour,
and the service reads `approx_percentile(0.5|0.95, rollup(...))` — per-sample rate percentiles,
exactly equivalent (within uddsketch error) to today's raw query.

### Correctness fixes folded from the reviews (apply to either shape)
- **Quoted camelCase columns** — `queue_metric_snapshots` has no column `@map`; use
  `"workspaceId"`, `"serverId"`, `"queueName"`, `"vhost"`, `"timestamp"` (the #249 bug reproduced
  in the first draft's SQL).
- **`materialized_only = true`** everywhere (no real-time raw scan — the whole premise;
  `end_offset` is 1h and baselines move over hours, so real-time buys nothing).
- **Explicit composite index** — `create_group_indexes = false` +
  `CREATE INDEX IF NOT EXISTS ON queue_metric_hourly ("serverId","queueName","vhost", bucket
  DESC)` (the auto per-GROUP-BY indexes don't cover the 4-way equality read).
- **CAGG retention** — `add_retention_policy('queue_metric_hourly', INTERVAL '10 days')`
  (read window 7d; without it the rollup grows unbounded while raw drops at 30d). Re-derive the
  storage estimate from a realistic series count; measure sketch column size in the smoke test.
- **Drop `AT TIME ZONE 'UTC'`** — the column is `timestamp without time zone` (naive UTC);
  `EXTRACT(HOUR FROM bucket)` / `EXTRACT(HOUR FROM "timestamp")` makes old ≡ new exactly and
  removes a session-TZ bug that also affects today's raw query.
- **Refresh policy** — `add_continuous_aggregate_policy(start_offset => '8 days', end_offset =>
  '1 hour', schedule_interval => '1 hour')`. `start_offset 8d < retention 30d` is safe; refresh
  reads compressed chunks fine (append-only). **Initial materialization — exactly one path:**
  `WITH NO DATA` + the first scheduled refresh materialises the last 8 days (tables are empty
  pre-launch, so there is nothing to backfill; NO inline `refresh_continuous_aggregate` — it is
  illegal in a transaction and would block boot). For a future *populated* install: an
  out-of-band, day-by-day refresh over ≤8 days from a one-shot script, never inline.
- **Prisma drift** — the CAGG is invisible to `schema.prisma`; the dev/shadow DB must use the
  Toolkit image and the CAGG is documented in a schema comment (partial-index precedent).

### Service repoint (`seasonal-baseline.service.ts`)
Swap the raw `PERCENTILE_CONT … EXTRACT(HOUR …)` scan for the CAGG read above; keep the
allowlist, 5-min cache, single-flight, 400 ms timeout + omit-on-timeout, `MIN_SAMPLE_COUNT`
(now `sum(n)`), and the `SeasonalBaseline` shape unchanged. `EXTRACT(HOUR)` now runs over ≤168
tiny rows per series, not ~10k raw rows.

### Tests
Unit (the service query, mocked, as today) + integration (CI has the Toolkit via `-ha`: create
the CAGG, assert `approx_percentile` is **within the tolerance** of the raw `PERCENTILE_CONT`,
and that the bootstrap is a no-op on a second run).

## The out-of-Prisma bootstrap (B0 fix) — versioned, immutable, non-destructive

CAGG DDL lives outside the migration path, in an idempotent boot-time bootstrap reusing the
shape of `core/migrate.ts` (advisory lock, tracking table, per-file checksum) but running each
statement **without** `BEGIN/COMMIT`. Required by any CAGG (B-pur or hybrid).

**Files are immutable and versioned, exactly like migrations — never edit a shipped file.** To
change the CAGG, add a **new** versioned file (`21_queue_metric_hourly_v2.sql`) that performs
the change explicitly; you never rely on a checksum change re-running a `DROP`. The runner:

- Applies files in lexical order; each `.sql` file's statements are split on an explicit
  `--> statement-breakpoint` sentinel (Drizzle pattern — no fragile SQL parser) and each runs in
  its own `query()` (multi-statement in one `query()` = implicit transaction = the CAGG fails
  again).
- Tracks `(filename, checksum)` in `_qarote_ts_bootstrap`. A file whose checksum **changed vs
  the recorded one is an ERROR** (operator message: "add a new versioned file"), **not** an
  auto-drop. This is the critical fix: a formatting/comment edit must never silently
  `DROP MATERIALIZED VIEW … CASCADE` the CAGG + its materialization, and a rolling deploy must
  never observe a transiently-missing object.
- Preflight `pg_available_extensions` for `timescaledb_toolkit` → fail fast (see ordering gate).

A deliberate drop-and-recreate (e.g. a schema change on a populated install) is an explicit new
versioned file that owns its `DROP` + re-materialize, reviewed as such — never a side effect of
editing an existing file. Called once at server startup after the migrate step, in every mode
(idempotent → safe every boot). **Build wiring:** the `.sql` dir must be copied next to the
binary, mirroring the existing `migrations/` copy step.

SQL files live in `apps/api/prisma/timescale/` (`00_extensions.sql`,
`20_queue_metric_hourly.sql`); statements separated by the sentinel, e.g.:
```sql
CREATE MATERIALIZED VIEW queue_metric_hourly WITH (...) AS ... WITH NO DATA;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS queue_metric_hourly_lookup_idx ON queue_metric_hourly (...);
--> statement-breakpoint
SELECT add_continuous_aggregate_policy('queue_metric_hourly', ..., if_not_exists => true);
--> statement-breakpoint
SELECT add_retention_policy('queue_metric_hourly', INTERVAL '10 days', if_not_exists => true);
```

## Review findings — verified sound (no change needed)
`percentile_agg` in a CAGG + `approx_percentile(rollup(...))` is correct; `rollup`-of-hourly ≡
percentile-over-union within uddsketch error (~0.1%, tighter than 1%); policy offsets fine;
CAGG refresh can read compressed chunks; `sum(n)` for the min-sample gate is correct; #252
semantics-mix self-heals in ≤7d (read window is 7d). Blockers/majors fixed above: CAGG-in-
transaction (B0 bootstrap), snake_case columns, inline backfill, missing index, missing
retention, `AT TIME ZONE`, private-image data-path + version skew (both dissolved by official
`-ha`), `POSTGRES_IMAGE` rebuild footgun (validate on staging), no `CREATE EXTENSION` guard
(preflight instead), destructive checksum-triggered drop (versioned immutable files instead).

## Deferred axes (backlog — deliberate follow-ons, NOT part of #253)
- **DDL migration tooling.** The bricolage (Prisma Migrate can't express our DDL → custom
  `core/migrate.ts` + this bootstrap = 3 things manage the schema) violates ai_rules "prefer a
  library over custom code". **Best end-state: Prisma Client generated by introspection (`db
  pull` → `generate`) + ONE SQL-first migration tool owning ALL DDL with per-migration
  transaction control** — collapses the 3 runners into 1. Pick: **`node-pg-migrate`**
  (pragmatic, numbered up/down, explicit `noTransaction`) or **`graphile-migrate`**
  (Postgres-first, coherent with graphile-worker from ADR-004, mindset shift). Real refactor →
  own ticket, after #253. The bootstrap is the deliberate interim; adopting a tool *just* for
  the CAGG = 2 tools = more bricolage, so it's all-or-nothing.
- **Trace hot window stays 2d** (not 1d) — deliberate: fast reads for 2 days of forensics; 1d is
  a reserve knob to ~double the disk ceiling when disk actually saturates (YAGNI now).
- **PaaS reconsideration** when the data plane grows (2× Postgres + graphile-worker + maybe
  ClickHouse): Dokku's per-service plugins fit a multi-stateful-service topology worse than a
  bring-your-own-container host (Compose/Kamal/Coolify). Look deliberately then.
- **Terraform vs hcloud-CLI consolidation:** infra is not fully terraform-managed (API + DB
  boxes created via `hcloud` CLI first).

## Fallback (only if we ever refuse a Toolkit dependency) — mean ± σ
A CAGG storing `count, avg, stddev, max` (all CAGG-native, no Toolkit), portable everywhere.
Baseline becomes an `avg ± k·stddev` band + `max` ceiling instead of median/p95 — kills the same
cliff, ~90% of the anomaly-detection value, zero Toolkit dependency. Not chosen (Toolkit is now
available everywhere via `-ha`), kept as the escape hatch.

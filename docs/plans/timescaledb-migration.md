# TimescaleDB migration plan (v2 — review-incorporated)

> Statut : **plan pré-implémentation, relu par Backend Architect + DB Optimizer**
> (2026-06-07). Contexte : pré-lancement, **tables vides**, pas de données prod.
> Postgres self-hosté via Dokku/Hetzner (extension dispo). **PG 17.**

## Décisions actées
1. Convertir **les deux** tables time-series en hypertables : `QueueMetricSnapshot`
   + `MessageTraceEvent`.
2. **Timescale obligatoire partout** (cloud + self-hosted), un seul schéma.

## ⚠️ Décision rétention (2026-06-07) — HOMOGÉNÉISÉE → plein gain Timescale
La review a montré que la rétention **par-tenant** (DELETE par-row) tuait la
compression. **Décision : rétention UNIFORME sur les deux tables** → chunk-drop
fait la rétention, compression activée, **les deux crons DELETE disparaissent.**

| Table | Rétention uniforme | Compression | Cron DELETE |
|---|---|---|---|
| **`QueueMetricSnapshot`** | **30 jours** | ✅ jours 2→30 | **supprimé** (chunk-drop) |
| **`MessageTraceEvent`** | **7 jours** | ✅ jours 2→7 | **supprimé** (chunk-drop) |

- Métriques 30j : la rétention par-plan (24h/14j/90j) **disparaît** → 30j pour
  tous. (Rétention n'était pas un vrai levier payant ; leviers = serveurs / AI /
  SSO.) Volume métriques borné (queue count) → 30j cheap + compressé.
- Trace 7j : le `traceRetentionHours` par-workspace **disparaît** → 7j fixe.
  Plafonné à 7j = coût **borné** (≠ 30j non borné, écarté car la trace scale au
  **débit de messages**, imprévisible). Compressé : tenant modeste ~3 Go,
  chargé ~30 Go. Knob par-workspace perdu (mineur ; 7j reste OK côté privacy,
  payload capture toujours opt-in).
- **Conséquence orphelins** : le chunk-drop ne lance pas de code app → pas de
  cascade-cleanup possible sur drop. Solution : **plafonner la rétention des
  `LlmExplanation` de trace à 7j** (dans `llm-explanation-retention.cron`) pour
  qu'elles expirent avec/avant la trace → pas d'orphelin.

## État vérifié
- **`QueueMetricSnapshot`** (`schema.prisma:264`) : PK `id` (cuid) ; unique
  `[serverId,queueName,vhost,timestamp]` (timestamp ✓) ; dim `timestamp` ; FK
  sortante serverId ; **aucune FK entrante**. Rétention = **par-plan** via le
  cron DELETE (`queue-metrics.service.ts:148`, `maxMetricsRetentionHours` =
  24h FREE / 336h DEV / 2160h ENT — `features.service.ts:125,201,294`). *(NB :
  la Privacy Policy dit "7 jours" — incohérence doc à corriger séparément.)*
- **`MessageTraceEvent`** (`schema.prisma:435`) : PK `id` (uuid) ; `cursorId
  @unique autoincrement` (curseur pagination) ; dim `timestamp` ; FK **entrante**
  `LlmExplanation.traceEventId → id` (`:1338`). Rétention par-workspace
  (`traceRetentionHours` défaut 24h, max 168h) via `trace-cleanup.service`.
- Image actuelle : `postgres:17-alpine`. E2E : `postgres:15-alpine`
  (`e2e-tests.yml:96` — drift de version pré-existant à aligner).
- `CREATE EXTENSION`/migrations tournent **au boot** (`server.ts:264`).

## Contrainte Timescale : la colonne de partition (`timestamp`) doit être dans la PK et dans CHAQUE index unique.

---

## Workstream 1 — Schéma Prisma (décisions committées)
### `QueueMetricSnapshot`
- **PK = `@@id([id, timestamp])`** (Option A — garder le surrogate `id` ;
  rejeter la clé naturelle = PK trop large sur la table la plus chaude).
- **Dropper `@@index([timestamp])`** (redondant : Timescale crée son index temps).
- Conserver le reste.
### `MessageTraceEvent`
- **PK = `@@id([id, timestamp])`** (garder `id` : c'est le soft-ref de
  `LlmExplanation` + le `findUnique({where:{id}})` de `llm.router.ts:1065`).
- `cursorId @unique` → **`@@unique([cursorId, timestamp])`** (cursorId reste
  global-unique via la séquence ; pagination `cursorId > lastId ORDER BY
  cursorId` **confirmée intacte** — `recording.ts:398-400`).
- **Dropper `@@index([timestamp])`** redondant.
- Conserver les index serverId-led.
### `LlmExplanation` — drop FK trace
- Retirer la relation `traceEvent` + back-relation `llmExplanations`.
- **Garder** `traceEventId String?` (soft-ref), son index, le CHECK polymorphe.

---

## Workstream 2 — Migration hypertable (SQL raw)
Migration de suivi après celle générée par Prisma (PK/FK). Précédent de
hand-written SQL : `20260523130000_add_unrouted_publishes_index`.
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
-- tables vides → pas de migrate_data
SELECT create_hypertable('queue_metric_snapshots','timestamp',
       chunk_time_interval => INTERVAL '1 day',  if_not_exists => TRUE);
SELECT create_hypertable('message_trace_events','timestamp',
       chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- Compression (rétention UNIFORME → plus de DELETE par-row → compression OK)
ALTER TABLE queue_metric_snapshots SET (timescaledb.compress,
  timescaledb.compress_segmentby = 'server_id, queue_name',
  timescaledb.compress_orderby   = 'timestamp DESC');
SELECT add_compression_policy('queue_metric_snapshots', INTERVAL '2 days');
ALTER TABLE message_trace_events SET (timescaledb.compress,
  timescaledb.compress_segmentby = 'server_id',
  timescaledb.compress_orderby   = 'cursor_id DESC');
SELECT add_compression_policy('message_trace_events', INTERVAL '2 days');

-- Rétention = chunk-drop UNIFORME (remplace les crons DELETE)
SELECT add_retention_policy('queue_metric_snapshots', INTERVAL '30 days');
SELECT add_retention_policy('message_trace_events',   INTERVAL '7 days');
```
- Chunk 1j (snapshots) / **1h** (trace : volume débit-bound × ~8 index → chunk
  petit pour que le récent tienne en mémoire).
- Compression APRÈS 2j (les 1-2 derniers jours chauds restent non compressés ;
  le reste compressé ~90%). Pas de conflit DML car **plus de DELETE par-row**.
- `create_hypertable` APRÈS que la PK contienne `timestamp`, sur table **vide**.

## Workstream 3 — Crons de rétention (SUPPRIMÉS)
Rétention uniforme → le **chunk-drop remplace les DELETE**. Donc :
- **`queue-metrics.service` DELETE par-plan → SUPPRIMÉ** (+ retirer le gating
  `maxMetricsRetentionHours` côté plan : 30j pour tous).
- **`trace-cleanup.service` DELETE par-workspace → SUPPRIMÉ** (+ retirer le
  réglage `traceRetentionHours` / l'UI "Manage retention" : 7j fixe).
- **`llm-explanation-retention.cron`** : **plafonner les explications de TRACE à
  7j** (≤ rétention trace) pour qu'elles expirent avant le chunk-drop → pas
  d'orphelin (le chunk-drop ne lance pas de code app, donc pas de cascade).
- `incident-diagnosis-cleanup` (90j) : inchangé (table non convertie).

## Workstream 4 — Infra (image + ordering)
- Image : `postgres:17-alpine` → **`timescaledb-ha:pg17` PINNÉE** (pas `latest`)
  dans `docker-compose.selfhosted.yml`, `…-ee.yml`, template demo Ansible.
- **Aligner E2E** `postgres:15-alpine` → même image Timescale pg17
  (`e2e-tests.yml:96`).
- ⚠️ **Ordering dur (B3)** : `CREATE EXTENSION` tourne au boot (`server.ts:264`)
  → mauvaise image = **API crash-loop**, pas juste deploy raté. Le swap d'image
  doit **précéder ou être atomique** avec la migration sur **chaque** env
  (compose self-hosted, demo, **service Dokku cloud** que Brice recrée sur
  l'image Timescale — tables vides, trivial).
- `docs/SELF_HOSTED_DEPLOYMENT.md` : noter la dépendance + le mode d'échec
  "extension absente = crash boot".

## Workstream 5 — Test / CI (re-scopé, blast radius réduit)
- ⚠️ La **suite vitest backend mocke Prisma** (`vitest.setup.ts:16`, dummy URL,
  `vitest-mock-extended`) → **ne touche PAS Postgres**, `CREATE EXTENSION` ne la
  casse pas. (Mon WS5 v1 était faux.)
- Vrai cible : la **Postgres E2E** (`e2e-tests.yml:96`, pg15 → Timescale pg17)
  + le `pnpm db:migrate` **local dev** (doc + compose dev).

## Workstream 6 — Impacts code
- **FK trace droppée → orphelins gérés par rétention** : plus de cron DELETE
  trace pour hooker un cascade ; le chunk-drop ne lance pas de code app. Donc
  on **plafonne les `LlmExplanation` de trace à 7j** (`llm-explanation-retention.cron`)
  → elles expirent avec/avant la trace. (Seuls 2 chemins lisent le soft-ref,
  aucun ne join — `llm.router.ts:118,1089`.)
- **Retirer le réglage `traceRetentionHours`** (workspace) + l'UI "Manage
  retention" du Manage server (devient 7j fixe).
- **Retirer le gating `maxMetricsRetentionHours`** (plan) → 30j pour tous.
- Pagination live-tail : **confirmée intacte**.

## Doc / UI à aligner (suite décision 30j/7j)
- **Landing** : mentionner "30 days metric history" (Features/Pricing).
- **App** : copy réglages serveur (retire le knob trace retention), cockpit /
  charts (fenêtre dispo).
- **Privacy Policy** : corriger "7 jours" métriques → **30 jours** ; préciser
  trace **7 jours**. (Incohérence pré-existante doc vs code.)

## Décisions résolues
- Rétention : **uniforme** — métriques **30j**, trace **7j** → chunk-drop +
  compression, **crons DELETE supprimés**.
- PK : **Option A composite surrogate** sur les deux.
- FK trace : drop + **orphelins gérés par cap rétention explications 7j**.
- Compression : **ON** sur les deux (segmentby snapshots `server_id,
  queue_name` ; trace `server_id`).
- Image : **`timescaledb-ha:pg17` pinnée**.
- Index `[timestamp]` : **droppé** sur les deux.
- WS5 : E2E + dev, pas la suite unit.

## Footguns documentés
- Ne **jamais `prisma db pull`** pour régénérer `schema.prisma` : les
  hypertables/policies vivent dans le schéma `timescaledb`, drift no-op possible
  (pas corruptif, mais piège).
- `migrate diff`/shadow DB ne round-trippe pas l'état hypertable.

## Ordre de rollout
1. Schéma Prisma (PK + drop FK + drop index timestamp) → migration générée.
2. Migration raw SQL (extension + hypertables + retention backstop).
3. Images compose (self-hosted/demo/E2E) + doc Dokku cloud + ordering.
4. Cascade-cleanup dans `trace-cleanup.service`.
5. **Valider** : `db:migrate` sur Timescale pg17 local ; suite backend complète
   (full, pas scoped) ; `timescaledb_information.hypertables` liste les 2 ;
   `timescaledb_information.jobs` liste les 2 retention policies ; insert/select/
   pagination OK.

## À garder en tête (non bloquant)
- Si un jour rétention **uniforme** → réactiver la compression (`segmentby =
  'server_id, queue_name'`, `orderby 'timestamp DESC'` pour snapshots) = le vrai
  gain stockage.
- Incohérence Privacy Policy ("7 jours") vs code (par-tier) à corriger côté doc.

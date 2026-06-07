# LLM Eval Regression Gate

**Status:** Planning · **Owner:** briceth · **Date:** 2026-05-12

## Why

The LLM eval workflow (`.github/workflows/llm-eval.yml`) runs 23 fixtures through `claude-haiku-4-5`, grades each via a Sonnet judge, and applies a `threshold: 0.8` per-fixture gate. Today:

- `promptfoo eval` exits 100 if **any** fixture lands below threshold.
- Haiku is not perfect on every fixture, so the eval step is permanently red.
- Workaround in place (`continue-on-error: true`) keeps the job green but loses the regression signal entirely — a prompt change that makes things worse would not be detected.

We want a **regression gate**: block PRs that demonstrably degrade quality vs `main`, but tolerate Haiku's residual imperfection and the judge's variance.

## Design

### Pipeline shape

```
push: main                           pull_request: LLM paths
  │                                    │
  ▼                                    ▼
eval (no cache, repeat=3)            eval (no cache, repeat=3)
  │                                    │
  ▼                                    ▼
upload artifact                      download latest main artifact
"llm-eval-result"                    via gh CLI
                                       │
                                       ▼
                                     compare-to-baseline.ts
                                       │
                                  ┌────┴─────┐
                                  │          │
                                  ▼          ▼
                            gate PASS    gate FAIL
                                  │          │
                                  ▼          ▼
                            exit 0       exit 1 + PR comment
                            + PR comment (also on pass)
```

### Three gate rules

A PR fails the gate if **any** of these is true (comparing per-fixture):

1. **No fixture regresses PASS → FAIL beyond tolerance.** A fixture that passed on main but fails on the PR is a localised regression — block. Configurable tolerance via `MAX_REGRESSED_FIXTURES` env var (default 0; workflow sets it to 2). The tolerance exists because per-fixture judge variance at `repeat: 3` is ±0.4 — fixtures sitting near the 0.8 threshold flip PASS/FAIL across identical-prompt runs (documented empirically in `apps/api/src/ee/services/llm/__evals__/audits/2026-05.md`). PRs touching no prompt/rubric code (e.g. PR 2 adding a new service file) were routinely blocked on 2 such noise flips until tolerance landed. Drop back to 0 when `repeat: 5` reduces the noise floor.
2. **Pass count ≥ baseline.passCount.** Aggregate floor: number of fixtures clearing threshold must not decrease. Rule 1 tolerance does NOT silence this — a real regression that drops the aggregate still trips here.
3. **Avg score ≥ baseline.avgScore − 5 pts.** Absorbs judge variance (observed ±10 pts run-to-run on identical prompts). 5 pts is empirical — tightened or loosened as we accumulate data.

### Baseline storage

GitHub Actions artifact (`actions/upload-artifact@v7`). Already configured: the workflow uploads `llm-eval-result` on every run including `push: main`. PR runs fetch the latest successful main run's artifact via `gh run download`.

Retention: 7 days (current setting in `llm-eval.yml`). For this gate, 7 days is fine as long as main is merged-to at least weekly. If main goes longer without an LLM-paths change, the baseline expires — handled gracefully (gate skipped with warning, see edge case 1).

### Variance handling

Keep `repeat: 3`. The 5-pt tolerance on rule 3 absorbs residual variance. If false positives surface later, escalation path: bump to `repeat: 5` (~$0.22/run instead of $0.13).

### PR commenting

Post a markdown table comment on the PR after the gate runs — both on pass and fail, so improvements are visible too. Use a sticky marker (`<!-- llm-eval-gate -->`) to **edit the existing comment** on subsequent pushes rather than spam. Requires bumping `pull-requests: read` → `write` in the job permissions.

Example output:

```markdown
<!-- llm-eval-gate -->

## LLM Eval Gate · ✅ PASS

|                    | Baseline (main) | This PR | Δ     |
| ------------------ | --------------- | ------- | ----- |
| Pass count         | 8/23            | 11/23   | +3    |
| Avg score          | 71.3%           | 81.6%   | +10.3 |
| Fixtures regressed | —               | 0       | —     |

<details><summary>Per-fixture deltas</summary>

| Fixture                    | Baseline | This PR | Δ   |
| -------------------------- | -------- | ------- | --- |
| queue-depth-high-cascading | 20%      | 80%     | +60 |

| ...

</details>
```

## Implementation

### Files changed

```
.github/workflows/llm-eval.yml                                                 # workflow
apps/api/src/ee/services/llm/__evals__/gate/compare.ts                         # pure compare logic
apps/api/src/ee/services/llm/__evals__/gate/__tests__/compare.test.ts          # unit tests
apps/api/src/ee/services/llm/__evals__/gate/format-comment.ts                  # markdown formatter (pure)
apps/api/src/ee/services/llm/__evals__/gate/__tests__/format-comment.test.ts   # unit tests
apps/api/scripts/llm-eval/run-gate.ts                                          # CLI wrapper (file I/O + gh)
docs/plans/llm-eval-regression-gate.md                                         # this doc
```

Rationale for the split: vitest discovers only `apps/api/src/**`, so the testable logic lives there. The CLI script under `apps/api/scripts/` is thin glue (file I/O + `gh` shell-out) — anything beyond a few lines belongs in the tested module.

### `.github/workflows/llm-eval.yml` changes

1. Bump `permissions.pull-requests` from `read` to `write`.
2. Remove `continue-on-error: true` from the eval step (its purpose is now served by the new gate).
3. Keep the existing `actions/upload-artifact` step — it works for both PR and push triggers.
4. Add a new step `Compare to baseline` after upload, gated on `github.event_name == 'pull_request'`:
   - Uses `gh run list --workflow=llm-eval.yml --branch=main --status=success --limit=1` to find the latest main run.
   - Uses `gh run download <runId> --name llm-eval-result --dir /tmp/baseline/` to fetch.
   - Runs `tsx apps/api/scripts/llm-eval/run-gate.ts` which loads both JSONs, runs the pure compare, writes a comment via `gh pr comment`, and exits 0/1.

### `apps/api/scripts/llm-eval/run-gate.ts`

Single TypeScript file run via `tsx`. Inputs (env): `BASELINE_PATH`, `CURRENT_PATH`, `OUTPUT_COMMENT_PATH`. Pseudocode:

```typescript
const baseline = loadEvalJson(BASELINE_PATH); // { fixtureId → { score, pass } }
const current = loadEvalJson(CURRENT_PATH);

const flipsToFail = []; // rule 1
const summary = {
  baseline: { passCount, avgScore },
  current: { passCount, avgScore },
};

for (const fix of intersectKeys(baseline, current)) {
  if (baseline[fix].pass && !current[fix].pass) flipsToFail.push(fix);
}

const ruleViolations = [];
if (flipsToFail.length > 0) ruleViolations.push("regressed", flipsToFail);
if (summary.current.passCount < summary.baseline.passCount)
  ruleViolations.push("passCount");
if (summary.current.avgScore < summary.baseline.avgScore - 0.05)
  ruleViolations.push("avgScore");

writeMarkdownComment(OUTPUT_COMMENT_PATH, {
  summary,
  flipsToFail,
  ruleViolations,
});
process.exit(ruleViolations.length > 0 ? 1 : 0);
```

Per-fixture intersection only: new fixtures don't count against the gate; removed fixtures are ignored.

The CLI:

1. Reads `BASELINE_PATH` and `CURRENT_PATH` from env, parses both eval-result.json files.
2. Calls `compareEvals(baseline, current)` from `gate/compare.ts` to get the structured result.
3. Calls `formatComment(result)` from `gate/format-comment.ts` to get the markdown body.
4. Looks for an existing comment with the marker `<!-- llm-eval-gate -->` via `gh api repos/:owner/:repo/issues/:pr/comments`, edits if found or creates otherwise via `gh pr comment` / `gh api PATCH`.
5. Exits 0 if no rule violations, 1 otherwise.

## Edge cases

| Case                                           | Detection                                 | Behavior                                                               |
| ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| First PR after this lands, no main run yet     | `gh run list ... --limit=1` returns empty | Skip gate, exit 0, post comment "no baseline available — gate skipped" |
| Main baseline artifact retention expired (>7d) | `gh run download` returns 404             | Same as above                                                          |
| Main baseline JSON malformed                   | `JSON.parse` throws                       | Exit 1 with clear message — operator action needed                     |
| Fixture added to current but not in baseline   | Set difference                            | Ignored (not counted against gate)                                     |
| Fixture removed from current but in baseline   | Set difference                            | Ignored (assume intentional)                                           |
| Fixture renamed                                | Looks like add + remove                   | Both ignored — gate is silent on the rename                            |
| Same PR pushed multiple times                  | Marker-based comment                      | Edit existing comment, no spam                                         |

## Out of scope (follow-up)

- Drill-down per-criterion in the PR comment (which rubric criterion regressed)
- Score history visualisation (e.g. commit aggregated stats to a JSON file in main)
- Bump `repeat: 3 → 5` if 5-pt tolerance proves too tight
- Median-of-last-N baselines instead of single-last (more robust to baseline-run noise)

## Rollout

1. Implement on a feature branch (`feat/llm-eval-regression-gate`).
2. Open a PR — the gate will run against current main (which has no eval artifact yet from the new workflow shape, so it should hit edge case 1 and skip gracefully).
3. Merge to land a baseline.
4. Open a follow-up no-op PR touching an LLM path to verify the comment fires and pass logic works.
5. Open a regression PR (intentionally degrade prompt) to verify the fail path.

## Decisions captured

| Choice              | Value                                              |
| ------------------- | -------------------------------------------------- |
| Baseline storage    | GitHub Actions artifact (7d retention)             |
| Avg-score tolerance | 5 pts                                              |
| PR comment          | Always (pass + fail), sticky marker, edit-in-place |
| Variance smoothing  | `repeat: 3` (no change)                            |

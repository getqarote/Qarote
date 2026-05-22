#!/usr/bin/env tsx
/**
 * CLI wrapper for the LLM eval regression gate.
 *
 * Reads two promptfoo eval-result.json artifacts (baseline + current),
 * runs the pure comparison, posts/edits a sticky PR comment via `gh`,
 * and exits 0 on pass / 1 on rule violation.
 *
 * Env inputs (all consumed at startup, no defaults beyond what's noted):
 *   BASELINE_PATH      Path to the baseline eval-result.json. May not
 *                      exist — handled as "no baseline available" and
 *                      reported as a gate skip (still exit 0).
 *   CURRENT_PATH       Path to the current PR run's eval-result.json.
 *                      Required. Missing or unparseable → fatal exit 1.
 *   PR_NUMBER          GitHub PR number to comment on. If absent, the
 *                      comment body is written to stdout instead (handy
 *                      for local debugging).
 *   GITHUB_REPOSITORY  owner/repo. Required when PR_NUMBER is set —
 *                      `gh` won't auto-detect from CI context outside a
 *                      checkout step that ran `actions/checkout`.
 *   RUN_URL            Optional workflow-run URL embedded as comment
 *                      footer.
 *   AVG_SCORE_TOLERANCE Optional override of the rule-3 tolerance, as
 *                      a fraction of 1 (e.g. "0.05" = 5 pts). Default
 *                      is the plan's calibrated 0.05.
 *   MAX_REGRESSED_FIXTURES Optional override of the rule-1 tolerance — how
 *                      many PASS → FAIL fixture flips are allowed before
 *                      the gate fails. Integer ≥ 0. Default 0 (no
 *                      tolerance — any flip blocks). The workflow sets
 *                      this to 2 to absorb judge variance until
 *                      `repeat: 5` lands.
 *   PROTECTED_FIXTURES Optional comma-separated list of fixture ids that
 *                      must not drop more than PROTECTED_SCORE_DROP_TOLERANCE
 *                      vs baseline (rule 4 — bloat regression check).
 *                      The workflow populates this with the firehose-
 *                      evidence baseline-protection set.
 *   PROTECTED_SCORE_DROP_TOLERANCE Per-fixture score-drop ceiling for the
 *                      protected set, fraction in [0, 1]. Default 0.03.
 *
 * Plan: docs/plans/llm-eval-regression-gate.md
 */

import { execFileSync } from "node:child_process";
import { accessSync, constants as fsConstants, readFileSync } from "node:fs";

import {
  compareEvals,
  type EvalResultJson,
  extractFixtures,
} from "../../src/ee/services/llm/__evals__/gate/compare";
import {
  formatComment,
  GATE_COMMENT_MARKER,
} from "../../src/ee/services/llm/__evals__/gate/format-comment";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v == null || v === "" ? undefined : v;
}

function requireEnv(name: string): string {
  const v = env(name);
  if (!v) {
    console.error(`run-gate: required env ${name} is empty or missing`);
    process.exit(1);
  }
  return v;
}

/**
 * Defence-in-depth: even though we use execFileSync (no shell), validate
 * GitHub identifier inputs before they reach any subprocess. The values
 * we receive (GITHUB_REPOSITORY, github.event.pull_request.number) are
 * set by GitHub's runner and are trusted in practice, but a malformed
 * value (e.g. someone re-running this script locally with a typo, or a
 * future workflow change that mis-passes a string) should fail fast
 * with a clear error rather than ship garbage to `gh api`.
 *
 * - GITHUB_REPOSITORY: `owner/repo` where both segments use the same
 *   character class GitHub allows for usernames and repo names
 *   (alphanumeric + `-` + `_` + `.`).
 * - PR number: positive integer only.
 */
const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_PR_RE = /^[1-9][0-9]*$/;

function validateGitHubIdentifier(value: string, kind: "repo" | "pr"): string {
  const re = kind === "repo" ? GITHUB_REPO_RE : GITHUB_PR_RE;
  if (!re.test(value)) {
    console.error(
      `run-gate: refusing to call gh with ${kind}="${value}" — does not match ${re.source}`
    );
    process.exit(1);
  }
  return value;
}

/**
 * Read & parse a promptfoo eval-result.json. Throws on parse error so
 * the caller can distinguish "file missing" (baseline allowed) from
 * "file present but corrupt" (always fatal — operator action needed).
 */
function readEvalJson(path: string): EvalResultJson {
  const text = readFileSync(path, "utf8");
  return JSON.parse(text) as EvalResultJson;
}

/**
 * Existence check that ONLY swallows ENOENT. Permission errors (EACCES),
 * stale NFS handles, IO errors, etc. should not be silently treated as
 * "file is missing" — they need to surface so the CI step fails loudly
 * with an actionable message rather than degrading to the "no baseline"
 * branch under what would actually be an environmental problem.
 */
function fileExists(path: string): boolean {
  try {
    accessSync(path, fsConstants.F_OK);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Build the "no baseline available" comment shown when this PR is the
 * first to run after a baseline-clearing event (initial setup, expired
 * artifact, etc.) or when the baseline artifact was present but empty.
 * The gate is skipped — exit 0.
 *
 * `reason` lets us distinguish "no artifact" from "artifact present but
 * contained zero fixtures" — the latter happens when a main-branch run
 * uploaded an empty eval-result.json (e.g. the run executed during a
 * period of exhausted API credits and produced no graded results).
 * Without this distinction the gate silently degrades to "PASS 0/0" by
 * intersection semantics, which masks the real signal — and which is
 * exactly what we observed on PR #140.
 */
function noBaselineComment(
  runUrl: string | undefined,
  reason: "missing" | "empty" = "missing"
): string {
  const explanation =
    reason === "empty"
      ? "The baseline artifact from `main` was downloaded but contains zero graded fixtures. This usually means the main-branch run that produced it failed mid-eval (e.g. API credits exhausted at the time) and uploaded an empty result. Re-run the LLM eval workflow on `main` once the underlying issue is fixed — the next PR will then have a real baseline."
      : "No baseline artifact found from `main`. The gate compares each PR run against the latest successful main-branch eval, but none is available right now (first run since the gate landed, baseline retention expired, or main hasn't merged an LLM-paths change recently).";
  const lines = [
    GATE_COMMENT_MARKER,
    "",
    "## LLM Eval Gate · ⏭️ skipped",
    "",
    explanation,
    "",
    "The current run still executes and uploads its artifact, so the next PR will have a baseline to compare against.",
    "",
  ];
  if (runUrl) {
    lines.push(`<sub>[View workflow run](${runUrl})</sub>`);
  }
  return lines.join("\n");
}

/**
 * Find the sticky comment id (number) on this PR, or null. We list the
 * first page of issue comments and filter by marker — typical PRs
 * never reach the 100-comment threshold where pagination would matter,
 * and even if they did the worst-case is "create a duplicate" which
 * the next push corrects.
 *
 * Uses execFileSync (no shell) so `repo` and `pr` cannot escape into
 * arbitrary command execution — they are passed as a single argv token
 * to `gh`. validateGitHubIdentifier runs upfront for clear errors and
 * as a second layer of defence.
 */
function findStickyCommentId(repo: string, pr: string): number | null {
  const json = execFileSync(
    "gh",
    ["api", `repos/${repo}/issues/${pr}/comments?per_page=100`],
    { encoding: "utf8" }
  );
  const comments = JSON.parse(json) as Array<{ id: number; body: string }>;
  const hit = comments.find((c) => c.body.startsWith(GATE_COMMENT_MARKER));
  return hit ? hit.id : null;
}

function upsertComment(repo: string, pr: string, body: string): void {
  const existing = findStickyCommentId(repo, pr);
  // Pass the body via stdin to avoid shell-escaping pitfalls on long
  // markdown with backticks, quotes, and pipe characters. execFileSync
  // also bypasses the shell entirely for the repo/pr/comment-id args.
  if (existing) {
    execFileSync(
      "gh",
      [
        "api",
        `repos/${repo}/issues/comments/${existing}`,
        "-X",
        "PATCH",
        "--input",
        "-",
      ],
      { input: JSON.stringify({ body }), encoding: "utf8" }
    );
    console.log(`run-gate: edited existing comment ${existing}`);
  } else {
    execFileSync(
      "gh",
      ["api", `repos/${repo}/issues/${pr}/comments`, "--input", "-"],
      { input: JSON.stringify({ body }), encoding: "utf8" }
    );
    console.log("run-gate: posted new comment");
  }
}

function main(): void {
  const baselinePath = env("BASELINE_PATH");
  const currentPath = requireEnv("CURRENT_PATH");
  const prNumberRaw = env("PR_NUMBER");
  const repoRaw = env("GITHUB_REPOSITORY");
  const runUrl = env("RUN_URL");

  // Both must be present (and valid) to comment — otherwise we treat the
  // run as local and dump to stdout. Validating upfront keeps the rest
  // of the script free of revalidation noise.
  const prNumber = prNumberRaw
    ? validateGitHubIdentifier(prNumberRaw, "pr")
    : undefined;
  const repo = repoRaw ? validateGitHubIdentifier(repoRaw, "repo") : undefined;
  const toleranceRaw = env("AVG_SCORE_TOLERANCE");
  const tolerance = toleranceRaw ? Number(toleranceRaw) : undefined;
  // Tolerance is a fraction of a score in [0, 1]. Reject Infinity (which
  // would silently disable rule 3), NaN, negatives, and values > 1 (which
  // make no sense — an "avg score dropped by more than 100 pts" rule
  // never fires).
  if (
    toleranceRaw &&
    (tolerance == null ||
      !Number.isFinite(tolerance) ||
      tolerance < 0 ||
      tolerance > 1)
  ) {
    console.error(
      `run-gate: AVG_SCORE_TOLERANCE="${toleranceRaw}" is not a finite number in [0, 1]`
    );
    process.exit(1);
  }

  const maxRegressionsRaw = env("MAX_REGRESSED_FIXTURES");
  const maxRegressions = maxRegressionsRaw
    ? Number(maxRegressionsRaw)
    : undefined;
  // Non-negative integer. Reject NaN, negatives, fractional values.
  if (
    maxRegressionsRaw &&
    (maxRegressions == null ||
      !Number.isInteger(maxRegressions) ||
      maxRegressions < 0)
  ) {
    console.error(
      `run-gate: MAX_REGRESSED_FIXTURES="${maxRegressionsRaw}" is not a non-negative integer`
    );
    process.exit(1);
  }

  const protectedDropRaw = env("PROTECTED_SCORE_DROP_TOLERANCE");
  const protectedDrop = protectedDropRaw ? Number(protectedDropRaw) : undefined;
  if (
    protectedDropRaw &&
    (protectedDrop == null ||
      !Number.isFinite(protectedDrop) ||
      protectedDrop < 0 ||
      protectedDrop > 1)
  ) {
    console.error(
      `run-gate: PROTECTED_SCORE_DROP_TOLERANCE="${protectedDropRaw}" is not a finite number in [0, 1]`
    );
    process.exit(1);
  }

  // Comma-separated list of fixture ids that participate in rule 4.
  // Empty / unset → rule 4 never fires. The workflow populates this with
  // the baseline-protection set (the 5 queue-depth-high* fixtures that
  // do NOT receive firehose data, so their rendered prompt is byte-
  // identical to main — a score drop there means STRICT-rules bloat
  // eroded attention globally).
  const protectedRaw = env("PROTECTED_FIXTURES");
  const protectedFixtures = protectedRaw
    ? protectedRaw
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    : undefined;

  if (!fileExists(currentPath)) {
    console.error(`run-gate: CURRENT_PATH "${currentPath}" does not exist`);
    process.exit(1);
  }
  const current = readEvalJson(currentPath);

  // No baseline → skip the gate, post an informational comment, exit 0.
  if (!baselinePath || !fileExists(baselinePath)) {
    const body = noBaselineComment(runUrl);
    if (prNumber && repo) {
      upsertComment(repo, prNumber, body);
    } else {
      console.log(body);
    }
    console.log("run-gate: no baseline — gate skipped");
    process.exit(0);
  }

  const baseline = readEvalJson(baselinePath);
  const baselineFixtures = extractFixtures(baseline);

  // Empty baseline → treat the same as a missing one. Comparing an empty
  // FixtureMap against the current run produces a misleading "PASS 0/0"
  // via the intersection semantics in compareEvals — the gate appears to
  // pass but in fact compared nothing. This shape happens when the
  // main-branch run that produced the baseline ran without API credits
  // (or any other condition that yields zero graded results) and still
  // uploaded the resulting empty eval-result.json as an artifact.
  if (Object.keys(baselineFixtures).length === 0) {
    const body = noBaselineComment(runUrl, "empty");
    if (prNumber && repo) {
      upsertComment(repo, prNumber, body);
    } else {
      console.log(body);
    }
    console.log(
      "run-gate: baseline present but empty (0 fixtures) — gate skipped"
    );
    process.exit(0);
  }

  const result = compareEvals(baselineFixtures, extractFixtures(current), {
    ...(tolerance != null ? { avgScoreTolerance: tolerance } : {}),
    ...(maxRegressions != null ? { maxRegressedFixtures: maxRegressions } : {}),
    ...(protectedDrop != null
      ? { protectedScoreDropTolerance: protectedDrop }
      : {}),
    ...(protectedFixtures != null ? { protectedFixtures } : {}),
  });

  const body = formatComment({ result, runUrl });

  if (prNumber && repo) {
    upsertComment(repo, prNumber, body);
  } else {
    console.log(body);
  }

  console.log(
    `run-gate: ${result.passed ? "PASS" : "FAIL"} — pass ${result.current.passCount}/${result.current.total} (baseline ${result.baseline.passCount}/${result.baseline.total}), avg ${(result.current.avgScore * 100).toFixed(1)}% (baseline ${(result.baseline.avgScore * 100).toFixed(1)}%)`
  );
  if (!result.passed) {
    for (const v of result.ruleViolations) {
      console.log(`run-gate:   - ${v.rule}: ${v.detail}`);
    }
  }

  process.exit(result.passed ? 0 : 1);
}

main();

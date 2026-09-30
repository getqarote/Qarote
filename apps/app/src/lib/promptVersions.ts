/**
 * Prompt versions the LLM context builders in this build currently emit.
 * An explanation generated under any other version is shown as "drifted".
 *
 * The context builders live under apps/api/src/ee/, which the Community
 * Edition mirror strips. A static import of them makes `vite build` fail on
 * the CE tree ("Could not load ../api/src/ee/...") and with it the
 * apps/app Docker image. An eager glob resolves to the module when the file
 * is present and to an empty object when it is not, so the same source builds
 * in both editions. The paths are relative rather than `@api/...` so vitest,
 * which does not define that alias, resolves them the same way vite does.
 */

const findingVersions = import.meta.glob<string>(
  "../../../api/src/ee/services/llm/context-builders/finding.context.ts",
  { eager: true, import: "FINDING_PROMPT_VERSION" }
);

const configFindingVersions = import.meta.glob<string>(
  "../../../api/src/ee/services/llm/context-builders/config-finding.context.ts",
  { eager: true, import: "CONFIG_FINDING_PROMPT_VERSION" }
);

export function collectPromptVersions(
  ...globs: Record<string, unknown>[]
): ReadonlySet<string> {
  const versions = new Set<string>();
  for (const glob of globs) {
    for (const value of Object.values(glob)) {
      if (typeof value === "string") versions.add(value);
    }
  }
  return versions;
}

export const CURRENT_PROMPT_VERSIONS = collectPromptVersions(
  findingVersions,
  configFindingVersions
);

/**
 * True when an explanation was generated under a prompt version this build no
 * longer emits. A build without the context builders (CE) has nothing to
 * compare against, so it never reports drift.
 */
export function hasPromptVersionDrift(
  promptVersion: string,
  current: ReadonlySet<string> = CURRENT_PROMPT_VERSIONS
): boolean {
  return current.size > 0 && !current.has(promptVersion);
}

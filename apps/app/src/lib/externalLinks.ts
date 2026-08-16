/**
 * Centralized external (off-app) URLs.
 *
 * Keeping these in one place means the Help page (and any future surface that
 * links out to docs, status, the changelog, Discord, or support email) shares a
 * single source of truth instead of inlining anchors. DRY — these URLs are
 * referenced from more than one place and must stay in sync.
 */

export const EXTERNAL_LINKS = {
  docs: "https://docs.qarote.io",
  mcpGuide: "https://docs.qarote.io/mcp",
  changelog: "https://qarote.io/changelog",
  status: "https://status.qarote.io",
  discordInvite: "https://discord.gg/GwHRbGwyUG",
  supportEmail: "support@qarote.io",
} as const;

/**
 * The four orientation links rendered in the Help page link grid. Each entry
 * pairs a stable id (used as the i18n key under `help.links.<id>`) with its
 * external URL. Order here is the render order.
 */
export const HELP_LINKS = [
  { id: "docs", href: EXTERNAL_LINKS.docs },
  { id: "mcp", href: EXTERNAL_LINKS.mcpGuide },
  { id: "changelog", href: EXTERNAL_LINKS.changelog },
  { id: "status", href: EXTERNAL_LINKS.status },
] as const;

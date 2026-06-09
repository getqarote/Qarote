/**
 * Platform-aware label for the command-palette shortcut: ⌘K on macOS,
 * Ctrl+K elsewhere. Falls back to Ctrl+K when the platform can't be
 * detected (SSR / no navigator).
 */
export function commandKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl+K";
  const isMac =
    navigator.platform?.includes("Mac") ||
    navigator.userAgent.includes("Macintosh");
  return isMac ? "⌘K" : "Ctrl+K";
}

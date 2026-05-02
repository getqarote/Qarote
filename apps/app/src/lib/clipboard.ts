/**
 * Copy text to the clipboard.
 *
 * Tries the modern Clipboard API first, falls back to the deprecated
 * `document.execCommand("copy")` path on a temporary textarea. The
 * fallback is the only thing that works on:
 *
 *   - http:// origins (self-hosted Qarote deployments on intranets
 *     where TLS isn't terminated at the app), where
 *     `navigator.clipboard` is undefined per spec.
 *   - Permissions-Policy contexts that allow execCommand but block
 *     the async clipboard.
 *
 * Returns true on success, false if both paths fail. Callers MUST
 * call this from a user-gesture handler (click, keypress) — async
 * gaps before invocation void the document's "transient activation"
 * and execCommand silently returns false.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }
  return copyViaExecCommand(text);
}

/**
 * Whether the runtime can copy at all — modern API or legacy
 * fallback. Use this to decide whether to render a copy button vs.
 * hide it entirely.
 */
export function isClipboardAvailable(): boolean {
  if (typeof document === "undefined") return false;
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return true;
  }
  // execCommand("copy") still works on every shipping browser; only
  // SSR / non-browser hosts lack it.
  return typeof document.execCommand === "function";
}

function copyViaExecCommand(text: string): boolean {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Off-screen but kept inside the layout flow so the focus + select
  // call below still works. `position: fixed` with negative
  // coordinates is the standard recipe.
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

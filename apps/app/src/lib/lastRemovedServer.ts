/**
 * One-shot handoff between the server-delete flow and the first-run cockpit.
 *
 * When the *last* broker in a workspace is removed, the delete flow records its
 * name here; the first-run cockpit consumes it once to acknowledge the removal
 * ("{name} was removed") instead of greeting a fresh workspace. Kept in
 * sessionStorage so it survives the re-render/route settle but never leaks
 * across browser sessions, and TTL-bounded so a stale record can't relabel a
 * genuine first-run much later.
 */

const STORAGE_KEY = "qarote:lastRemovedServer";
const TTL_MS = 60_000;

/** Record the just-removed broker name for the first-run cockpit to pick up. */
export function recordLastRemovedServer(name: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ name, ts: Date.now() })
  );
}

/**
 * Read and clear the recorded name. Returns it only when a record exists and is
 * recent (< TTL); a missing, malformed, or expired record yields null. Always
 * clears the slot so the acknowledgement shows exactly once.
 */
export function consumeLastRemovedServer(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    const { name, ts } = JSON.parse(raw) as { name: string; ts: number };
    if (typeof name === "string" && Date.now() - ts < TTL_MS) {
      return name;
    }
  } catch {
    // malformed record — fall through to null (first-run wording)
  }
  return null;
}

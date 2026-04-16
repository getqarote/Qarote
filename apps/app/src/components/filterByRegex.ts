/**
 * Filters a list of items by matching a field against a regex
 * pattern. Falls back to case-insensitive substring matching when
 * the pattern isn't a valid regex — so an operator typing "/" or
 * "(abc" doesn't see an empty list while mid-pattern.
 *
 * Lives in its own `.ts` file so `RegexFilterInput.tsx` can follow
 * the react-refresh "only export components" rule — a mixed-export
 * file prevents hot module replacement from preserving state.
 */
export function filterByRegex<T>(
  items: T[],
  pattern: string,
  getField: (item: T) => string
): T[] {
  if (!pattern) return items;
  try {
    const regex = new RegExp(pattern, "i");
    return items.filter((item) => regex.test(getField(item)));
  } catch {
    const lowerPattern = pattern.toLowerCase();
    return items.filter((item) =>
      getField(item).toLowerCase().includes(lowerPattern)
    );
  }
}

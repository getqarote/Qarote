/**
 * Formats a comma-separated string of tags into individual badge components
 * @param tags - Comma-separated string of tags
 * @returns Array of tag strings for rendering
 */
export function formatTags(tags: string | null | undefined): string[] {
  if (!tags || tags.trim() === "") {
    return [];
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Formats tags for display with separators
 * @param tags - Comma-separated string of tags or array of tags
 * @returns Formatted string with proper separators
 */
export function formatTagsDisplay(
  tags: string | string[] | null | undefined
): string {
  if (!tags) return "-";

  const tagArray = Array.isArray(tags) ? tags : formatTags(tags);

  if (tagArray.length === 0) return "-";

  return tagArray.join(" • ");
}

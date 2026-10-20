/**
 * "Food & Drinks " -> "food-drinks". Keeps non-Latin letters and their vowel signs (\p{M}), so
 * Hindi categories get readable ids.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

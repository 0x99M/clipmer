/**
 * Heading ids are derived from heading text at render time, and table-of-contents
 * entries in lib/posts.ts are written to match. Both sides go through this one
 * function so a TOC link can never drift from the heading it points at.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’'']/g, "") // don't turn "what's" into "what-s"
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

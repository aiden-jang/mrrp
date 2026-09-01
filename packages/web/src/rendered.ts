/*
 * Rendered markup as the words a person would read, for tests that assert on copy. Strip the real
 * curly quotes, not just the entities: React writes them as characters, and an assertion with a quote
 * in it fails while looking correct.
 */
export const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x201C;|&#x201D;|&quot;/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

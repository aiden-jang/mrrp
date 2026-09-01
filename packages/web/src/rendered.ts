/*
 * Rendered markup as the words a person would read, for tests that assert on copy.
 *
 * Three tests grew their own version of this and two of them missed that React writes real curly
 * quotes into the output rather than entities, so an assertion containing a quote passed on the
 * strip and failed on the character.
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

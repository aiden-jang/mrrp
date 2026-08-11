/**
 * Turn a displayed cat name into the letters the canvas can hear.
 *
 * Spaces and punctuation should not make names like "Miss Bean" or "Miso-Jr" impossible to call,
 * and accents are folded so the interaction still works on an ordinary keyboard. One-letter names
 * are ignored: triggering a six-second scene every time somebody presses a common key is no secret.
 */
export function catCallCode(name: string): string | null {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return code.length >= 2 ? code : null;
}

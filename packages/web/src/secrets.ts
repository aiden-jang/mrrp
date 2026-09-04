import { PIANO_CODE } from "./piano.js";

export function catCallCode(name: string): string | null {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return code.length >= 2 ? code : null;
}

/*
 * Things you can type at the room, in the order they are tried. Order is why this is a list and not
 * an object: one code ending in another would otherwise fire whichever the runtime happened to
 * reach first.
 */
const TYPED: readonly (readonly [string, string])[] = [
  ["mrrp", "mrrp"],
  ["summon", "pspsps"],
  ["box", "box"],
  ["yarn", "yarn"],
  ["treat", "treat"],
  ["catnip", "catnip"],
  ["music", "music"],
  ["mouse", "mouse"],
  ["bubbles", "bubbles"],
  ["piano", PIANO_CODE],
  ["stars", "stars"],
];

export type TypedSecret = "herName" | (typeof TYPED)[number][0];

const LONGEST = Math.max(...TYPED.map(([, code]) => code.length));

/*
 * One letter into the rolling buffer, and whichever secret that finished.
 *
 * A code is recognised by what you have just typed rather than by starting clean, so "boxbox" sets
 * the box off twice and mistyping in front of a code does not stop it landing. Trimming to the
 * longest code cannot change that; it is only what stops the buffer growing for as long as the page
 * is open.
 *
 * Her name wins over the fixed codes: he chose it, and a cat named Box should answer to Box.
 */
export function typeLetter(
  buffer: string,
  letter: string,
  nameCode: string | null,
): { buffer: string; fired: TypedSecret | null } {
  const next = `${buffer}${letter.toLowerCase()}`.slice(-Math.max(LONGEST, nameCode?.length ?? 0));
  if (nameCode && next.endsWith(nameCode)) return { buffer: "", fired: "herName" };
  const hit = TYPED.find(([, code]) => next.endsWith(code));
  return hit ? { buffer: "", fired: hit[0] } : { buffer: next, fired: null };
}

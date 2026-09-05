/*
 * A ceiling on comments, run by `pnpm run verify`, because a cleanup pass is a moment and drift is
 * permanent. Two passes over this repo cut the comments back; nothing stopped them growing again.
 *
 * A share of the code rather than a line count. A count charges a new module for its own header, so
 * it blocks a genuine explanation exactly as hard as it blocks padding.
 *
 * The gates get their own, higher share. They are small files where one header is a fifth of the
 * file, and holding them to the same number would mean explaining less about the things that decide
 * whether a build passes.
 */
import { globSync, readFileSync } from "node:fs";

const SRC_CEILING = 0.07;
const SCRIPTS_CEILING = 0.25;
/* Long enough that two files saying `// eslint-disable-next-line` are not called duplication. */
const DUP_MIN_CHARS = 45;

/*
 * Repeated on purpose. Everything else that appears twice is a comment that was copied along with
 * the code under it, and stopped describing one of the two the moment either changed.
 *
 * The wire contract is kept by hand in both packages, so its notes are duplicated with it. The
 * storage note sits on the same three-line idiom in four places, and a reader in one of them should
 * not have to find another file to learn why the failure is swallowed.
 */
const REPEATED_ON_PURPOSE = [
  (where) => where.every((w) => w.endsWith("/types.ts:" + w.split(":").pop())),
  (_, text) => text.startsWith("// Private mode."),
];

/** Comment spans in one file, with string literals blanked first. */
function comments(source, isCss) {
  /*
   * A path or glob holding `/*` would otherwise open a block comment that swallows the code after
   * it, and the count comes out high for a reason nobody can see. Masking is cheaper than parsing.
   */
  const masked = source.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, (m) =>
    " ".repeat(m.length),
  );
  const re = isCss ? /\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  return [...masked.matchAll(re)].map((m) => ({
    text: source.slice(m.index, m.index + m[0].length),
    lines: m[0].split("\n").length,
    at: source.slice(0, m.index).split("\n").length,
  }));
}

const src = globSync("packages/*/src/**/*.{ts,tsx,css}").filter((f) => !/\.(test|spec)\.tsx?$/.test(f));
// The gates' own source counts. A check that does not cover itself stops being checked.
const own = globSync("scripts/*.mjs");

const seen = new Map();
const stranded = [];
const tally = { src: [0, 0], scripts: [0, 0] };

for (const file of [...src, ...own]) {
  const source = readFileSync(file, "utf8");
  const bucket = own.includes(file) ? "scripts" : "src";
  tally[bucket][0] += source.split("\n").filter((l) => l.trim() !== "").length;

  for (const c of comments(source, file.endsWith(".css"))) {
    tally[bucket][1] += c.lines;
    const flat = c.text.replace(/\s+/g, " ").trim();
    // Directives are meant to repeat: two files suppressing the same rule is not duplication.
    if (flat.length < DUP_MIN_CHARS || /eslint-|@ts-|prettier-/.test(flat)) continue;
    seen.set(flat, [...(seen.get(flat) ?? []), `${file}:${c.at}`]);
  }

  /*
   * A comment, then a blank line, then a declaration. Prose that opens or closes a file is fine; a
   * paragraph floating above an export is a comment whose subject moved without it.
   */
  const lines = source.split("\n");
  let afterDeclaration = false;
  for (let i = 1; i < lines.length - 2; i++) {
    if (/^\}\)?;?$/.test(lines[i])) afterDeclaration = true;
    /*
     * A doc block with nothing under it but a closing brace. `/**` exists to describe the next
     * declaration, so one describing a brace documents a prop or a field that has been removed.
     * Ungated: the first interface in a file is where this happens.
     */
    if (/\*\/\s*$/.test(lines[i])) {
      let open = i;
      while (open >= 0 && !lines[open].includes("/*")) open--;
      const under = lines.slice(i + 1).find((l) => l.trim()) ?? "";
      if (open >= 0 && lines[open].includes("/**") && /^[)}\]]/.test(under.trim())) {
        const quoted = (open === i ? lines[open] : lines[open + 1]) ?? "";
        stranded.push(
          `${file}:${open + 1} — a doc block with nothing under it: "${quoted.trim().slice(0, 56)}…"`,
        );
      }
    }
    if (!afterDeclaration) continue;
    const isComment = /^\s*(\/\/|\*\/)/.test(lines[i]);
    const gap = lines[i + 1]?.trim() === "";
    const next = lines.slice(i + 2, i + 4).find((l) => l.trim()) ?? "";
    if (isComment && gap && /^(export |const |function )/.test(next.trim())) {
      stranded.push(
        `${file}:${i + 1} — "${lines[i].trim().slice(0, 56)}…" then a gap, then ${next.trim().slice(0, 36)}`,
      );
    }
  }
}

const problems = [];
for (const [bucket, ceiling] of [
  ["src", SRC_CEILING],
  ["scripts", SCRIPTS_CEILING],
]) {
  const [total, count] = tally[bucket];
  const allowed = Math.floor(total * ceiling);
  if (count > allowed) {
    problems.push(
      `${bucket} is ${((count / total) * 100).toFixed(2)}% comments, over the ${(ceiling * 100).toFixed(0)}% ceiling ` +
        `(${count} lines, ${allowed} allowed at ${total} lines).`,
    );
  }
}
for (const [text, where] of seen) {
  if (where.length < 2) continue;
  if (REPEATED_ON_PURPOSE.some((allowed) => allowed(where, text))) continue;
  problems.push(`the same comment in ${where.length} places: ${where.join(", ")} — "${text.slice(0, 56)}…"`);
}
problems.push(...stranded.map((s) => `stranded: ${s}`));

if (problems.length > 0) {
  console.error("comment check failed:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

const pct = (b) => ((tally[b][1] / tally[b][0]) * 100).toFixed(2);
console.log(`comments ok: src ${pct("src")}%, scripts ${pct("scripts")}%, no duplicates, none stranded`);

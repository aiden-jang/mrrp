/*
 * Ceilings on file length and component state, run by `pnpm run verify`.
 *
 * Nothing else here notices a file growing, and a god-file is never added. It accretes twenty lines
 * at a time and no single diff looks wrong, which is how one component came to hold fifty-five
 * pieces of state and how the file next to it passed three thousand lines.
 *
 * 400 is not arbitrary: three files in four are under 153 lines, so the ceiling sits well above the
 * shape of this codebase rather than cutting through the middle of it. Lines are the proxy; the
 * state count is the signal. Splitting the file is almost always the right answer to a failure.
 */
import { globSync, readFileSync } from "node:fs";

const MAX_LINES = 400;
const MAX_STATE = 12;

/*
 * Already over, and being decomposed. Listed at their size on the day the gate went in rather than
 * the ceiling being raised for everyone, so nothing else can grow past 400 meanwhile.
 *
 * An entry that sits above its file is a failure too, so shrinking one is not something anybody has
 * to remember. Left to drift, the headroom a decomposition just won is silently available to grow
 * back into, which is how the file got here.
 */
const ALREADY_OVER = {
  "packages/web/src/Cat.tsx": { lines: 3104 },
  "packages/web/src/App.tsx": { lines: 2541, state: 33 },
  "packages/worker/src/room.ts": { lines: 1466 },
  "packages/web/src/sprites.ts": { lines: 705 },
  "packages/worker/src/index.ts": { lines: 518 },
};

// The gate scripts are in here too. A check that does not cover its own source stops being checked.
const files = [
  ...globSync("packages/*/src/**/*.{ts,tsx}"),
  ...globSync("{scripts,packages/*/scripts}/*.mjs"),
].filter((f) => !/\.(test|spec)\.tsx?$/.test(f));
const problems = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  // Counted the way `wc -l` counts, so the number here is the number a person reads off the file.
  const lines = source.split("\n").length - (source.endsWith("\n") ? 1 : 0);
  // useState in a component, not every hook: a count of these is how much one file is keeping
  // track of at once.
  const state = (source.match(/\buseState[(<]/g) ?? []).length;
  const allowed = ALREADY_OVER[file] ?? {};
  const lineCap = allowed.lines ?? MAX_LINES;
  const stateCap = allowed.state ?? MAX_STATE;

  if (lines > lineCap) problems.push(`${file} is ${lines} lines, over ${lineCap}`);
  if (state > stateCap) problems.push(`${file} holds ${state} pieces of state, over ${stateCap}`);

  if (!ALREADY_OVER[file]) continue;
  if (lines <= MAX_LINES && state <= MAX_STATE) {
    problems.push(`${file} is under the ceiling now: drop it from ALREADY_OVER`);
  } else {
    if (allowed.lines !== undefined && lines < allowed.lines) {
      problems.push(`${file} is down to ${lines} lines: lower its ALREADY_OVER entry from ${allowed.lines}`);
    }
    if (allowed.state !== undefined && state < allowed.state) {
      problems.push(`${file} is down to ${state} state: lower its ALREADY_OVER entry from ${allowed.state}`);
    }
  }
}

for (const file of Object.keys(ALREADY_OVER)) {
  if (!files.includes(file)) problems.push(`${file} is listed as being decomposed but does not exist`);
}

if (problems.length > 0) {
  console.error("size check failed:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

const decomposing = Object.keys(ALREADY_OVER).length;
console.log(
  `size ok: ceiling ${MAX_LINES} lines / ${MAX_STATE} state` +
    (decomposing > 0 ? `, with ${decomposing} file(s) still being decomposed` : ""),
);

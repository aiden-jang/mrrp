// Source budgets ratchet down after extraction; gates include their own source.
import { globSync, readFileSync } from "node:fs";

const MAX_LINES = 400;
const MAX_STATE = 12;

/*
 * Existing large modules have explicit budgets. Cat.tsx and room.ts keep their intentional shared
 * mechanisms; independent helpers may still be extracted without raising anyone's ceiling.
 *
 * An entry that sits above its file is a failure too, so shrinking one is not something anybody has
 * to remember. Left to drift, the headroom a decomposition just won is silently available to grow
 * back into, which is how the file got here.
 */
const ALREADY_OVER = {
  "packages/web/src/Cat.tsx": { lines: 3104 },
  "packages/worker/src/room.ts": { lines: 1453 },
  "packages/web/src/sprites.ts": { lines: 619 },
  "packages/worker/src/index.ts": { lines: 511 },
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
  if (!files.includes(file)) problems.push(`${file} has an explicit budget but does not exist`);
}

if (problems.length > 0) {
  console.error("size check failed:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

const budgeted = Object.keys(ALREADY_OVER).length;
console.log(
  `size ok: ceiling ${MAX_LINES} lines / ${MAX_STATE} state` +
    (budgeted > 0 ? `, with ${budgeted} file(s) with explicit budgets` : ""),
);

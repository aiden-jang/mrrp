/*
 * Mechanical checks on the docs, run by `pnpm run verify`. Only claims a machine can settle: paths,
 * script names, routes and symbols. Whether the prose is any good is a reading job.
 *
 * Prose rots with nothing to fail it. Nothing else in this repo reads the docs, so a symbol renamed
 * in the code leaves a sentence behind that still parses and is simply untrue.
 */
import { globSync, readFileSync } from "node:fs";

// CLAUDE.md and AGENTS.md are symlinks to CONVENTIONS.md; listing them would report twice.
const DOCS = [
  ...globSync("*.md").filter((file) => !["AGENTS.md", "CLAUDE.md"].includes(file)),
  ...globSync("docs/**/*.md").filter((file) => !file.startsWith("docs/history/")),
  ...globSync(".github/**/*.md"),
];

/* Named in the docs because they are absent, or because they belong to somebody else's API.
   Never add a name the code actually lost. */
const NOT_OURS = new Set([
  "createRoot",
  "devicePixelRatio",
  "prefersReducedMotion",
  "toDataURL",
  "workers.dev",
]);

const code = [
  ...globSync("packages/*/src/**/*.{ts,tsx,css}"),
  ...globSync("packages/*/test/**/*.ts"),
  ...globSync("packages/*/e2e/**/*.{ts,mjs}"),
  ...globSync("packages/*/scripts/*.mjs"),
  // Not this file: naming a symbol here to explain a check would make that symbol resolve.
  ...globSync("scripts/*.mjs").filter((f) => !f.endsWith("check-docs.mjs")),
  ...globSync("packages/*/*.{toml,json,html}"),
  ...globSync(".github/workflows/*.yml"),
  "package.json",
]
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const scripts = new Set(
  [...globSync("packages/*/package.json"), "package.json"].flatMap((f) =>
    Object.keys(JSON.parse(readFileSync(f, "utf8")).scripts ?? {}),
  ),
);

const files = new Set(
  globSync("{packages,scripts,docs,.github}/**/*", { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => `${d.parentPath}/${d.name}`),
);

const problems = [];
const known = (name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(code);

for (const doc of DOCS) {
  // Per document: a stray fence in one must not change how the next one is read.
  let fenced = false;
  readFileSync(doc, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const at = `${doc}:${i + 1}`;
      if (line.trimStart().startsWith("```")) fenced = !fenced;

      for (const m of line.matchAll(/[\w./@-]*\w+\.(?:ts|tsx|css|mjs|toml|yml|html)\b/g)) {
        const bare = m[0].replace(/^`|`$/g, "");
        const tail = bare.split("/").pop();
        if (![...files].some((f) => f.endsWith(bare) || f.endsWith(`/${tail}`))) {
          problems.push(`${at}: no such file \`${bare}\``);
        }
      }

      /* Only inside backticks or a fence: English prose says things like "a pnpm command of the
         same name", and that is not an invocation. */
      /* Inside a fence a `#` starts a shell comment: "corepack enable  # makes pnpm available" is
         English about pnpm, not an invocation of a script called `available`. */
      const commands = fenced
        ? [line.replace(/#.*$/, "")]
        : [...line.matchAll(/`([^`]+)`/g)].map((b) => b[1]);
      for (const m of commands.join("\n").matchAll(/pnpm (?:run |-r |--filter \S+ )?([a-z][\w:-]*)/g)) {
        const name = m[1];
        if (["install", "exec", "audit", "why", "dlx", "add", "create", "run"].includes(name)) continue;
        if (!scripts.has(name)) problems.push(`${at}: \`pnpm ${name}\` is not a script`);
      }

      // Anchored per prefix, or `/api/room` would also swallow `/api/rooms`.
      for (const m of line.matchAll(/(\/api\/[\w:/-]+|\/r\/:?\w+)\b/g)) {
        const full = m[1].replace(/\/$/, "");
        if (!code.includes(full)) problems.push(`${at}: no route \`${full}\``);
      }

      // Bare, not just `name()`: a rename can sit in a diagram with no parentheses and no backticks.
      // camelCase in English prose is almost always a symbol.
      for (const m of line.matchAll(/(?<!\\)\b([a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+)\b/g)) {
        const name = m[1];
        if (!NOT_OURS.has(name) && !known(name)) {
          problems.push(`${at}: nothing named \`${name}\` in the code`);
        }
      }
    });
}

if (problems.length > 0) {
  console.error("docs check failed:\n");
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log(`docs ok: paths, scripts, routes and names in ${DOCS.length} files all resolve`);

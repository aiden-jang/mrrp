// Check that verification and CI run the same real scripts with unambiguous command names.
import { readFileSync } from "node:fs";

/* pnpm's own commands. One of these is only a problem when a script shares its name, because then
   the command wins and the script cannot be reached. */
const PNPM_OWN = new Set([
  "add",
  "audit",
  "bin",
  "config",
  "create",
  "deploy",
  "dlx",
  "docs",
  "env",
  "exec",
  "fetch",
  "import",
  "init",
  "install",
  "licenses",
  "link",
  "list",
  "outdated",
  "pack",
  "patch",
  "publish",
  "rebuild",
  "remove",
  "root",
  "run",
  "server",
  "setup",
  "store",
  "unlink",
  "update",
  "why",
]);

const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts ?? {};
const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const problems = [];

/** Every `pnpm …` call in one command string, as {raw, name, bare}. */
function invocations(command) {
  const out = [];
  for (const m of command.matchAll(/pnpm\s+([^&|;]+)/g)) {
    const words = m[1].trim().split(/\s+/);
    let i = 0;
    while (i < words.length) {
      const w = words[i];
      // `--filter` takes its value as the next word; every other flag carries its own.
      if (w === "--filter") i += 2;
      else if (w.startsWith("-")) i += 1;
      else break;
    }
    const first = words[i];
    if (first === undefined) continue;
    out.push({ raw: m[0].trim(), name: first === "run" ? words[i + 1] : first, bare: first !== "run" });
  }
  return out;
}

function check(where, command, known) {
  for (const { raw, name, bare } of invocations(command)) {
    if (name === undefined) continue;
    const shadowed = PNPM_OWN.has(name);
    const isScript = known.has(name);
    if (bare && shadowed && isScript) {
      problems.push(
        `${where}: \`${raw}\` runs pnpm's own ${name}, not the script. Use \`pnpm run ${name}\`.`,
      );
    } else if (!isScript && !(bare && shadowed)) {
      problems.push(`${where}: \`${raw}\` names no script`);
    }
  }
}

const rootScripts = new Set(Object.keys(scripts));
for (const chain of ["verify", "verify:core", "check"].filter((c) => scripts[c])) {
  check(`package.json ${chain}`, scripts[chain], rootScripts);
}

const workerScripts = new Set(
  Object.keys(JSON.parse(readFileSync("packages/worker/package.json", "utf8")).scripts ?? {}),
);
for (const m of ci.matchAll(/run:\s*(pnpm[^\n]*)/g)) {
  // The deploy job runs inside packages/worker, where a different set of scripts applies.
  const before = ci.slice(0, m.index);
  const inWorker =
    before.lastIndexOf("working-directory: packages/worker") > before.lastIndexOf("- run: pnpm install");
  check("ci.yml", m[1], inWorker ? workerScripts : rootScripts);
}

/*
 * CI and local verification invoke the same core and browser commands in the same order.
 */
const checkJob = ci.split(/^  deploy:/m)[0] ?? "";
const ciOrder = [...new Set([...checkJob.matchAll(/run:\s*pnpm run ([\w:-]+)/g)].map((m) => m[1]))];
const verifyOrder = invocations(scripts.verify ?? "").map((i) => i.name);
const inVerify = new Set(verifyOrder);
for (const name of ciOrder) {
  if (!inVerify.has(name)) problems.push(`ci.yml runs \`${name}\` and verify does not`);
}
for (const name of inVerify) {
  if (!ciOrder.includes(name)) problems.push(`verify runs \`${name}\` and ci.yml does not`);
}
if (problems.length === 0 && ciOrder.join(" ") !== verifyOrder.join(" ")) {
  problems.push(
    `verify and ci.yml run the same gates in different orders:\n` +
      `    verify: ${verifyOrder.join(" ")}\n    ci.yml: ${ciOrder.join(" ")}`,
  );
}

if (problems.length > 0) {
  console.error("gate check failed:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("gates ok: every step of verify and ci.yml resolves to a real script");

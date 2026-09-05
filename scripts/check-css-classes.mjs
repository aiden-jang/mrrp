/*
 * Find `s.foo` where the CSS module has no `.foo`.
 *
 * The gap no other check covers: TypeScript does not read CSS modules (they are typed as a loose
 * record), eslint does not read CSS, and `s.typo` is `undefined`, which React puts in the DOM as no
 * class at all. The element renders, unstyled, and nothing anywhere errors. Two were live when this
 * was added: `s.disclosure` and `s.disclosureHead` on the room's date disclosure, which had been
 * carrying the browser's default triangle while every other disclosure in the app drew a chevron.
 *
 * It is the same silent-failure shape as `var(--undeclared)`, which is why check-css-vars.mjs
 * exists.
 *
 * Only the referenced-but-undefined direction is checked. Reporting classes the stylesheet defines
 * but nothing uses would need to understand every class built by hand from a template string, and a
 * scan that does not is a pile of false positives, which is worse than no check.
 */
import { readFileSync, globSync } from "node:fs";
import { basename } from "node:path";

/** Class names a module stylesheet defines, including those only reached through composition. */
function definedClasses(cssPath) {
  const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
}

const problems = [];

for (const cssPath of globSync("packages/*/src/**/*.module.css")) {
  const defined = definedClasses(cssPath);
  const moduleName = basename(cssPath);

  /* Every file importing this module, since a module is often read by more than its sibling. */
  for (const src of globSync("packages/*/src/**/*.{ts,tsx}")) {
    const code = readFileSync(src, "utf8");
    const pattern = `import\\s+(\\w+)\\s+from\\s+["'][^"']*${moduleName.replace(".", "\\.")}["']`;
    const imported = new RegExp(pattern).exec(code);
    if (!imported) continue;
    const alias = imported[1];

    const at = (index) => code.slice(0, index).split("\n").length;
    for (const m of code.matchAll(new RegExp(`\\b${alias}\\.(\\w+)\\b`, "g"))) {
      if (!defined.has(m[1])) {
        problems.push(`${src}:${at(m.index)}  ${alias}.${m[1]} is not defined in ${moduleName}`);
      }
    }
    for (const m of code.matchAll(new RegExp(`\\b${alias}\\[["']([^"']+)["']\\]`, "g"))) {
      if (!defined.has(m[1])) {
        problems.push(`${src}:${at(m.index)}  ${alias}["${m[1]}"] is not defined in ${moduleName}`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error("css class check failed:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("css classes ok: every styles.x reference resolves");

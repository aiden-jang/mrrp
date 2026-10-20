# Working in mrrp

Read [ARCHITECTURE](ARCHITECTURE.md) for ownership, [DECISIONS](DECISIONS.md) for current choices,
and [ART](ART.md) for the scene's visual rules. `AGENTS.md` and `CLAUDE.md` link to this file.

## Checks must measure something

An unexpectedly clean result is a reason to inspect the scan. Verify the input set is nonempty,
the command ran in the intended directory, and the tool supports the runtime it claims to measure.
Green is evidence only after the check has also failed for the mistake it guards.

For a new check:

- Cover every place the failure can occur, including the check's own source where applicable.
- Exclude test fixtures from production-source scans.
- Prove failure, restore the source and prove the tree is clean afterward.
- Use `pnpm run <name>`. Bare names may invoke pnpm builtins instead of repository scripts.
- Keep CI and `verify` aligned; `check-gates.mjs` enforces their inventory and shadowed names.
- Do not increase a size or comment budget to make a change fit.

`check-size.mjs` records existing oversized files at their current ceiling. Lower the exemption
when a file shrinks; the check intentionally fails when an entry is too large as well as too small.
New source stays within the normal file and component-state budgets.

Do not write live test totals, check totals or file lengths into prose docs. Let the tools report
them. Historical records can describe past measurements.

## Comments

Keep inline comments short, usually one or two lines. A module header may explain a mechanism
when it earns the space. Explain a silent failure, a non-obvious constraint or why the obvious
alternative breaks something. Do not narrate code, refactors or successive historical changes.
Put longer reasoning in the decisions document, and reread comments at extraction seams.

Preserve `prettier-ignore` sprite grids, lint directives and explanations inside empty catches.
Never raise a comment budget to fit more prose. Comment density also requires a reading pass.

## Roles and state

The companion names the cat, chooses her look and writes her notes. The cat answers and acts as her. Both can draw for the frame. Keep these roles distinct and enforce every permission in the Durable Object.
`seats.spec.ts` checks server rules; the browser journeys check the complete two-seat behavior.

Keep drafts local to their editor and network effects with a clear owner. Preserve user content
and unsaved work on failure. Do not substitute an empty result for a failed read before editing.

## Two intentional large modules

Do not decompose `room.ts` or `Cat.tsx` to meet a line budget. The former is one Durable Object
whose methods share state, guards and snapshot construction. The latter is one canvas engine:
a stable effect, refs and one draw loop. Its empty dependency list is intentional.

Independent pure calculations may be extracted, as in `doodle.ts`, `zone.ts` and `secrets.ts`.
Do not split a shared mechanism merely to relocate its coupling.

## Verification

Run `pnpm run verify`: dependency audit, repository gates, unused-code checks, types, lint, formatting, build,
package tests and browser journeys. CI runs the same gate inventory. The Worker suite uses real
workerd through `@cloudflare/vitest-plugin`; do not mock its storage or permissions.

`canvasHarness.tsx` provides a recording context and a controlled frame clock for canvas tests.
Assertions about intermittent behavior must be numerical rather than based on a lucky screenshot.
For UI changes, also inspect the actual desktop and narrow layouts, keyboard focus, long content,
reduced motion and both room palettes. State any verification limits.

Use Conventional Commits without a scope. Keep personal room data and credentials out of public
reports. See [CONTRIBUTING](CONTRIBUTING.md) and [SECURITY](SECURITY.md).

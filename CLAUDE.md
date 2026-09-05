# Working in mrrp

How this repo expects to be worked in. Personal working style (commits, planning,
how to explain things) lives in the global `~/.claude/CLAUDE.md`.

The first sections are engineering standards that apply to any codebase. The ones after them are
about mrrp in particular, and every claim in those was checked against the code before it was
written down.

## Do not trust your own measurements

Most false statements come from scans that measured nothing, not from misreading code. Real cases:
a glob with `{src,test}` braces matched zero files, so a coverage sweep compared against an empty
string and called every module untested; a `cd` inside a backgrounded command did not apply, so
three "stability runs" ran nothing; a coverage tool reported 0% because it could not instrument the
runtime; a script name silently resolved to an npm builtin, so a check reported green for a day
without ever executing.

So: an impossibly clean result means suspect the scan first. And **green is not proof unless you
have seen that check fail** — break the thing it guards, watch it go red, then believe it.

## Writing a new check

- It has to cover its own source, or the checks stop being checked.
- It has to cover every place the failure can appear, not just where you first saw it.
- Exclude test files from source scans: tests mount throwaway routes and declare throwaway types.
- Prove it fails before trusting it, and prove a failure leaves the tree clean.
- Always `pnpm run <name>`, never bare `pnpm <name>`. Both `deploy` and `docs` are also pnpm's own
  commands, so bare they run pnpm's and your gate never executes. `check-gates.mjs` holds the list
  of shadowed names and fails on a bare one; add to that list rather than avoiding the name.

## Numbers in prose

Do not write live counts into docs: test totals, check totals, file lengths. Nothing verifies them
and they go stale silently. Say what a thing is and let the check print the number. Describing a
past change is different, and fine.

## Comments

- Inline comments run to a line or two. Three is already a lot. A file header explaining why a
  module exists is allowed to be longer, and the sprite and gate files are where that is earned.
- Never explain a refactor, or what the code used to do. A reader never saw that version.
- A comment that logs successive changes is a changelog. Git has it, and the log drifts out of step
  with the value it describes.
- After moving code, re-read every comment near the seam. A move strands them on the wrong function.
- Never raise a comment budget to fit prose. Trim instead — no script can enforce that about itself.

## The two halves are not the same

One person is the cat and the other looks after her. This is not a skin on a symmetric app: he
names her, dresses her and writes her notes; she acts as her, draws, and answers. A control that
belongs to one of them belongs to one of them.

Enforce it in the Durable Object, not in the JSX. Hiding a button is a rendering decision and the
route is still there. `seats.spec.ts` is where a new role rule gets its test, and the browser
journey in `packages/web/e2e` is what proves the two halves stay apart end to end.

## What `pnpm run verify` runs

Gates, size, docs, typecheck, lint, format, build, tests, then the browser journey. CI runs the
same list, and `check-gates.mjs` fails if the two ever drift apart, so add a step to both.

The gate scripts guard what no compiler sees: `check-gates.mjs` (verify and CI agree, and no script
name is shadowed by pnpm's own), `check-size.mjs` (file length and component state), and
`check-docs.mjs` (paths, scripts, routes and symbols named in the docs still exist). Comment
density has no gate and is a reading job.

`check-size.mjs` keeps a list of files already over the ceiling, recorded at the size they were.
It fails if one of them is _smaller_ than its entry as well as larger. That is deliberate: an
exemption nobody has to remember to lower is not a ratchet, and the headroom a decomposition wins
is otherwise free to grow back into.

## Two files stay big on purpose

`room.ts` and `Cat.tsx` are both far over the ceiling and both should stay that way. Do not open
either one intending to decompose it.

`room.ts` is one Durable Object, so the class is the RPC surface and cannot become several classes.
Most of its methods call `roles` and `guard`, and `build` reads across every group, so splitting it
into modules relocates that coupling behind an indirection instead of removing it.

`Cat.tsx` holds no state at all. It is a canvas engine: one effect with an empty dependency array,
a pile of refs, and a draw loop that reads most of them. The refs and the empty deps are the
mechanism, not neglect. They are how live props reach a loop that must never resubscribe.

What is worth taking out of both is the part that is pure. `doodle.ts`, `zone.ts` and the typed
secrets in `secrets.ts` came out that way, and each one is testable now in a way it was not inside
its parent.

## Where the tests actually run

The worker suite runs in real workerd through `@cloudflare/vitest-pool-workers`, so Durable Object
storage and the seat rules behave as they do in production rather than against a mock. It is split
a file per area, each with its own room, because a worker slows down as it serves more requests and
one large file is quadratic in its own length.

The canvas has its own harness. `canvasHarness.tsx` mounts the cat in jsdom with a recording 2D
context and a frame clock the test drives, so layering and timing get assertions instead of
somebody squinting at a browser.

Anything true only some of the time is tested numerically, never by looking.

## Reading the code

The reasoning lives in [`DECISIONS.md`](DECISIONS.md), not in the source. That split is the whole
convention here: if a change needed a paragraph to justify, the paragraph goes in that file and the
code gets a warning. Comments in the code are kept for three things only:

- a trap that has actually bitten somebody, like the whole-pixel rule or the two gain stages in
  `sound.ts` where one node would let the LFO and the envelope fight over the same parameter
- a rule that fails silently when broken, like the seat checks in the Durable Object or the spoiler
  filter in `dreams.ts`
- why not the obvious alternative, where a reader would reasonably try the obvious thing and quietly
  break something

Everything else was moved to `DECISIONS.md` or deleted. If you are wondering why something is shaped
the way it is and the code does not say, that is deliberate: it is in the doc.

They are written as warnings, not descriptions, and mostly as `//` rather than block comments. Two
lines of prose inside a four-line box reads as documentation; the same two lines as `//` read as
somebody leaning over your shoulder saying "don't".

Three kinds of comment here are load-bearing and must survive any tidy-up: `// prettier-ignore`,
which holds the sprite grids readable, `// eslint-disable-next-line`, and the line inside every
empty `catch {}`, which is the only thing keeping `no-empty` quiet. Removing a comment cannot break
a build, right up until the comment was doing a job.

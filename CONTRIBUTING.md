# Contributing

Use Node 22 or newer and pnpm 9.15. Follow the setup in [README](README.md), and read
[CONVENTIONS](CONVENTIONS.md), [ARCHITECTURE](ARCHITECTURE.md) and [ART](ART.md) before changing a room.

## Local rooms

Use disposable rooms for development. Do not put personal room links, seat tokens, recovery
codes or room content in commits, screenshots or public issues. Local Wrangler storage is
separate from production. Optional local bindings belong in ignored `.dev.vars` files; never
copy provider secrets into source or browser environment variables.

See [development notes](docs/development.md) for local time travel and optional services.

## Changes

Keep the two roles distinct. Permissions belong in the Durable Object, with a server test;
hiding a control is not authorization. Preserve user-written text. Functional labels, errors
and destructive confirmations should remain clear even when the surrounding copy has a joke.

Give effects and drafts a clear owner. Failed reads must not become empty editable data, and
failed writes should preserve the person's work. Keep `Cat.tsx` and `room.ts` together as the
conventions require. Extract independent pure behavior rather than spreading one mechanism
across files.

Keep comments about traps and constraints. Remove narration, stale history and obvious restatements.
Retain formatter and lint directives, sprite layouts and explanations in empty catches.

## Verification

Install the browser used by the end-to-end suite before the first run:

```sh
pnpm --filter @mrrp/web exec playwright install chromium
pnpm run verify
```

Worker tests use `@cloudflare/vitest-plugin` and real workerd storage. Do not replace them with
mocks to make an upgrade pass. Browser tests create disposable rooms and use both seats.

For UI changes, inspect desktop and narrow layouts, keyboard operation, focus after closing
editors, long content, zoom and reduced motion. Check the light and dark room palettes. Record
what was verified and any device or assistive-technology limitations.

Prove new checks and regression tests fail for the behavior they guard, then restore the source
and rerun them. New gate scripts must cover their own source where applicable and belong in
both CI and `verify`. Lower size exemptions when a refactor earns space; never increase budgets
to fit a change. Avoid live test or file counts in prose documentation.

## Commits and reports

Use Conventional Commits without a scope, for example `fix: keep an unsaved drawing open` or
`docs: explain room recovery`. State the problem, resulting behavior and relevant validation.

Report security issues privately using [SECURITY](SECURITY.md). For ordinary bugs, include a
reproduction using a disposable room, browser and viewport, expected behavior and actual behavior.

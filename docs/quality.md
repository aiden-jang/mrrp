# Quality checks

Use the supported Node runtime and pinned pnpm version from [README](../README.md).
Install Chromium once, then run the complete gate:

```sh
pnpm --filter @mrrp/web exec playwright install chromium
pnpm run verify
```

## What is verified

Repository checks cover verification order, budgets, comments, CSS references, docs,
unused code, types, lint, and formatting. Canvas tests use numerical drawing assertions
with a controlled frame clock. Worker tests use real workerd storage and seat permissions.
Browser journeys test production assets through a local Worker with isolated room storage;
the configured auth and weather destinations refuse external requests.

The browser suite covers both seats, consent to join, notes/decor, replies, drawing,
recovery, offline feedback, storage refusal, postcard sharing, and the actual installed
service-worker cache. It refuses to reuse a running development server. Browser failures
retain screenshots and traces; CI also retains Worker logs in its diagnostics artifact.

For a focused pass, use `pnpm run verify:core`, `pnpm run e2e`, or a package's `test`
script. Browser tests need a current production build from `pnpm run build`.

## Local visual review

Build first and start a separate review server with disposable storage:

```sh
pnpm run build
pnpm --filter @mrrp/worker exec wrangler dev --ip 127.0.0.1 --port 34611 --inspector-port 34612 --persist-to .wrangler/review --var AUTH_URL:http://127.0.0.1:1 --var WEATHER_URL:http://127.0.0.1:1
```

In another terminal:

```sh
MRRP_UI_URL=http://127.0.0.1:34611 pnpm --filter @mrrp/web run capture:ui
```

`MRRP_UI_OUTPUT` chooses the output directory. The default capture folder is ignored;
keep only selected images with a dated record. The tool accepts only local origins,
blocks external browser requests, creates disposable rooms, and checks painted canvas
pixels, page errors, overflow, and automated WCAG A/AA findings. It reviews both roles,
editors, sharing failure, and day/night palettes at phone, tablet, and desktop widths.

Captures use overlapping viewport sections because Chromium's full-page compositor can
omit a canvas even when its pixels are painted. Inspect the actual screenshots as well as
the check results. A painted canvas alone does not establish correct cat behavior.

## Limits

Chromium automation does not establish physical phone behavior on Apple or Android, Safari behavior,
native share-sheet delivery, manual screen-reader usability, or performance on a real phone.
Local auth/weather failures do not verify live services. An observed usability session is
also separate; use the [visitor walkthrough](visitor-review.md) and record its evidence.

## Review artifacts

Keep generated screenshot sets, videos, traces and run reports in ignored
`test-results/` output or a temporary local directory. CI artifacts should expire.
Commit authored design references and a small curated set of README images only;
keep runtime and installation assets separate. Earlier audit records remain in Git
history. Use synthetic data and remove private information from shared evidence.

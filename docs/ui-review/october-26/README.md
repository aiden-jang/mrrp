# October 26 room and recovery review

Reviewed from base revision `b82814b` with the changes committed alongside this record.
All room content used disposable local state and demonstration names. Auth and weather
destinations were disabled; no personal rooms or production writes were used.

## Interface evidence

The local review covered landing, waiting room, setup, failed invite sharing, invitation,
companion controls, cat controls, long replies, drawing, and both seats at night. Each ran
at widths 320, 390, 430, 768, and 1440 with reduced motion. All states passed automated
WCAG A/AA, overflow, page-error, and painted-canvas checks.

Pixel inspection covered the phone landing, narrow setup controls, failed sharing with a
selectable link, both seats, and the night palette. The authored pixel scene was retained.
The new feedback layout was also checked in a real browser: offline and action errors remain
separately readable rather than overlapping.

Selected viewport captures:

- [Desktop landing](landing-1440.png)
- [Night room on a phone](companion-night-390.png)
- [Narrow notes editor and save controls](setup-320-section-1.png)
- [Invite recovery and selectable link](invite-error-320-section-1.png)

The initial full-page screenshot method omitted the canvas even while pixel reads showed
it was painted. Comparing viewport captures and the canvas's own pixel output isolated that
to Chromium's full-page compositor. The review tool now retains overlapping viewport
sections and verifies painted pixels before capture. The room renderer did not need a rewrite.

## Behavior and repository work

Regressions first reproduced late socket callbacks, duplicate opening connections, malformed
messages, stale reads overwriting live/action state, reads completing after cleanup or room
ending, silent reply failure, repeat sends, failed gifts restoring old words over a new draft,
overlapping feedback, unsafe offline-shell replacement, and missing private-response headers.
The fixes preserve ownership, content, retry, and private caching boundaries.

Storage refusal now has an explicit retry screen instead of a blank page. Failed invite
sharing leaves a selectable link. A completed postcard can be shared from its own click,
preserving browser user activation. The actual browser check verifies that activation and
that native cancellation does not start another download; the share sheet itself is mocked.

Compatible dependency updates clear the advisories reported by the baseline audit. Browser
journeys now serve the production build through one isolated Worker, with no separate Vite
development server. CI keeps its verification and dependent delivery jobs and retains browser
diagnostics on failure. Docs and comments describe the current runtime and ownership.

## Limits

Chromium automation and numerical canvas tests do not establish physical-device behavior,
Safari compatibility, native share-sheet delivery, spoken screen-reader output, or live
auth/weather behavior. This was an engineering and visual review, not an observed visitor
study. Use the [visitor walkthrough](../../visitor-review.md) for that separate session.

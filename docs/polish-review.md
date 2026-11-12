# Full-app polish review

Local review on November 12, 2026. All room data used for review was disposable.

## Scope and result

- Arrival: reviewed the landing page, returning visitor, invitation, waiting room and failed sharing.
  Invitation copy makes entering as the cat an explicit choice. Incomplete room URLs now reach the
  existing recovery screen instead of a plain server error.
- Room: reviewed both roles, long names, moods, notes, gifts, furniture controls and day/night palettes.
  Kept the authored scene, shared interaction geometry, local assets and existing rendering loop.
- Setup: grouped cat appearance, decoration, time, notes and recovery. Removed the nested editor
  border, kept save/cancel visible, and hid regular room actions while editing. Failed saves keep drafts.
- Writing: reviewed long replies, history, drawing, focus after closing editors, and postcard sharing.
  Drawing ink choices retain their small painted dots inside larger touch targets.
- Settings: exposed recovery codes inside Room & account, kept advanced access controls collapsible,
  and separated leave/delete controls from everyday access and remembered dates.
- Recovery: reviewed invalid codes, valid seat recovery, blocked copy, leaving and returning, deletion
  confirmation, and undo. Invalid-code feedback tells the person what to check.
- Feedback: reviewed blocked storage, connection errors, failed saves, sharing fallback and updates.
  Updates follow the room palette and stay in page flow. Error text clears contrast checks on inset
  recovery surfaces throughout the day.

## Verification

The repository verification command passed, including real Worker tests and production browser
journeys. The contrast regression was shown to fail before correcting the palette. The incomplete-link
browser regression was shown to fail before correcting the public room route.

The expanded visual review checks painted canvas pixels, browser errors, horizontal overflow and
automated WCAG A/AA findings. It covers phone, tablet and desktop widths; day/night states; settings;
recovery; failed editing; updates; and reversible room exits. Screenshots were also inspected directly.
Generated review images and logs stay outside Git, as required by [quality checks](quality.md).

Safari was checked manually for landing, setup, live preview, saving, focus return, and 200% page zoom.
A disposable room created in Safari exchanged a note, reply and mood update with Chrome. Keyboard
focus, long content and reduced-motion behavior were also checked in Chromium.

No new runtime dependencies, fonts, image downloads or renderer effects were added.

## Limits

Physical iOS/Android devices, native share-sheet delivery, live account linking, live weather delivery,
manual screen-reader operation and real-device performance were not verified. Local checks and a
cross-browser walkthrough do not replace the [observed visitor session](visitor-review.md).

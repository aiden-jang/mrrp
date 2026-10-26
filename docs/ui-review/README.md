# UI review

The finishing pass preserves mrrp's hand-drawn room and asymmetric roles. It improves the notes
editor, keyboard drawing, recovery entry, in-room help, failure handling and night palette.

Review uses disposable local rooms. Screenshots contain demonstration names and no personal
room content. The landing image is a product preview rather than a populated account.

## Coverage

- Desktop and narrow layouts, including a small phone width.
- Both seats, invitation consent, appearance/decor persistence and answers.
- Editor labels, focus entry/return, long notes and visible save/cancel actions.
- Drawing keyboard movement and draft retention after a failed save.
- Failed notes fetch and recovery without an account.
- Reduced motion and contrast across the room's daily palette.
- Automated accessibility checks on the landing, room and setup editor.

The repository's browser suite uses Chromium. It does not establish physical-device behavior,
manual screen reader usability or native sharing behavior on iOS. Those remain verification
limits, not silently passing checks.

See the committed captures alongside this document for the reviewed layout. Regenerate and
inspect them when changing the corresponding screen; screenshots alone do not prove behavior.

The [October 26 review](october-26/README.md) covers storage access, sharing recovery,
stacked feedback, both seats, editors, and both palettes. [Quality checks](../quality.md)
explains how to reproduce the local visual pass.

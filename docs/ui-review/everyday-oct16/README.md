# Reply editor reachability

A long reply scrolls within its text area instead of expanding the editor past its
actions. The page retains bottom safe-area padding. Draft text is preserved while
the viewport changes, and saving still completes the same two-seat conversation.

The browser journey checks a multiline Korean reply with emoji, the editor's
bounds, both actions in a short viewport and the complete saved text. Existing
room palette and accessibility journeys remain separate checks.

- [Desktop](reply-desktop.png)
- [Short phone](reply-short-phone.png)

The short viewport represents reduced keyboard space. Native keyboard occlusion,
nonzero device safe-area insets and spoken screen-reader output remain device
checks.

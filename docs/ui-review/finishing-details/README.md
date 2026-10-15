# Connection feedback review

The room distinguishes an offline browser, a connecting live channel and an
interrupted channel with polling recovery. It asks people to wait for confirmation
rather than claiming a message was sent. The notice clears when the connection is
ready again and leaves the room and drafts in place.

- [Desktop offline notice](connection-desktop.png)
- [Phone offline notice](connection-mobile.png)

Captures use an isolated local room. The journey checks offline/recovered states
and overflow after resizing. Physical backgrounding and airplane-mode recovery
still need a device check.

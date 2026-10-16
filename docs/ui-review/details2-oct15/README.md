# Replies while away

A new companion reply received while the cat-side tab is hidden prefixes its title
with a quiet dot. Returning to the tab clears it. Loading an old reply or receiving
the same snapshot again does not create an indicator. The sender’s own tab stays
unmarked. No read receipt or notification permission is involved.

The two-seat browser journey sends a real reply through the local Worker and
checks both document titles. Background visibility is emulated; operating-system
tab treatment remains a physical-browser check. The title behavior also has a
focused regression test checked against a deliberately broken visibility rule.

- [Desktop room and recovery feedback](connection-desktop.png)
- [Phone room and recovery feedback](connection-mobile.png)

These captures confirm the surrounding room layout remains intact. Headless
page captures do not include the browser’s tab strip; title assertions verify
the indicator itself.

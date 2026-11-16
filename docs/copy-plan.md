# Mrrp copy upgrade plan

Status: reapplied locally to the updated main branch. Verification results and unavailable checks are recorded below.

## Direction

Warm, nonchalant and dry. The room supplies the gesture; the interface does not need to explain
how meaningful it is. Humor comes from ordinary cat behaviour, small domestic incidents and
mock-serious observations. Keep affection visible and leave a sincere sentence alone when it works.
No streaks, attendance debt, guilt, forced slang or jokes around recovery and destructive actions.

The premise is **A room for two. One of you is the cat.** The companion makes the room,
chooses the cat’s look and writes notes. The other person is the cat, chooses moods and replies.
Both can draw. Keep these roles, permissions and saved values intact.

## Landing and joining

The headline is “A room for two. One of you is the cat.” The explanation is “Make a room for
someone you like. Send them the link. They’re the cat; you keep them company.” The preview caption
is “Very little to do. Good company for it.” Keep clear Make a room and Back to the room controls.

An invitation says “You’re the cat.” Joining remains an explicit Go in action; opening a link alone
must not claim a seat. “No account needed. No attendance taken.” is the supporting line.

## Room captions and moods

The narrow caption helper in `packages/web/src/roomCopy.ts` selects the subject and supporting
observation from actual room state. On the cat’s side it says “You are…”, without naming her as a
third person. The companion sees the cat’s name. Existing setup, waiting, settled and sitting states
retain their precedence. A box observation only appears when the cat is in the box.

“A whole room, and you picked the box.” is the cat-side box caption. The companion sees
“{name} picked the box. The whole room was available.” Mood predicates remain grammatical in both
perspectives. Calm support stays plain for sad, lonely, tired and stressed moods; ordinary mischief
can carry the furniture joke. Keep pose, animation, colours, sound and mood IDs unchanged.

## Supplied notes and existing rooms

Replace the complete default bank with the ordered sequence below. Keep its length and daily
progression; the final note remains available. Default-using rooms read the revised bank at their
existing position. Do not reset progress or migrate stored room content.

Companion-written notes replace defaults through the existing fallback. Preserve those notes,
reply text, stored reply quotations, names, gifts, drawings, dates and all private room data.
Avoid invented read receipts, assurances that a person saw an action, or assertions that the room
knows someone’s mental state. Notes address the cat as “you”.

## Notes, replies and gifts

Use clear Notes, Save notes, Add a note and Cancel actions. Explain “A new note each day. The last
one stays until you add more.” An editable draft is not described as newly shared before saving.
Progress and history say which notes have reached the cat’s side rather than claiming comprehension.
The history entry is “Your notes & replies”. Keep original words separate from interface copy.

Gift descriptions and discoveries use actual saved objects. Shared details remain available through
keyboard controls. A small joke can follow the box or catnip; accessible announcements still explain
the event. Sending and saving keep their existing guards, confirmation and draft-preservation paths.

## Returning, memories and dreams

Returning lines welcome the person without charging them for time away. Use observations such as
“{name} stretches. the usual spot is available.” and “{name} settles in beside you. a familiar
arrangement.” Keep existing time buckets, memory thresholds, anniversary logic and local clocks.

Traits describe recorded interactions without turning counts into achievements. Dreams stay neutral
between seats, draw only on permitted discovered objects and never reveal a hidden piano or other
undiscovered detail. Preserve deterministic selection and deduplication.

## Sharing and postcards

Making a room or postcard does not send it. Native-share resolution says **Share sheet closed.**;
clipboard success says **Link copied.**; a real download says **Download started.** Keep cancellations
quiet and leave selectable link text on failure. Preserve prepared-file sharing and user activation.

Postcard captions distinguish the cat’s own perspective from the companion’s. “Both here. Very little
accomplished.” is used for the cat when together; the companion’s version includes the cat’s name.
Do not infer the captured animation pose. Keep names, dates, image proportions and download paths.

## Recovery, account and room access

Accounts remain optional. Explain seats, recovery codes, access changes and freeing a seat in plain
language. The next person who **joins** from a freed link takes the seat; merely opening it does not.
A failed account or notes read stays a failure with retry, never an empty editable result.

Copying a code describes the actual clipboard result and keeps manual selection available. Keep
credentials, IDs and private room prose out of reports and analytics. Do not alter access rules.

## Deletion and leaving

Deletion confirms with the companion’s own name. Failure says “Couldn’t confirm deletion. Use the
companion seat and enter your own name.” It must not ask for the cat’s name. Keep the current
recovery windows, dates, server enforcement and explicit destructive actions.

Deletion removes the whole room for both people; leaving affects the cat’s side and seat. Keep
those effects distinct. Expired recovery says that contents cannot be restored without dramatic
language about losing the cat. Back to mrrp and Start fresh instead describe their actual navigation.

## Errors and connection states

Keep them factual and actionable. “Couldn’t confirm that change. Check your connection and try
again.” avoids claiming that a server write definitely did not happen. Load failures offer retry;
an interrupted live connection still explains polling and waiting for confirmation. Draft retention
is promised only where an editor actually preserves it. Preserve failure classifications and timers.

## Public surfaces and documentation

Homepage and install descriptions use “A room for two. One of you is the cat.” Keep private names,
notes and secret room information out of generic metadata. Keep per-room titles and reply badges
based on their existing data, without adding read receipts. The icon generator’s manifest description
matches the checked-in manifest; its existing social-image words and round-eye art stay intact.

README and design guidance agree with this voice. Remove the obsolete README screenshot embed,
preserve original images and install declarations, and identify the install previews as predating
the copy pass until fresh captures are possible. No image generation or artwork replacement is needed.

## Baseline and validation

Work directly on the checked-out main branch. Preserve the pulled Hono upgrade, cat eye artwork,
room geometry, tests, editor separation and all unrelated changes. No branch, worktree, commit,
push or deployment is part of this local copy pass.

Run the repository verification, the frontend suite and a deliberate regression check for the
caption’s role distinction. Inspect both palettes, desktop/phone layouts, keyboard focus, long text,
reduced motion, postcards and both seats when browser access is available. Record unavailable checks
rather than presenting them as passes. Keep generated reviews out of version control.

## Complete default sequence

1. Somebody made you a room. Reasonable use of an afternoon.
2. The room has no daily targets. A promising start.
3. You found the warmest square of floor. Strong opening move.
4. Asleep in the sun. The position appears to suit you.
5. An entire room for sitting around. Finally, adequate facilities.
6. Drop in whenever. The furniture has no other plans.
7. Tired is a complete answer.
8. The shelf could stand to lose a few things.
9. Somebody thought you might like this. Fair assessment.
10. You considered moving. That was enough of that.
11. Same room, whatever kind of day it was.
12. Your fur colour was a decision. Several decisions, probably.
13. You can come in exactly as you are.
14. A whole room, and you picked the box.
15. A quiet corner for a difficult day.
16. That sunbeam is getting a very thorough inspection.
17. The door is over there. Your spot is right here.
18. Nobody is keeping score. Difficult to hold a pencil with paws.
19. A brief look of affection. Easy to mistake for something else.
20. The plant is minding its business. For now.
21. Quite a day. You can leave it outside for a bit.
22. The moth remains at large.
23. A loaf with opinions. No immediate plans to share them.
24. The room is available for doing very little.
25. You have maintained this position beautifully.
26. Somebody made room for you. Literally, in this case.
27. Asleep, with one ear on administrative duty.
28. The mug was too near the edge. That was the mug’s fault.
29. Come back whenever. No catching up required.
30. Warm, present, occasionally in the way. Good company.
31. A mood will do. No supporting documents needed.
32. Nothing to catch up on. The rug is still a rug.
33. No tasks have been assigned to you.
34. The unsunny patch of floor. An interesting choice.
35. The window will be here tomorrow too.
36. A note left for you. Read it at your leisure.
37. Half in the box. A workable arrangement.
38. Rain outside. A convincing argument for staying in.
39. The light looks good in here. You helped.
40. You checked the room and went back to sleep. All in order.
41. The window has your full attention. It must be flattered.
42. The blanket may require some rearranging. Several times.
43. That square of sun came with the room.
44. Nobody asked for productivity. A sensible policy.
45. The shelf has become a little more spacious.
46. A small chirp. Consider the matter addressed.
47. Cold outside. Better working conditions in here.
48. Somebody left you a few words. The rest can wait.
49. You can have a mood. There is space for it.
50. Sitting on the important thing. An established technique.
51. A quick look in is a perfectly good visit.
52. Late is fine. The room is still open.
53. Something left out for you. A modest development.
54. No improvements required. You already fit in the room.
55. The bed is right there. Apparently the floor offers something it lacks.
56. You can be tired without making a case for it.
57. The catnip has made the afternoon less structured.
58. That point on the wall must have an excellent story.
59. The room keeps well between visits.
60. A room made for you. The explanation can be that short.
61. It fell. An unfortunate coincidence that you were nearby.
62. No particular mood required for entry.
63. Very little accomplished. Nothing left unfinished.
64. Somebody is glad this room has you in it.
65. The warm floor was located without assistance.
66. You can just sit here. No update needed.
67. The yarn has taken an unnecessarily personal approach.
68. A short visit. A full-sized patch of sun.
69. Face against the cushion. A sound arrangement.
70. No plans. Remarkably easy to stick to.
71. A name was picked for you. Try not to make it a whole thing.
72. Entirely boneless. An impressive use of a skeleton.
73. There is no deadline on getting comfortable.
74. You looked at the door and decided against it.
75. Good to have you here.
76. A box, specifically for you. The extravagance of it.
77. Company and quiet can happen at the same time.
78. The dent in the bed is looking familiar.
79. The sun moved. You filed a change of address.
80. You can enjoy this without doing anything in return.
81. A rough week can stay outside the room for a minute.
82. The warm end of the blanket. A straightforward acquisition.
83. Somebody made this with you in mind.
84. A slow blink. Quite a lot said with very little face.
85. Quiet in here. It suits the place.
86. The same thing fell off twice. A recurring structural concern.
87. No performance review today. Or tomorrow.
88. Curled up into a shape the bed understands.
89. The rain is handling the background noise.
90. Somewhere to be, with nothing particular to do.
91. It got dark while you were asleep. No action required.
92. Same room. Starting to look comfortably familiar.
93. The window still puts on a decent afternoon.
94. The usual spot has become a fairly specific spot.
95. Quite a few notes now. Still no homework.
96. The dent in the bed appears to be permanent.
97. Good days and difficult ones. Same place to land.
98. Somebody wrote this for you. Still meant.
99. Still here. Still a good arrangement.
100. Last note. The room is staying open.

## Reapply verification record

The locked dependency install completed from the existing package cache, including the pulled Hono
version. Frontend tests, build, type checking, lint, formatting, repository gates, size/comment checks,
CSS checks, documentation checks and unused-code checks passed. A deliberately introduced caption
regression addressed the cat as a third person; the new check rejected it. The correct source was
restored and the frontend suite passed again.

The complete verification command stops at the dependency audit because registry DNS resolution
fails. Worker tests and browser journeys cannot start their runtime because local-port binding is
denied. Desktop/phone visual review, screenshots, native share sheets and raster postcard inspection
remain unverified. The available Node runtime is outside the supported range in package.json, so the
full suite still needs a supported runtime with network and local-server access.

The pulled cat artwork and room geometry match the checked-out baseline. Original curated images
and install screenshot declarations remain available; the obsolete README embed was removed.
Validation was completed before the separately authorized commit and push. No deployment command was run.

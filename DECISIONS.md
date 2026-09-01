# Why mrrp is built this way

The README says what the app does. This says why it is built the way it is, in the places where the
obvious choice was the wrong one. If you are about to "fix" something in here, check whether it is
already on this list.

Written plainly on purpose. Every entry is a decision somebody could reasonably disagree with, so each
one says what was tried and what went wrong.

## She is the cat, she does not have one

The app held two names for one person. He made the room and named the cat; then it told her "someone
made you a cat" and asked her to type her own name on the next screen. So the mood she picked was
hers, but the cat that answered it was a third thing in the room with a name he had chosen, and
nothing in the app could say which of the two she was.

She is the cat. He names her when he makes the room, and that name is what she is called everywhere,
to both of them. She is never asked for a name of her own.

The change is one sentence and it reaches most of the app, because a sentence about a pet is rarely
the same sentence about a person:

- "Hold on Sofia to pet her" told her to hold herself, and promised he would see it. He would not:
  his touch on her is a recorded action, hers is a local sound that reaches nobody.
- Deleting the room asked for the cat's name typed. That is a good confirmation while the cat is a
  pet and reads as "type her name to erase her" the moment she is not. It asks for his own name now.
- "She has no idea what that means" is fond about a cat and unkind about a person, so her side of
  that milestone points at him remembering instead.
- `awayLine` is his alone, like `homingLine` already was: to her it is the room reporting her own
  arrival back to her, in her own name. The full moon is the only ambient line both seats read, and
  on her side it is her window.

The seat-awareness tests cover milestones for this reason, and they caught a draft that read "you
have not once thanked". The room never implies anything owed.

## She acts as the cat, the room does not roll for her

Everything the cat did was the room's dice. The shelf came down on an 18% roll when she looked in,
the box appeared once a day on its own, and the gift she left him was picked at random from three.
The shelf roll outlived the rest of that change by a good while, and it was the worst of the three:
it put the mug on the floor with no line anywhere saying who did it, which reads as a glitch rather
than as her. A test now opens the room fifty times as her and fails if the mug ever moves.

If she is the cat, those are hers. She knocks the shelf off because she means to, gets into the box
he put out, and chooses which of the three things he finds. He is told the same way she is told about
him: the room is different when he opens it, and a line says what she did.

The one roll left is the gift, and only when he has been away a while and she has not chosen one
herself. That one is the room covering for a silence, not acting as her.

Her acts are deliberately kept out of two places. They do not count toward the tally, because her
personality is derived from that tally and she would be learning traits from herself. They are not
dream material either, for the same reason: she is the one who did them. TypeScript caught both the
moment the log started carrying two vocabularies.

## Every button says what it left behind

The marks his actions leave are two to four pixels on a hundred-by-eighty grid: a tuft on the rug, a
dent by the bed, a mug moved to the floor. On a phone that is not feedback. Four separate reports of
"I press it and nothing happens" were all this: the write landed, the log recorded it, and the room
changed in a way nobody could see.

So both action rows now light the button whose mark is in the room, the way the gift and treat
buttons already did, and print one line under them: "She'll find a tuft of her on the rug and the
picture on the wall." It names what is in the room rather than who did it, which is what keeps it
clear of the rule that you never see your own actions echoed back.

Petting is the exception and stays unlit, because it genuinely leaves nothing: the purr is the whole
of it.

## Finding a thing is being handed it

He can leave the yarn, a treat or the catnip out for her. All three were typed easter eggs: animations
the room already knew how to draw, with no state behind them and no way to mean anything. Left out on
purpose they become an object with a life.

There is no button for her to press when she finds one, because a surprise you have to press for is a
chore. The view that carries it is the view that spends it. That spend has to happen after the view is
built, not before, which is the bug the first version had: it spent the thing on the way past and she
was never handed what she had just found.

Three things follow, each of which was wrong in the first version:

**He is shown it too.** It was hers alone at first, reasoning that he knows what he left. He does not:
with nothing on his side, leaving something out is a button that appears to do nothing, and there is
no way to tell "still waiting" from "she has been in and found it". He can look as often as he likes
without spending it, because only handing it to her counts.

**She is told in words as well as shown.** The animation runs once for about six seconds, and reduced
motion removes most of it, so a one-shot surprise can be spent and never seen. The moment is the nice
part; the card is the part that cannot be missed.

**It does not lose to the door pose.** That guard exists so typed easter eggs do not fight the
waiting-by-the-door animation, and it is not the arrival greeting it looks like: it holds for the
90 minutes around the hour he is expected home, which is exactly when she is most likely to look in.
A thing he left out on purpose is not an easter egg, so it plays through the pose.

**And "what the other one has been doing" is gated on holding a seat.** It was keyed on "am I her",
which shut strangers out by accident rather than on purpose. Making it symmetric so both seats could
read it removed the accident along with the asymmetry, and opened her doings to anybody holding the
link. An existing test caught it.

## "Bring her something" was cut rather than fixed

It rolled a die between putting a box out and leaving a bow, so it could never say what he brought,
because he never chose. Two of its three outcomes are now things he does on purpose: he puts the box
out, or he leaves one of three things out for her. The `fed` trait is counted off `leaveout` instead.

`leaveout` is in the tally and not in `Action` for that reason: it is something he does from his own
panel, not a button on the room.

## The cat cannot be neglected

There is no hunger, no sadness, no streak, no decay. Nothing in the room gets worse if nobody visits.

A pet that can be neglected is a chore. The moment the cat can be let down, opening the app becomes
something you owe rather than something you want, and the whole gift collapses into homework. So the
room only ever accumulates nice things, and the nice things expire on their own rather than piling up.

## The cat answers a mood, it does not copy it

Tell her you are sad and she comes over and stays. Tell her you are stressed and she sits on you.

If the cat got sad when you were sad, the cat would be a thing you protect by lying to. On the days it
mattered most you would tap "good", and the one feature the app exists for would be dead. Low moods
make the room warmer and closer, never darker.

And a mood belongs to the day it was said. It used to last until she changed it, which meant a
"stressed" tapped three weeks ago was still drawing a stressed cat three weeks later, under a line
offering "hasn't said how she is yet today" as the alternative. Everything else in the room that means
today is keyed to her local day; this is too now.

## Everything is drawn by hand, one pixel at a time

No sprite sheets, no generated art, no images fetched at runtime. The cat and the room are grids of
characters in the source, and one logical pixel is drawn as one aligned rectangle.

The pipeline for generated art was actually built — six room states, nine poses, a DOM interaction
layer — and then reverted. A generated room is a picture of a room, and this app is two people
watching a cat notice things. Every interaction had to be re-aligned to artwork that no longer knew
where the furniture was, and the result was richer and deader. See `ART.md`.

One consequence worth knowing: a logical pixel must be a whole number of device pixels. Get that wrong
and the floorboards come out at two different widths, which reads as a bug rather than as a style.

## The light is keyframed, not simulated

Her day is a handful of hand-picked hours with straight interpolation between them. There is no solar
model.

A room lit by physics looks correct and feels like nothing. A room where somebody decided that 3pm is
the warmest hour feels decided. Same reasoning for where she lies: she follows the sunbeam because
that is what a cat does, and in summer she lies just beside it, which is the same instinct pointed the
other way.

## Night is two palettes, not a crossfade

The interface follows the room's light, and it switches between a light and a dark palette rather than
blending between them.

Blending was tried. Interpolating a light panel toward a dark one drags every colour through mid-grey,
and text failed contrast at ten of the twenty-four hours, worst case 1.5:1. Two palettes with a
polarity switch put the worst case at 4.5:1.

## The rules are enforced in the Durable Object, never in the UI

The buttons on her side are not rendered on his, and that is not the reason he cannot press them. Every
seat rule is checked again in the room itself.

A rule enforced in the browser is a rule anyone can turn off. The link is the only credential this app
has, so anyone holding it can send any request. Two real bugs came from getting this wrong: `/dress`
once had no seat check at all, and notes were indexed by calendar date, so a day she did not visit was
a note she never saw.

## Anything one of them leaves for the other is gated on holding a seat

Her line, her note, her mood, the drawing in the frame, what the two of them have noticed, the
recovery codes: a third person with the link gets none of it.

The mood was the last holdout. It went to whoever was looking, on the reasoning that the cat _is_ her
and hiding it would show a spectator a different cat. But a forwarded link then let a stranger read how
she was that day, directly above a paragraph telling them the room was not theirs. A tapped mood is a
shorter sentence than a written one, not a different kind of thing.

Physical objects in the room are deliberately not gated. A mug on a floor is a mug on a floor.

## The second seat is permanent, and losing it is recoverable rather than preventable

Seats go to the first two tokens that ever open the link, and they are never reassigned. A token in one
browser is what makes the app frictionless: no account, no email, nothing asked for at the door.

Automatic reclaim of an abandoned seat was built and reverted. The rule was "a seat used for under a
day and cold for a day goes to the next person who opens the link". It broke a rule the test suite
already encoded — a stranger stays a stranger — because a real second person who looked once and got
busy for a week would lose her seat to anyone with the link. It also did not fix the case that
prompted it: opening the link in a private window and sending it on the same day leaves the seat warm,
so she would still be locked out. Recovery is the answer, not expiry.

## Accounts are optional, and they never touch the front door

You can tie a seat to an account, and signing in on a new phone then hands that seat back. Nothing
asks you to.

The most valuable moment in this app is somebody tapping a link and being in a room with a cat. A
sign-in page in front of that taxes exactly that moment. So the account does one job: it delivers the
seat token you already had. The view returns the seat it resolved, the client adopts it, and every code
path after that is identical to somebody who never signed in — which is why accounts touch one method
in the Durable Object rather than all of them. An auth outage is indistinguishable from never having
signed in.

## Sound is on by default

Which is only defensible because of how browsers work: an audio context will not start until you
touch the page. So the first noise she can make is always an answer to something you did, never a
sound that arrives at you unasked.

## This Worker never sees the session secret

The `platform_session` cookie is forwarded to the auth service rather than read here. So the thing
holding your login is one service, and mrrp is not a second place it could leak from. If that service
is down the answer is "not signed in", which is a state the whole app already works in, rather than an
error page: a room has never needed an account.

That promise went untested for a long time, which is the worst shape for a promise: the account tests
all handed the room an account id directly, so every one of them started a step after the question
"who is this". The seam now has its own tests, and they check the outage by pointing AUTH_URL at a
port that refuses instantly. They were verified by deleting the `catch` in `accountOf` and confirming
all three go red, because a test for a swallowed error passes just as happily when nothing is thrown.

What is still untested is a real session: that needs a cookie, which needs a login, which needs a
person.

## The room is pushed, not polled

The client used to re-read the room every 15 seconds, and `bothHereNow` meant "the other one made a
request in the last three minutes". Both numbers were invisible until you noticed what they were
feeding: the cat already had a whole greeting built for co-presence. She flops when you are both
there, shows her belly, and slow-blinks at you. That content was running on a signal up to three
minutes stale, delivered up to fifteen seconds late, which is why the app felt like a mailbox.

There is one Durable Object per room already, which is the thing a socket wants to attach to. Each
open tab now holds one, and the room pushes on every change.

Four things that had to be right:

**Hibernatable, via `ctx.acceptWebSocket`, never `server.accept()`.** Almost every room is idle
almost all of the time. A plain accept pins the object in memory for as long as a tab is open, which
for this app means all day.

**The seat token lives on the socket, not in a Map.** Hibernation throws away everything in memory,
so a `Map<WebSocket, token>` does not survive an idle room waking up. `serializeAttachment` is stored
with the connection and comes back with it.

**One view per socket, never one shared payload.** `build` answers differently for each seat: her
note, his copy of it, what the other one has been doing, the recovery code. One object broadcast to
both would hand each of them the other's.

**The broadcast calls `build`, not `view`.** `view` seats people, counts a visit, rolls the gift and
spends whatever he left out. Running that on a push would mark a treat found because her phone was in
her pocket with the tab open, which is the exact bug that took three goes to fix the first time.

Two things fall out of it. Presence is now literally true, so `HERE_NOW_MS` is a fallback for a
client whose upgrade a proxy refused rather than the definition of being here. And the poll drops to
120 seconds while the socket is up, because it is a backstop rather than the transport.

The broadcast is triggered in one place, a Hono middleware over the room routes, rather than at the
end of each of the twenty-odd methods that write. That kind of list is complete on the day it is
written. The plain GET is in there too and has to be: reading the room is not read-only, and the
spend it performs is the moment he most wants to see.

A deleted room is the interesting edge. Its storage is wiped, so `build` would answer with a
perfectly good view of an empty room and push it to whatever tabs were still open, which is the
dead-link-becomes-a-fresh-room bug with a socket in place of a page load. Those tabs are told the
room is gone and closed instead.

## A pet has to be felt, because there is nothing to draw

Every other thing he does leaves a mark: a tuft, a dent, a picture, a box, something on the floor.
The socket carries those to her in the same second and the room simply looks different. Petting
leaves nothing on purpose, so once the room was live it was the one action that still arrived as
silence.

Two things were in the way. Nothing on her side listened for "they just did something": every
`setNudge` in the app fires on the local person's own tap. And the line that would have said so was
switched off while both seats were present, which was right when the room was fifteen seconds stale
and that line could only offer "looked in a while ago", and wrong the moment it became the live one.

A rising `theirRecent[0].at` on a pushed view is the signal, and it costs nothing because the room
already sends it. It fires the same bounce and the same cue their own tap makes, so a pet sounds the
same from either side of it.

The trap is the first view. It carries whatever they last did, which could be from an hour ago, so
firing on it would greet you with a purr for something you already knew about. `heard()` in
`heard.ts` returns false until it has a previous timestamp to compare against, and that rule is what
its tests are mostly about.

## The arrival card is for being away, the list is for being there

Making the room live quietly broke the log, and the mechanism is worth writing down because it was
invisible in the diff.

`build` fills `arrivals` only when it is given a `since`, and the broadcast deliberately passes none:
`since` is your previous visit, and a push is not a visit. So every pushed view carries no arrivals,
which is correct. What that missed is that the old 15 second poll had been doing two jobs. It was the
transport, and it was also what popped the arrival card, because each poll's `since` was only fifteen
seconds back so anything the other one had just done landed in it. Replacing the transport took the
second job away with it, and the card stopped appearing while you had the room open.

Restoring that would have been wrong. It means pushing with `since` set to the last visit, which can
be hours ago, so every push would re-pop the whole backlog. And the card's own copy is "the room kept
this for you, it waited here until you looked in": it is about absence, and popping it for something
happening in front of you contradicts it.

So the card keeps its job, and what happens while you are watching gets its own list. `theirRecent`
already carries the last four and was already being pushed, so this was mostly rendering. One line
was enough while the room was polled, because whatever arrived replaced it and you never saw two
things at once. Live, they can do three things in a minute, and a self-replacing line loses the first
two.

They still overlapped on the first open after being away, because a thing you missed is also a thing
that just happened, so both claimed it. The split is a high-water mark: the card owns everything up
to the moment you opened the room, the list owns everything after. It has to be a mark and not a flag
tied to whether the card is on screen, or dismissing the card would put everything it showed straight
back into the list, which is the duplication again with an extra step. Only `action` arrivals move
the mark, because a mood or a line she left is not in `theirRecent` and letting one of those move it
would hide a real action from just before.

Collapsing the old branch turned up dead code. It read "both here, else they are here, else what they
last did", and once presence counted an open socket, `bothHereNow` and `themHereNow` became the same
question for anyone holding a seat, so the middle branch could never be reached.

## The room says when things go, and whose midnight it means

Three lifetimes share one room and nothing said which was which. Most marks clear at the end of the
day, the photo never goes, and what he leaves out waits until she picks it up. The room named what
was in it and then let you find out the rest by it not being there.

The part worth getting right is whose clock. The room runs on her day, so a mark cleared "at
midnight" means hers, and his can be nowhere near it. Checked with her on Kiritimati and him on the
US east coast: his own midnight was six hours off and the room correctly said twelve. A line that
just said "at midnight" would have been wrong by half a day for the person reading it, which is why
his side says "where she is" and hers does not.

The countdown is in hours, so the room only needs a coarse clock of its own, five minutes. Without
one, "in about 5 hours" sits there saying five for as long as nobody touches the room, because
everything else that re-renders it is somebody doing something.

## Being held is a duration, so it is not in the log

Everything else in the room is an event: he did a thing, the room kept the mark. Holding on to her is
not that. It has a beginning and an end, and the whole of it is the middle, which is why she used to
get "Aiden petted you" only once his hand was already gone.

The cat already knew how to be petted. Her eyes close, the purr deepens the longer it goes on, and a
heart rises off her. All of that hung off one local flag set by his own press. Live touch is that
same flag, set by his press arriving on her screen, so there is no new drawing anywhere in this.

It stays off the log and out of the tally on purpose. A hold is not a thing he did, it is a thing he
is doing, and counting every press would make the `fed` trait a measure of how twitchy his thumb is.

Two ways a hand can be left on her, and both are covered. His tab closing mid-hold is caught by the
socket's own close handler, which knows whose seat it was. Anything that gets past that lapses after
thirty seconds, because a real hold is a few seconds and a minute-old one is a tab that died without
saying so.

The posts are fire and forget. They fire on every press and release of the cat, and a failed one is
worth nothing: the cost is a hand she does not see, or one that lapses half a minute late, and
neither is worth a red bar across a room where somebody is trying to pet a cat.

## Touching something in the room is watched, not recorded

The room is full of things you can poke that only you ever saw move: the mug, the plant, the bird on
the sill, the door. Once both seats were live in the same second, there was no reason for that to stay
private, and it costs no new drawing at all: the wobble and her head turning already existed as the
local tap's own reaction.

Only those two things are replayed, never the tap handler. That handler opens the curtains, starts the
rain, collects a glint and counts towards easter eggs, and none of that is theirs to do to your room
from a distance. What crosses is "something over there moved, and she looked at it".

It is not in the log and not in the tally, and it lapses after four seconds. Touching the plant is not
a thing you did for her, it is a thing she saw you do, and a log full of them would bury the things
that were meant for her. Four seconds is also what stops a reload replaying the last one.

An unknown prop key is a 400, the same way an unknown discovery key is. The client does not get to
invent room furniture.

## The room says you are both here; the app used to say it as well

Rule four is that the room does things and the app does not announce them. When both seats are live,
the door swings and the cat gets up, crosses to the middle and purrs. Above that sat a honey banner
reading "You're both in here right now", which is the app narrating something you were watching happen.

The headline is gone. What stayed is the line under it, because that one is not an announcement: "He
is right there. He can reach you" is the single thing the scene cannot tell you, which is what to do
about it. It is set smaller now that it is not living under a headline.

## His notes are fetched, not pushed

Making the room push was right and I did not check what it was pushing. His view was 4KB and 72% of
it was `yourNotes`, the notes he wrote himself, capped at 120 notes of 280 characters. That is up to
33KB of his own writing going back to him on every pet, poke, hold and release, to prefill a panel
that was not open. Cheap at one pull every fifteen seconds; not cheap once every write is a push.

One reader, one fetch, when the panel opens. His view is 1.1KB now. If the fetch fails the panel
still opens with an empty notes box, and saving an empty box is what restores the defaults anyway.

## Broadcasts are not coalesced, and that was measured rather than assumed

One press of the cat is two writes, `hold` and `act`, so it is two pushes. Merging writes inside a
short window looked obviously worth it and was built, and then backed out.

It needs a timer and two fields of in-memory state on an object that hibernates, and every way it
fails is the room going quiet rather than noisy. The test run showed the shape of it: the flag
survived a storage wipe between tests and a clock that moved backwards made the window negative.

The number settled it. After the notes came out of the view, coalescing would have saved another
1.1KB on a double write, against the 6.9KB that taking the notes out had already saved. That is not
worth stateful timing in a Durable Object.

## The one thing neither of you can do alone

Everything in the room is one of you doing something to the other, and it is always addressed: what
he did, what she did, what she will find. Both of you reaching for the same thing in the same moment
is not addressed to anybody, which is why it is the only thing in here sent to both seats.

It costs almost nothing to notice, because the last poke is already sitting in storage waiting to be
replaced. Three conditions and each has its own test: the other seat, the same thing, within three
seconds. A stranger cannot be half of it, and drumming on the plant on your own is not a moment.

## Everything on the floor goes in front of the box, and only the cat goes behind

The box's near wall is drawn after the cat, which is what puts her inside it rather than behind it.
It is 28 wide at `BOX_X = 44`, so it covers x 44-71 at floor level, and four things land in there:
the treat (68), the catnip (54), the mug she knocks off the shelf (66) and her mood props, which
ride at `kx +- 13` and so sit inside the box whenever she does.

Each one was found separately and each looked like a different bug. The widest, the mat for
"stressed", was 81 of its 84 cells behind the wall, and the room's whole point is that you can read
her mood. Knocking the mug off moved it from the shelf to underneath the box, which looks exactly
like nothing happening, and that one was reported three times.

The rule is one line now, and the layering test pins all five: floor-level things are drawn after the
near wall, and only the cat goes behind it.

Two more of the same shape, worth knowing because they are not about drawing order:

**She was sent to the box's left edge.** `BOX_X + 2` would have been right for a box a few pixels
wide. She stood with her front half out of it and the wall cutting her in two, which reads as a cat
beside a box. It is measured off the sprite now, so a box that changes size takes her with it.

**The tap target disagreed with the drawing.** The draw gate read `boxOut || box || secretBox` and
the hit test read `box || secretBox`, so a box he put out was drawn and could not be tapped. A test
checks the two gates name the same three things.

## What the camera cuts off

The room is 100 columns, the viewport is 80, and the camera follows the cat
between 0 and 20. Every prop's reachable camera range, from the sprite widths:

| prop   | x     | visible when the camera is |
| ------ | ----- | -------------------------- |
| window | 60-76 | anywhere                   |
| box    | 44-71 | anywhere                   |
| frame  | 16-36 | 0-16                       |
| bed    | 13-32 | 0-13                       |
| door   | 6-17  | 0-6                        |
| shelf  | 80-95 | 16-20                      |
| plant  | 87-96 | 17-20                      |

The door and the shelf can never be on screen together, which is inherent to a room that pans and is
not a bug. What it does mean is that knocking the mug off the shelf happens off screen unless the cat
is already on the right, so the mug appearing on the floor at x 66, which is visible at every camera
position, is the whole of what that event shows you. That is why it mattered so much that the box was
covering it.

## She goes and knocks it off

"Knock something off the shelf" was the least realised thing in the room. `shelfDown` flipped, the
mug appeared on the floor, and she never moved. Worse, the shelf is at x 80-95 and the camera only
reaches it when she is right of 56, so her one deliberate act usually happened entirely off screen and
landed as a mug quietly appearing somewhere else.

She walks over and does it now. The camera follows her, which is what brings the shelf into view, and
the mug stays on the shelf until she is under it rather than going over the instant the room says so.
There is precedent: the door already pulls the camera to itself when somebody arrives.

The trigger is a moment, never the state. Her own tap sets it; his comes off the action arriving in a
pushed view, from the same signal that already tells him she did it. It is deliberately not derived
from `shelfDown`, which is true all day and would send her walking to the shelf every time he opened
the room.

The timing is a pure function in `shelftrip.ts` rather than arithmetic inside the draw loop, because
this is the one thing in the room that cannot be checked by looking at it. `tips` takes the previous
frame's age as well as this one's, so the thump fires exactly once even if the frame rate is bad
enough to step clean over the moment.

## The draw loop has a test harness now

The room's one untestable surface was anything that moved. `canvasHarness.tsx` mounts the cat in
jsdom, replaces the 2D context with one that records, and hands the frame loop a clock a test drives
by hand. Five things had to be right, and each was found by the harness being wrong first:

**One clock.** In a browser the timestamp a frame callback receives and `performance.now` share an
origin, and the room depends on it: a moment is stamped outside the loop and compared against the
frame's `t` inside it. Two clocks make every such comparison come out hugely negative, which reads as
"not happening".

**Fake only `Date`.** `vi.useFakeTimers()` replaces `requestAnimationFrame` as well, which silently
takes the frame queue away from the harness, and nothing is painted at all.

**Record cells, not device pixels.** Every fill comes from `px`, which paints exactly one cell, so
the cell is the whole of the information. Storing device pixels is a hundred and sixty thousand
writes a frame and turns a hundred-frame test into a timeout.

**Run frames, not moments.** She eases five per cent of the way toward where she wants to be each
frame, so crossing the room takes sixty-odd of them. A test that jumps from 0ms to 2000ms in one
frame moves her five per cent and proves nothing.

**Change props mid-run.** Her position initialises to wherever she wants to be on the first frame, so
a moment already running at mount puts her at the far end of it instead of walking there. That cannot
happen in the app, where the trigger starts null, and it quietly made the first version of the shelf
test meaningless.

No camera reading. The obvious one, find a fixed prop and subtract, locks onto the outline colour,
which everything in the room shares. Assert on what a person would notice instead: how much of a
thing is on screen.

Every test in `room.draw.test.tsx` was checked by reintroducing the bug it describes. That is how the
mood one was caught being useless: the mat runs to x 72 and the box's wall stops at 71, so three cells
always show and "greater than zero" passed with her mood entirely hidden. It is 72 cells against 3
now, and the threshold sits between them.

## Why none of that was caught by looking

Every one of these was reported more than once and checked more than once, because the canvas had
never rendered anywhere it could be looked at. A hidden tab never fires `requestAnimationFrame`, and
an automated browser keeps its tabs hidden, so the canvas sat at its unsized default and every
screenshot came back black. Each change was verified by reading the state that feeds the drawing
rather than the drawing.

Forcing it to draw is possible, and worth knowing for a quick look: patch `requestAnimationFrame` to
a timer and stub `innerHeight`, both before the app boots. It renders a handful of frames and then
freezes, so it settles a question about layout and cannot answer one about motion. That is what the
harness above is for.

## The box is the one thing either of them can undo

His button puts a box out and takes it away again on a second press, except while she is sitting in
it, where it says so and does nothing. Rule one is that nothing in this room goes wrong for the cat,
and pulling the box out from under her is the smallest possible version of that.

Her button is the same shape: she gets in, and she gets back out. It was not, for a while, and that
made getting in the only act in the room with no undo. `boxDay` is a day number, so she was in the
box until her midnight however long ago she chose it, and his button stayed blocked all that time
saying "she's in it", which reads as right now and meant today.

Neither direction of undo is logged. The room shows her leaving the box, and "took the box away
again" and "got out of the box again" are not things the other one needs told.

## The pet button was not connected to the drawing

Holding on to her sets a flag in the canvas and everything hangs off it: her eyes shut, a heart rises
off her, the purr deepens. The "Pet her" button never touched that flag. It played a sound, bumped a
counter and posted the action, so tapping it changed nothing you could see, on either screen.

That is worse for petting than it would be for anything else, because petting is the one action with
no mark. There is nothing left over afterwards to notice, so if the moment itself does not draw, the
whole action is silent.

The button is a short hold now, which is what it always was. `petAt` draws it on his own cat, and the
two `doHold` calls send it to her down the same path a real hold already uses.

## Everything the room keeps lasts one of her days

`brushedDay`, `satWithDay`, `boxDay` and `boxOutDay` are day numbers in her timezone, not timers, so
everything clears at her midnight rather than a day after whenever it happened.

The two marks he leaves, the tuft and the dent, get one addition: they also stay until she has been
in and seen them. The day on its own has a hole at the end of it. These are day numbers rather than
timers, so a brush at eleven at night is gone by midnight, an hour later, while a morning one lasts
fifteen hours, and the marks exist to be found by somebody who was not there. The one left last thing
at night is exactly the one she is most likely to miss.

Whose last look counts is the fiddly half. On her own read her `lastSeen` is already now by the time
the view is built, so it has to come from the value `view` captured beforehand. Anywhere else,
including a push to his tab, her stored one is the honest answer.

A duration would have been the obvious choice and is worse. It puts the room on a different schedule
every day, so a tuft left at nine in the morning goes at nine and one left at eleven at night goes at
eleven, and she can never tell what she is looking at without knowing when it was left. A day is the
unit the room already runs on: the light crosses the floor over her day, the note turns over on her
day, and he is expected home at an hour of her day. Marks clearing with it means she opens the room to
a clean one, once, and knows what "still there" means.

Her midnight, never his and never the server's, for the same reason as everything else: the room runs
on her clock.

## A mark nobody can see is not a mark

Every fix this year made his actions reach her: a line saying what is in the room, a button that
lights up, a box that stopped covering things. None of it helped, because there was nothing legible
at the end of it. Measured against the rug they lie on:

| mark                        | before            | after                        |
| --------------------------- | ----------------- | ---------------------------- |
| tuft, from brushing her     | 5 cells at 1.43:1 | 22 cells, outlined, over 3:1 |
| dent, from sitting with her | 1.18:1            | over 3:1                     |

Three to one is the bar for a graphical object being perceptible at all. The dent was mixed 13% away
from the surface it sits on, which is another way of saying it was the surface it sits on.

The colour cannot be a constant, and neither can the direction. The floor changes all day, so a fixed
mix toward ink is legible at noon and gone at night. Worse, at dusk the floor is mid-toned and ink
cannot reach 3:1 from it at all. `legible()` tries both ends of the room's palette and takes whichever
is further from what is underneath, which clears 3:1 at every hour, worst case 3.01 in the afternoon.

The tuft also needed to be bigger. Five pixels is not a tuft at any contrast, and an outline is what
makes a small sprite read, which is why everything else in the room has one.

Sweeping every mark the same way found a third: what he leaves out for her was 1.75:1, dusty pink on
a dusty pink floor, with not one legible cell out of six. That is the feature whose buttons were
reported as doing nothing, and it turns out the last inch of it was invisible too. It takes a legible
colour now and keeps its pink highlight, so it is still obviously his and not something the cat
dragged home. The photo and her gift were already fine, at 9.02:1 and 5.59:1.

Two things the draw harness caught while this was being written, both the same mistake in different
clothes. `legible` was being handed the floor, and both marks lie on the rug, which is a different
colour: right idea, wrong surface. And the test took the highest contrast in the region, which the
dent's lit lip clears whatever the dent is doing, so it passed with the mark invisible. It counts how
many cells are legible now. The old dent scores 2 and the old tuft scores 0.

## Nothing accumulates into an inbox

The arrival card is capped and clears itself. The visit log is bounded. There is no unread count, no
history to scroll, no "3 of 14" anywhere.

Discoveries are counted but never totalled: the total is the spoiler, and it turns a room you poke at
into a list you complete. The note never sends tomorrow's text, because a gift you can skim in devtools
is not a gift.

## The room mentions at most two quiet things at once

Under the cat there can be a milestone, a welcome-back line, the full moon, her personality, or the
fact that it is already tomorrow where she is. Only two are ever shown, rarest first.

Each was written to be a rare aside. Together they are not: the date line fires every day for a
long-distance couple and the personality line is permanent once earned, so a full-moon anniversary put
eight lines of grey text under the room and pushed the rest below the fold. Same reasoning the
milestones already used: a room that celebrates every fortnight is not celebrating.

## Sounds are synthesised, not sampled

Every cue is built from oscillators and filtered noise at runtime. There are no audio files.

A 200KB sample is silent on the first visit, which is the visit where somebody decides whether they
care. A purr is not a note either: it is a roughly 25Hz amplitude modulation of a broad rumble, and it
slows when she is heavy-eyed.

## What only exists in development

`POST /api/room/:id/age` fast-forwards a room, so states that take months can be looked at in a minute.
It is gated on a `DEV_TOOLS` variable in `.dev.vars`, which `wrangler dev` reads and `wrangler deploy`
never uploads.

The first gate checked the hostname, on the reasoning that this Worker has one custom-domain route and
no workers.dev address. That does not work: `wrangler dev` rewrites the request URL to the configured
route, so the local Worker sees the production hostname exactly as production does.

Everything the route writes is a state an ordinary room reaches on its own eventually. It cannot put a
room somewhere a real one could not be.

## Two seats read different sentences about the same act

Every action carries two phrasings, not one. `past` finishes "Ada brushed the cat", which she reads.
`mine` finishes "She'll see that you brushed the cat", which he reads. Sharing one string is cheaper
and produces "you brushed you". Moods have the same problem in miniature: their text has to read
after a plural pronoun, because the sentence is "told the cat they're ___".

The general rule: the two sides of this app are never looking at the same sentence, and a string that
serves both is usually serving neither.

## Notes belong to the room, not to the app

The set of notes she gets is written by whoever made the room. Defaults exist as a floor so a new
room is never empty, but they are a floor. Shipping one hardcoded list means everybody who is not its
author hands over a gift full of somebody else's specifics.

Editing them must not cost her progress either. She is on note 14; he fixes a typo in note 2. Losing
three weeks of her year to a typo fix would be indefensible, so how far along she is and what the
notes say are stored apart.

## She never dreams about a secret you have not found

The dreams she has are drawn from what this person has actually discovered. Naming the piano tells
somebody there is a piano, and a sleeping cat is the last surface anybody would think to audit for a
leak. That is the only reason dreams are gathered and filtered rather than looked up.

The same rule is why the day's note is fetched with a server-side day index: tomorrow's words never
reach the browser at all. A gift you can skim ahead in devtools is not a gift.

## Timing that cannot be watched is written as a function of the clock

The moth visits for 18 seconds out of every 100. There is no way to confirm that by looking at the
room, and I screenshotted the wrong 18 seconds twice before admitting it. So where the moth is at
time `t` is a pure function of `t`, and a test pins it.

Anything else in the room with a cadence measured in minutes follows the same rule. If the only way
to check a behaviour is to catch it happening, it will ship broken.

## Symbols are drawn, never typed

The arrival marks are little SVG paths, not ✦ ✧ ❧. A dingbat is whatever the device's font decides it
is, and ❧ is missing from plenty of them, so a typed symbol makes the same list a different shape on
her phone than on his.

## One logical pixel is always a whole number of device pixels

This holds everywhere anything is drawn: the room canvas, the favicon, the keepsake. Half a device
pixel means two floorboards come out at different widths, and the eye catches it immediately even
though nothing looks obviously broken. It is the single most common way pixel art gets ruined, so the
scale is floored rather than fitted.

The favicon is redrawn from the room's own colours for the same reason the room is: index.html ships a
ginger cat, so without this a room with a black cat in it sits on the home screen as somebody else's
pet. And it is painted opaque, because a dark browser theme behind her dark outline eats the whole
silhouette.

## Tests never depend on when they run

Two timezones are used throughout the worker suite: `Etc/GMT+12` and `Pacific/Kiritimati`, 26 hours
apart, so their local dates always differ. The first version used New York and Tokyo, 13 hours apart,
which share a date part of the day: those tests passed in the evening and failed in the morning.

Nothing in the suite reads `.dev.vars` either. That file is gitignored, so the tests that fast-forward
a room passed here and failed on a fresh clone. A suite that depends on an untracked file lies about
whether the code works.

## Both of them can get out, through different doors

He can delete the room. She can leave it. The asymmetry is the decision, and the two symmetric
alternatives are both worse.

If only he could delete, she would have to ask another person to remove her own data, which is not a
delete path at all. If either of them could delete everything, one bad evening could erase the other's
year, and a shared gift that one person can unilaterally destroy is a worse thing to hand somebody
than one they cannot.

So: his door ends the room for both, because he made it and most of what is in it is his. Her door
takes her side out and leaves his standing. Each of them can remove everything that is theirs, and
neither can destroy what is not.

His confirmation is his own name, typed. A dialog with a red button is one mis-tap from both of their
years; a name is something a person who means it can produce and a thumb cannot. It asks for his and
not the cat's because she is the cat, and "type her name to erase her" is a different sentence. Hers
is two taps, because it costs her the same and the name to type would be her own.

## Deleting is instant, erasing waits a week

The two are separate on purpose. The room is unreachable the moment he confirms, because a delete the
other person can still see working is not a delete. But the bytes stay for a week, because the mistake
this protects against is not a typo, it is the decision itself: the deletes people regret are the ones
made at eleven at night, and they regret them in the morning, not in the following second.

Only he sees the way back, and only until the week is up. She is not told there is one. Being shown a
countdown on somebody else's decision about a room you shared is worse than being told it is gone,
and it would make the undo his to dangle.

Leaving gets the same week, with one condition his does not have. The seat is genuinely free the whole
time, because freeing it is the point of leaving, so if he hands it to somebody else her way back
closes at that moment. The screen tells her that before she decides rather than after.

He is told too: that she left, and that her side is kept until a date. Not for symmetry, and not
because her deliberation is his business, but because he is the one holding the thing that ends it.
The sentence sits directly above the button that would send the link on, since a warning after the
fact is not a warning.

And she is told he was told. The argument for keeping that from her was that it spares her the
feeling of being watched while she decides, but it does not: he can see it either way, so all the
silence buys is her not knowing what he can see. That is the version where finding out later feels
like the app took a side.

The two are one thing built twice, deliberately. Both are computed from the same conditions and both
stop at the same instant, when somebody takes the seat or the week runs out, so there is no state
where one of them is looking at something the other is not. A test asserts that pairing rather than
each half on its own, because the pairing is the promise.

I argued for leaving being immediate and was overruled, and the overrule was right: the argument was
that "leaving removes your side now" is a cleaner promise, but it is only cleaner to write. The person
it is made to gets one irreversible tap on a bad evening either way, and she is the one with less of a
claim on the room and more reason to act in a hurry.

The erasing runs off a Durable Object alarm, which is the only thing in this app that happens without
somebody visiting, and the wrangler config used to say so. It has to be an alarm: if the erasing only
happened on the next request, a room nobody ever opened again would keep everything in it forever, so
the delete would be a promise instead of a fact. The same check runs on the next request too, in case
the alarm never fired.

## A deleted room keeps one bit, and a test hunts for the method that forgets

Wiping storage is not enough. A room with fewer than two people in it seats whoever turns up, so the
next person to open a dead link would quietly become the maker of a brand new room at the same
address, and she would find a stranger sitting in it. So a deleted room keeps exactly one key, the
date it went, and every method refuses on it.

"Every method" is the hard part, and it is enforced by a test that walks the Durable Object's own
prototype rather than by remembering. Adding any method fails that test until its name is classified
as internal or as a route can reach it, which is the moment to decide whether a dead room may be
reached through it.

Leaving needed the same kind of thinking one level down. The first version freed her seat and was
undone by her own next page load, because the free seat she had just vacated was hers for the taking
again. Leaving now bars that browser's token. Him freeing her seat does not, because that button
exists precisely so the right person can take a seat back.

## The worker tests are split across files on purpose

Cost per request grows with how many requests the worker process has already served. Measured inside
a single room, with no new Durable Objects at all: sixty reads cost 76ms at the start of a file and
3402ms once four hundred requests had gone before them. A suite in one file is quadratic in its own
length, and this one had reached two minutes.

Each test file gets its own worker and its own counter, and files run at the same time. Splitting the
same 213 tests across six files took the suite from 123 seconds to about four. Nothing else changed:
same tests, same assertions.

I got this wrong first. The original diagnosis was that the cost came from the number of Durable
Objects left alive, because reads slowed down as rooms accumulated. That experiment created fifty
rooms with fifty requests between each measurement, so it could not tell rooms and requests apart.
The fix that followed from it, reusing one room id for the whole suite, made no difference at all:
123.5 seconds before, 123.5 after. Holding the room fixed and varying only the request count is what
showed which one it was.

The one-room-per-file part survived anyway, because it is the right shape once files are split, but
it was not the thing that mattered. Do not merge these files back together.

Speeding it up did surface a flake it had been hiding. "What arrived since your last visit" is
`at > since`, both sides from `Date.now()`, and a test that reads the room, acts, and reads again
inside one millisecond correctly gets nothing. Two people cannot do that over a network. This suite
could, once round trips went from about 200ms to about 5, and it started failing about one run in
eight. Two other tests already carried a bare 2ms sleep with no explanation of what it was waiting
for, which is what an undiagnosed version of this looks like. All three now call `tick()`, which says
why in one place.

## The ending screens are pure components, so they can be tested

There is no jsdom in the web package and no testing library, so React tests here render to static
markup, the same way the auth app's do. That only works on a component that is a function of its
props, which the delete and leave screens were not: they read three pieces of App state and called
handlers closed over more.

Pulling them into `screens.tsx` was the price of testing them, and it is worth paying for these in
particular. Each one has two versions and picking the wrong one is the whole failure mode: telling
her a room is gone while he can still put it back, or offering her a seat somebody else is sitting
in. Those are one falsy prop apart, and neither is visible in a screenshot of the version that
happens to be right.

The tests were checked by breaking the component on purpose (dropping the seat gate, always claiming
he was told, forcing the undo branch, cutting the warning about giving the seat away, swapping the
two handlers on her card) and confirming each one turned a test red. A test that cannot fail is worse
than no test, because it reads like coverage.

Clicks need a DOM, so `screens.click.test.tsx` asks for jsdom in a comment at the top of the file
rather than in the config. It is the only file in the package that needs one, and putting it in the
config would make every other test in the package pay for it. What clicks buy over static markup is
the wiring: "Put my side back" and "start fresh instead" sit next to each other, take the same shape
of callback, and one restores her year while the other throws it away. Swapping them changes no
markup and no screenshot.

## A label has to name the question, not one of the answers

This app has now hidden three features inside things labelled as something else, twice in the same
block of code:

- the recovery code lived inside "change how she looks", so the one string that recovers a seat sat
  behind a button labelled as a cosmetic editor
- signing in lived inside "show my recovery code", where nobody looking for an account would open it
- the notes, which are the whole point of the room, lived inside "change how she looks, or her hours"

Every one of them was in the DOM the whole time, so no test would have caught any of it, and my own
browser checks found them by querying for them by name rather than by looking at the screen. The one
that surfaced it was a person opening the app and asking where accounts had gone.

The rule that would have prevented all three: a disclosure is named after the question somebody
arrives with, never after the first thing that happens to be inside it. "Change how she looks" covers
exactly one of the four things behind it.

The test is not whether the label is accurate. All three were accurate. It is whether somebody who
does not already know the feature exists would open that label to look for it.

Relabelling was not enough for the account, though, and that is the second lesson. "Getting back in
on a new phone" is an honest name for a panel holding both a code and a sign-in, and signing in was
still two scrolls and a disclosure away from anybody who had not decided to go looking. So it came
out of the panel altogether: the sentence and the button sit in the room, and the disclosure below
them is now just "or keep a code instead". A code is a long string you fetch when you need it, which
is what a disclosure is for. A decision somebody has to know they can make is not.

Still nowhere near the front door. That part of the original reasoning holds: she taps a link and she
is in, and signing in is something you decide afterwards, or never.

## She gets one thing in the room that is hers

He sets the cat, the hours, the notes, and the day the room remembers, and he has all five actions.
She taps a mood from six and leaves one line. That asymmetry is right for a gift, and it still left
the person the gift is for with nothing of her own in the room. A room you cannot put anything into
is somebody else's room.

So: the blanket on her bed. Five colours and a stripe, hers alone, enforced in the Durable Object
like every other rule about who may write what. Deliberately one small object rather than a second
editor beside his, and deliberately the bed: she is the cat, so the thing she decides is where the
cat sleeps and what it sleeps under.

It stays when she leaves, unlike her moods. What leaving promises her is "your moods, your visits,
the days you have been in here", and a colour on a bed is none of those. It is furniture, not a
record of her.

The stripe columns are written down by hand rather than stepped by a loop. The cushion runs from
column 3 to 16, so an even step leaves a half-width gap at one end, and on a bed that is symmetrical
the eye reads that as a mistake rather than a pattern.

## The window shows her actual weather

The room already knows her timezone, because the light in it follows her day. That is enough to know
whether it is raining on her, so the window shows it: streaks on the glass, flakes drifting past, or
the panes going flat under cloud. He looks at the room and knows what her afternoon is like without
asking, which is the job the mood buttons do and the reason the room does it rather than saying it.

Nothing new is stored about her and nothing about her is sent anywhere. The request carries a
latitude and longitude for the middle of a timezone, identical for every room that picked it, to a
keyless public forecast. Zones the table does not name fall back to the longitude their own offset
implies, right to about a timezone's width; the latitude is a guess, so at worst the window shows a
plausible sky rather than hers.

Three things this needed that were not obvious:

**It goes out behind the response.** A room load must never wait on a forecast, so the lookup runs in
`waitUntil` and the read serves whatever the window last knew. The stamp is written before the
request, not after, so a service that is down is asked every half hour instead of on every read. And
the late write checks the tombstone again, because it lands in a later turn than the read that
started it, and a room deleted in between would have had a key put back into storage that erasing had
just taken out.

**Changing her timezone clears it.** He opens the room before he picks her timezone, so the first
lookup is always for the default. Without clearing, the window shows another city's sky for half an
hour, on the one path every room takes. Found by watching a room set to London report New York's
cloud.

**A closed sky reaches the beam.** Rain running down the glass with a full shaft of sun across the
floor reads as a bug even to somebody who could not say why. The beam is softened, never removed:
cloud still lets light through, and taking it away would cost the room its warmth for a week of bad
weather.

The endpoint is a binding rather than a constant so the tests can point it at a port that refuses.
Left as a constant, the suite called a stranger's public API a few hundred times a run, and one
assertion quietly depended on whether it happened to be cloudy in New York.

## The weather reaches the cat, not just the glass

Putting the sky in the window created a room that contradicted itself. She spends the daylight hours
following the sunbeam across the floor, which is lovely and a nonsense on a wet Tuesday: the beam had
been drawn faint precisely because the sky is closed, and she was lying in a patch of light that was
not there. The copy under the room said it out loud, too, over an empty floor: "moving with the
sunbeam, one patch at a time".

So rain and snow are worth going to look at, and she does. Cloud is not, so she gives up on the sun
and goes to her own spot. Three of the hourly lines have sunless versions now, written per hour
rather than replaced by one generic sentence, because the hours are hand-authored and a catch-all
would flatten them.

The weather loses to everything else with an opinion: being asleep, waiting at the door, and doing
what you told her all outrank it. It is the least important thing in the room, and the ordering says
so.

## One secret that cannot be found alone

There were fourteen discoveries and every one was solo, while the only mechanic in the app that needs
two people, both of you being in the room at once, was spent entirely on the cat crossing to the
middle to purr.

Sitting with her long enough already earns a purr. Doing it while the other one is also here gets her
all the way over on her side, paws up, which is the thing a cat does when it has decided nothing in
the room is a problem. Set deeper than the purr so it is not the first thing that happens.

Gated in the Durable Object, not the browser, because the browser is exactly where somebody who
wanted to tick it off alone would go. `bothHereNow` in the view and the check on the discovery run
through one helper, so what she is told is happening and what the room will accept cannot drift.

The pose is a new hand-authored grid, and the art tests caught two things about it that a screenshot
would not have: the eyes and highlights have to sit in the same columns in every pose, so the head is
the loaf's head unchanged, and the pose list is asserted by name so a new one has to be acknowledged
rather than appearing. The first attempt was belly-up with the head flat and it read as a dead cat;
the second was a long loaf, because without paws in the air nothing says rolled over.

## The cat learns when he actually gets in

He tells the room "usually home around six" once, when he makes it, and then never again. Life moves;
the hour he typed does not. So the room watches the first time he looks in each day, works out the
real hour, and after a fortnight of disagreeing with him by more than half an hour the cat starts
waiting at the door then instead.

The thresholds are the decision. One sample a day, so an evening spent opening the room twenty times
counts once. A fortnight before it says anything, because a cat that starts waiting at the wrong time
on three data points is worse than a cat that waits when she was told to. Half an hour of drift before
it counts, because twenty past six is the same time of day and not worth a sentence. And the mean is
capped at a fortnight of memory rather than being cumulative, so a change of job moves her instead of
being outvoted by the first month forever.

It watches him and not her. She is the cat, and the cat does not wait at the door for herself.

The line telling him goes to him alone and sits low in the quiet lines, under the moon and the
anniversary. To her it would read as the room reporting on somebody.

The dev ageing tool grew a `homingHour` for this, because otherwise nobody could see the feature for
two weeks, and it stamps today's date on what it writes so the read that comes back with the answer
does not immediately count itself as another day and drag the average toward whatever o'clock it is.

## Either of them can take the room away with them

The room was the only copy of any of this, and the privacy policy's answer to "can I have it" was an
email address. That is a fine promise and a bad feature, so `GET /export` now hands back everything
the room holds as one file.

It is gated exactly like the view, and one rule carries over that mattered more than the rest: her
copy stops at the note she has actually read. Tomorrow's words never reach her browser, and an export
is a browser with a filename on it. It would also have been the easiest leak in the app to miss,
because nobody looks at a download twice.

Offered out in the room rather than inside the delete panel. Putting it there would have been neat,
since taking a copy matters most just before you end something, but somebody who simply wants their
own words back should not have to open a disclosure labelled "delete this room" to find them.

## The room's admin is one block with three weights

Eight quiet links accumulated at the bottom of the room, one commit at a time, each reasonable on its
own. Measured together they were all 12px transparent text in a single column, so "draw something for
the frame" carried exactly the weight of "she can't get in" and of "delete this room", and the account
button sat seven thousand pixels down the page looking like everything around it.

The fix is a rule and a heading. Above it: the things you do. Below it, under "this room": everything
about the room rather than about her. Inside that block, three weights rather than one.

- **The way back in is a button**, and it comes first. It is what most people open this block for, and
  it was the thing nobody could find twice over: first buried in a disclosure named after the recovery
  code, then visible but indistinguishable.
- **Resending the link and freeing her seat stay quiet.** Each matters on one day.
- **Ending the room is set apart**, dashed and at the bottom. Not red: this is a quiet app and a red
  button in it would be shouting. But it is not a peer of resending a link and must not read as one.

The export moved in here too, into the delete panel, phrased as "take a copy first". A file of JSON is
no use to anybody on an ordinary evening and every use in the ten seconds before you end something.

Rubbing out a drawing was one of the five inks, so clearing a full sheet meant thirty-five taps with
the eraser selected. Nobody does that; they give up and hang up the mess. There is a "start over" now.
No stamps, though: the sheet is thirty-five pixels, so any pre-made shape fills most of it and the
frame stops being a note somebody drew badly, which is the whole of its charm.

## The drawing sheet grew, and the frame grew with it

It was seven by five, which was the size of the hole in the picture frame that had hung on that wall
since before anybody could draw in it. Thirty-five pixels is enough for a face and nothing else, and
in use that turned out to be past charming and into fiddly. So the sheet is eleven by seven now, and
the frame was redrawn around it rather than the other way round: the sheet is painted into the hole
one pixel to one room pixel, so the frame is the constraint and the only way to a bigger drawing is a
bigger frame.

All three frames had to be redrawn, not one: the empty one, the fish, and the photo of the cat.

The part that mattered is that drawings are hanging in real rooms right now. Growing the grid without
widening them would have blanked somebody's frame, which is the sort of thing that is nobody's fault
and unforgivable anyway. Old drawings are centred in the bigger sheet on the way out, and the room
refuses a seven-by-five as a new one.

It grew again straight afterwards, to fifteen by nine, because eleven by seven was still smaller than
it looked on paper. That second jump is why the widening is written against a list of every past size
rather than against one previous one: a room nobody has opened in a year holds whatever it held, and
a size never leaves that list.

The tripwire in `doodle.test.ts` did its job both times: it asserts the exact cell count specifically
so that changing the grid fails and reminds somebody to change the worker's regex too. It also caught
a second thing on the first pass, a test using row 5 as off-grid, which stopped being off-grid.

## An error belongs beside the thing that failed

Clicking "keep this seat on my account" when that account already holds the other seat is refused by
the room, correctly, with a 409. The message then appeared in the shared error line near the top of
the page, while the button that failed sits near the bottom of a very long room. You tapped, nothing
appeared to happen, and the reason was scrolled out of sight above you.

The same mistake had already been fixed once, in the recovery panel, with the same reasoning written
next to it. A shared error banner is fine in a short page and a trap in a long one.

Looking for more of it turned up that the account button was not the only one. One `err` is shared by
hanging up a drawing, freeing her seat, resending the link, leaving and deleting, and the room is more
than twice a phone screen tall. Measured: a failed drawing save put its reason at 1185px with a 720px
viewport at the top of the page, so you tapped "hang it up", nothing happened, and the explanation was
off screen the entire time.

So the shared line is pinned to the bottom of the screen now. The app otherwise refuses to speak over
the room, and this is the one exception worth making: a failure is the thing you need to see wherever
you happen to be standing.

## A dead connection speaks in the app's voice

Eighteen actions called `fetch` directly, so a train tunnel gave the room "Failed to fetch" or "Load
failed" in a panel that otherwise talks like a person. Only `fetchRoom` had ever handled it. They all
go through one `send` now, which turns a refused connection into "That didn't reach the room. Try it
again." It took ninety lines out of the file as a side effect.

## Numbers written down are numbers that go wrong

Most of the damage in this codebase has been one bug wearing different clothes: an offset that was
right for the sprite as it was, left behind after the sprite changed.

It put the eye highlight that follows your pointer on her muzzle in a loaf, on her blush standing, and
on the dark of her eye sitting and playing. It opened `perk`'s nose instead of her mouth every time she
yawned, because that one pose has its face a row lower and the yawn used one row for everybody. It
aimed her glance four pixels off the picture she was looking at, once the frame grew. Every one of
these was live for a long time, and every one is invisible unless you already know to look.

So the painted-on details live in `overlays.ts` and `overlays.test.ts` holds each of them against the
grid it lands on, for every pose. Where the sprite already knows the answer, the code reads it: the
face's row comes from where the nose is, and the eye highlights come from the `h` cells that are
already in the drawing. A pose added tomorrow gets both for free.

What is still written by hand is what cannot be measured: timings, colours, and whether her eyes track
at all. Those are judgement, not geometry.

## A comment that was not a comment

Two blocks of prose were rendering on the page as text, under the room and inside the account block.
They were written as `//` lines, which is a comment almost everywhere in a `.tsx` file except the one
place they sat: between JSX children, where `//` is just characters. React printed them.

They had also been cut in half. An earlier comment pass rewrapped the lines and left `//` markers
stranded mid-sentence, so the page showed "hanging a drawing // to freeing her seat". Nothing failed:
not the type checker, not the linter, not four hundred tests. Only reading the page catches this.

JSX comments are `{/* */}` and nothing else. The check that finds these is to look at the rendered
text for `//`, which is now the last step after any pass that touches comments in a component.

## Who mrrp thinks you are

Opening a room link on a phone that had ever used mrrp went straight in under the name that phone
remembered. No prompt. It reads like a cookie or a stale sign-in and it is neither: the name lives in
`localStorage` under one key for the whole app, and the room seats whoever asks, with `"Someone"` as
the fallback when no name is sent.

For real use that is right. If she has used mrrp before, her phone should not interrogate her again.
It only goes wrong when one person drives both seats, which is testing. But there was no way to say
"not me", and the fix for that was worse than the bug: forgetting the device token orphans the seat,
leaving a person in the room who can never come back, and there is no rename because a name is
written once when you sit down and never again.

So the ask comes back whenever this browser has not been in this particular room before, with the
remembered name filled in, so the ordinary case is one tap rather than typing. The signal is
`mrrp:cat:<id>`, written on every successful load, plus a mark set when you make a room, because
making one navigates before anything has loaded. `lastRoom` looks like the obvious signal and is not:
`App` writes it for whatever id is in the path, including a link you have never opened.

Because `mrrp:cat:<id>` was already being written long before this, nobody currently in a room is
asked their name again when this ships.

## The sign-in row asks this Worker, not the auth service

The account block could say whether the seat was linked, but not whether you were signed in, so
signed-in-and-unlinked looked the same as signed out. The obvious place for the answer was `RoomView`,
which already carries `linked`. It is the wrong place: `build` is called from about a dozen action
paths that never receive the account, so the flag would have been right on load and wrong after every
pet, note and mood change.

It is one endpoint on mrrp's own Worker instead, with one caller and one meaning. Same-origin, because
the session cookie is scoped to the parent domain and only a Worker may forward it. It answers "signed
out" rather than failing when auth cannot be reached, which is a state the whole app already works in.

## What the comments are for

Every explanation of a decision belongs in this file. The comments left in the code are for three
things only:

- a trap that has actually bitten somebody, like a paw print drawn at `y` instead of `ky`, which
  breathes with her
- a rule that fails silently, like the seat checks in the Durable Object, or her copy of the notes
  stopping at the one she has read
- why not the obvious thing, where somebody would reasonably try the obvious thing and quietly break
  something

Everything else is deleted. The comment load has been cut five times now: 3124 lines to 564, then
1381 back to 462, then to 391, then 630 back to 401, and most recently 879 back to 689. Every time
the growth arrives the same way: a feature lands with a paragraph explaining why, which is a good
paragraph in the wrong file. This one is that file.

Two repeat offenders. A comment that narrates what the code used to do costs the reader attention
and returns nothing, because they have no access to the old version, and it rots on the next edit.
And a docstring that restates the name below it: `/** Held on, or let go. */` above `hold()`.

# Why mrrp is built this way

The README says what the app does. This says why it is built the way it is, in the places where the
obvious choice was the wrong one. If you are about to "fix" something in here, check whether it is
already on this list.

Written plainly on purpose. Every entry is a decision somebody could reasonably disagree with, so each
one says what was tried and what went wrong.

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

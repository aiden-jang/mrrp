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

That promise went untested for a long time, which is the worst shape for a promise: the account tests
all handed the room an account id directly, so every one of them started a step after the question
"who is this". The seam now has its own tests, and they check the outage by pointing AUTH_URL at a
port that refuses instantly. They were verified by deleting the `catch` in `accountOf` and confirming
all three go red, because a test for a swallowed error passes just as happily when nothing is thrown.

What is still untested is a real session: that needs a cookie, which needs a login, which needs a
person.

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

His confirmation is the cat's name, typed. A dialog with a red button is one mis-tap from both of
their years; a name is something a person who means it can produce and a thumb cannot. Hers is two
taps, because it costs her the same and she has no name to type.

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

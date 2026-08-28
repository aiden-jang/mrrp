# mrrp

One of you is the cat. One private link, two seats, and no account needed.

You tell the cat how you are. It answers, and the other person finds out.

```bash
pnpm install
pnpm dev:worker   # the API, on :8787
pnpm dev:web      # Vite on :30005, proxying /api to the Worker
```

That pair is the loop you want while building: Vite gives you hot reload, and the proxy means the
browser talks to one origin the way production does.

In production the Worker serves the built assets itself, so if you run the Worker alone you are
looking at the last `pnpm --filter @mrrp/web build` rather than your working tree.

### Looking at an old room

Most of what this app does happens on a scale you cannot sit through: her personality takes weeks,
the boards do not fade for a year, and the worn patch on the rug waits for both. Fast-forward a room
instead.

```bash
cp packages/worker/.dev.vars.example packages/worker/.dev.vars   # untracked, and the whole gate
curl -X POST localhost:8787/api/room/<id>/age \
  -H 'content-type: application/json' \
  -d '{"me":"<your token>","days":400,"tally":{"pet":120,"sit":22},"noteIdx":29}'
```

`me` is the `mrrp:me` value in that browser's localStorage, and you have to hold a seat in the room.
`days` moves the room's age, `tally` gives her a personality, `noteIdx` jumps her through the notes,
and `awayHours` moves _your own_ last visit, which is what "coming back" is measured from and the one
thing `days` cannot reach. That value is spent by the read that reports it, so the next request after
an `awayHours` call is the only one that sees it.
Without `.dev.vars` the route is a 404, which is why it is safe to have deployed: `wrangler deploy`
never uploads that file.

Everything it writes is a state an ordinary room reaches on its own eventually. Nothing here can put
a room somewhere a real one could not be.

## The four rules

These are design constraints, not preferences. Each one is load-bearing.

**1. Nothing can go wrong for the cat.** No hunger, no sadness, no streak, no decay. The moment
a shared pet can be neglected it becomes a chore, and a chore is the opposite of a gift.

**2. The cat never mirrors a low mood, it answers it.** Sad brings her over and she stays.
Stressed and she sits on you and won't move. A cat that gets sad when you're sad is a cat you
protect by lying to, so on the days it matters you'd tap "good" and the feature would be dead.
Low moods make the room _warmer and closer_, never darker. See `packages/web/src/moods.ts`.

**3. You only ever see what the other person did.** Your own actions are never echoed back at
you, because that's just a log. And the room only says somebody _came in_ after you spoke,
never that they saw it, because "they saw it and did nothing" is worse to know than nothing.

**4. The room does things; the app doesn't announce them.** A banner reading "you're both here"
is the app telling you something. The door swinging as someone arrives, and the cat getting up and
crossing to the middle to purr when both seats are live, is the room doing it. Presence you watch
her notice beats presence you're informed of, so anything worth saying gets built into the scene
first and written in text only if it still needs saying.

Design decisions, and the ones that were tried and reverted, are in
[`DECISIONS.md`](DECISIONS.md). The art direction is in [`ART.md`](ART.md).

## Reading the code

The reasoning lives in [`DECISIONS.md`](DECISIONS.md), not in the source. Comments in the code are
kept for three things only:

- a trap that has actually bitten somebody, like the whole-pixel rule or the two gain stages in
  `sound.ts` where one node would let the LFO and the envelope fight over the same parameter
- a rule that fails silently when broken, like the seat checks in the Durable Object or the spoiler
  filter in `dreams.ts`
- why not the obvious alternative, where a reader would reasonably try the obvious thing and quietly
  break something

Everything else was moved to `DECISIONS.md` or deleted. If you are wondering why something is shaped
the way it is and the code does not say, that is deliberate: it is in the doc.

## Where things are

| file                  | what                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `worker/src/room.ts`  | the Durable Object. One per room, two seats, one alarm, no sockets    |
| `worker/src/notes.ts` | the default notes, used until a room writes its own                   |
| `web/src/sprites.ts`  | the cat, hand-authored pixel grids                                    |
| `web/src/Cat.tsx`     | the room, drawn one aligned rectangle per logical pixel               |
| `web/src/hours.ts`    | her clock: light, palette, where she lies, keyframed by hand          |
| `web/src/moods.ts`    | what the cat does about what you told it                              |
| `web/src/doodle.ts`   | the seven-by-five sheet either of you can hang in the frame           |
| `web/src/screens.tsx` | the screens for a room that is ending, kept pure so they are testable |

## Before you send it

**Write the notes.** In the app, not in the source. Open the setup panel and there is a box for them,
one per line. The thirty it ships with are generic on purpose so a new room is never a blank page, but
they are a floor: a note written by someone else is not a gift from you, and that difference is the
whole app. Editing them no longer needs a deploy.

**Dress the cat.** Same panel. She defaults to a ginger tabby called Bean; point her at a cat somebody
actually knows and set whose day the room runs on. Her eyes are held open while the panel is up, because
shut eyes are drawn as a line in the outline colour and you cannot pick a colour you cannot see.

**Optionally, name a day.** Also that panel: a date and a few words for what it is. The room says your
words back on that day every year. Only the month and day are kept, because storing the year would let
the room say "three years since", and that is a counter rather than a greeting.

Then open the link yourself first, and send it. **Whoever opens it second is the one the cat is.**

The same thing over HTTP, if you'd rather. `me` must be the seat that made the room, because only he
may dress the cat, set her hours or write the notes. Without it you get a 403:

```bash
curl -X POST localhost:8787/api/room/<id>/dress \
  -H 'content-type: application/json' \
  -d '{"me":"<his-token>","name":"...","fur":"#e8963f","furDk":"#c9752a","belly":"#fbf0dd","eyes":"#7cb342","tabby":true}'

curl -X POST localhost:8787/api/room/<id>/notes \
  -H 'content-type: application/json' \
  -d '{"me":"<his-token>","notes":["day one","day two"]}'
```

`tz` on `/clock` is validated at the edge on purpose: an unchecked zone string reaches
`Intl.DateTimeFormat` inside the Durable Object and takes the whole room down with it.

## Notes on the art

Everything renders on a fixed 100x80 grid, one logical pixel per aligned rectangle. There is no
offscreen buffer and no upscaling, because resampling a small canvas leaves you with pixels of two
different sizes and it reads as a mistake rather than a style.

Light is **extra palette entries** (`litWall`, `litFloor`, `patch`), not translucent layers.
Glazing alpha over dithered bands is what produced vertical streaks the first time.

**One logical pixel is a whole number of device pixels.** The draw helpers snap each cell to the
device grid, so nothing blurs, but a fractional cell size makes consecutive cells round to different
widths: at 8.425 the floorboards come out 8 and 9 device pixels wide alternating, which is the exact
thing the rule above forbids. The canvas takes the largest whole-pixel size that fits and hands the
remainder back as margin, so it is usually a little narrower than its column. It is also bounded by
the height of the window, because the room is square and a short wide screen would otherwise push
everything else below the fold.

**The cat is lit by the room.** Her fur carries toward the beam by how much of her stands in the
floor pool, with one pixel of the window's light down the edge the shaft arrives from, and her
shadow takes the floor's colour and leans with the light. Keep the fur mix low: she has to stay the
highest-contrast object in the room, and mixing a ginger cat far toward a near-white beam turns her
into part of the wall.

**Every pose is bounded by its own reach.** `kx` is her anchor, not her left edge: each pose carries
a negative `ox`, and `STRETCH` is not centred at all, so she reaches 17 columns right of kx and only
10 left. The bounds come from the sprites, so a new pose cannot walk her through a wall.

`dither()` takes an optional `phase`. Do not pass `y` to it: the parity becomes `x + 2y`, which
depends on `x` alone, and your checkerboard silently becomes vertical stripes.

**The interface goes dark when the room does**, rather than crossfading. Blending a light panel into
a dark one drags it through mid grey, where neither dark nor light text clears 4.5:1 against it, so
the chrome is two palettes and the text polarity flips with the surfaces at a single point. Checked
across all 24 keyframe hours: the worst ratio anywhere is 4.54.

The typeface is **self-hosted Quicksand**, first in the stack ahead of the Apple rounded faces. The
stack named it for a long time and never loaded it, so it only ever resolved in Safari and everywhere
else a cat app rendered in Roboto. This app is two people looking at the same thing, so it is worth
28KB for them to see the same one.

The coordinate tables carry `// prettier-ignore`: the star fields, the light pool, the moon rows, the
palette keyframes in `hours.ts`, the mood faces in `faces.tsx`. Those are grids you read by column,
and one entry per line destroys the thing they exist to show. Everything else is Prettier's, checked
in CI, at 110 columns to match how the code was already written.

## Seats

A room has exactly two seats, assigned by arrival order and never reassigned. He makes the room,
so he is first. **Whoever opens the link second is the one the cat is.** Everyone after that can
look, but holds no seat.

That last part is enforced, not assumed. A third person with the link gets no note, no "you're
both in here", and a 403 on anything that writes. All of it lives in the Durable Object rather
than the UI, because a rule enforced in the browser is a rule anyone can turn off.

| endpoint                      | who         | notes                                                          |
| ----------------------------- | ----------- | -------------------------------------------------------------- |
| `GET /api/room/:id`           | anyone      | seats the first two callers. Only her read advances the note   |
| `POST .../tell`               | her only    | her mood, one of six                                           |
| `POST .../say`                | her only    | one line back, 140 chars, empty clears it                      |
| `POST .../act`                | him only    | pet, brush, bring, sit, photo. Four of the five leave a mark   |
| `POST .../shelf`              | either seat | puts the mug back. The one write both of them may make         |
| `POST .../dress`, `.../clock` | him only    | 403 otherwise                                                  |
| `POST .../notes`              | him only    | this room's notes, one per entry; empty restores the defaults  |
| `POST .../window-light`       | either seat | leave one glint in the window, or collect the other person's   |
| `POST .../release`            | him only    | frees her seat so a new device can be her                      |
| `POST .../recover`            | his code    | takes the first seat back on a new device                      |
| `POST .../delete`             | him only    | ends the room for both. Needs the cat's name typed, not a flag |
| `POST .../undelete`           | him only    | puts it back, for a week. 403 after that                       |
| `POST .../leave`              | her only    | takes her side out and frees her seat. His room stands         |
| `POST .../unleave`            | her only    | puts her side back, while the week holds and the seat is free  |
| `POST .../draw`               | either seat | the seven-by-five sheet in the frame. 35 chars of 0-4, or 400  |
| `POST .../ourday`             | him only    | the date the room says something about, and its words          |
| `POST .../link`               | either seat | ties the seat you hold to the account you are signed into      |
| `POST .../found`              | either seat | records a discovery. Unknown keys are a 400, not a new secret  |
| `POST .../age`                | either seat | dev only, gated on DEV_TOOLS. Fast-forwards months             |

### What his actions leave behind

Four of the five things he can do put something in the room, and all of them last **her** local day
and no longer, like the notes. Nothing in here may pile up on her.

| action | what she finds                                               |
| ------ | ------------------------------------------------------------ |
| photo  | the picture on the wall, which is the one permanent one      |
| bring  | a box one time in three, a small bow on her bed the rest     |
| brush  | a tuft of her on the rug                                     |
| sit    | the dent he left beside her bed                              |
| pet    | nothing to find, but the purr deepens the longer he holds on |

Before this, `bring` left nothing two times in three and `brush` and `sit` left nothing at all: he
pressed a button, she was told he had done something, and the room was exactly as it had been. A
present that does not exist is a worse gesture than no present.

Two more things only time can do, and neither can go backwards: the boards where the midday sun
rests go pale over a year, and the plant puts out new fronds at three months and again at eight.

### Ending it

Both of them can get out, and the two doors are deliberately different sizes.

**He can delete the room**, because he made it and most of what is in it is his: the notes, the cat,
the day he asked it to remember. It goes for both of them immediately. The confirmation is the cat's
name, typed. A dialog with a red button in it is one mis-tap away from both of their years, and the
name is the one thing a person who means it can produce and a stray thumb cannot.

Deleted and erased are two different things, a week apart. The room is unreachable from the moment he
confirms, to both of them; the week only decides how long it is still possible to change his mind. He
gets a screen with the date on it and a button that puts everything back exactly as it was. She is not
offered a way back, because she does not have one, and dangling one in front of her would be worse
than the plain fact.

The erasing is the one thing in this app that happens without somebody visiting. It runs off a Durable
Object alarm, with the same check repeated on the next request in case the alarm never fired. A delete
that only completes if one of them comes back is a promise rather than a fact, and so is a week of her
data in a room nobody opens again. One alarm serves both deadlines: whichever is sooner wins, and it
reschedules itself for the other.

**She can leave**, which takes her side with her and leaves his room standing: her moods, her visits,
the days she has been in here. Her seat goes back to empty, so he can send the link on. She gets a
door of her own rather than a share of his because the alternatives are both worse. If only he could
delete, she would have to ask someone else to remove her own data. If she could delete the whole room,
one bad evening could erase his year.

She gets the same week he does, with one condition his does not have: the seat is genuinely free the
whole time, because that is the point of leaving. If he hands it to somebody else, her way back closes
that moment, and the screen says so before she decides. His side is told the same thing, right above
the button that would do it, because he is the one who can close it and he cannot weigh that if he
thinks the seat was never filled. Her side is told that he was told. The two flags open and close
under identical conditions, so neither of them is ever looking at something the other one is not. What she left is kept in one record and put
back exactly as it was, including the `firstSeen` that decides she is the second seat and therefore
the cat.

Leaving bars that browser's token from being seated again. Without that, her own next page load walks
back through the free seat and undoes the thing she just did, which was the first bug this feature had.
She can also start over on a fresh token instead of restoring, from the same screen. Him freeing her
seat does **not** bar the token and keeps nothing back, because that button exists so the right person
can take a seat back, and whoever held it is not returning to that browser.

Once erased, a room keeps exactly one thing: the date it went. Wiping the storage outright is not enough,
because a room with fewer than two people in it seats whoever turns up, so the next person to open a
dead link would quietly become the maker of a brand new room at the same address. Every route answers
410 afterwards, and a test walks the Durable Object's own method list to make sure a new one cannot be
added that forgets.

### When she loses her phone

A seat is a random token in `localStorage`. That is what makes this frictionless (no account, no
password, no email) and it is also the one thing that can go permanently wrong: clearing Safari's
data or moving to a new phone loses the seat, and with exactly two seats, a lost one would leave the
room stuck with nobody able to be the cat.

A seat can be lost, so there are three ways back. None of them is at the front door, and none ever
will be: she taps a link and she is in a room with a cat, and that is the whole gesture.

**A recovery code, one per seat.** The room mints one on first use and shows it to that seat and
nobody else. Paste it into any browser and the seat is yours again, and so is what was stored against
it: her mood, the log of what he did for her, and her half of the collar. One box takes either code
and the room works out which seat is being claimed, because the codes are distinct random strings and
asking somebody which seat they hold is asking a question they should not have to think about.

The code is stored in plaintext deliberately. Its entire power is "become this seat of this room", and
anyone who can read that storage already has the room, the notes and both names, so hashing would buy
nothing and cost the ability to look it up again from a device you still have. Ambiguous characters are
left out so it survives being read aloud.

**Optional sign-in.** Tie a seat to an account on `accounts.aidenjang.com` and signing in on a new
phone hands the seat's token back, with no code to keep. One account holds at most one seat per room,
and as many rooms as it likes. Untying leaves the seat exactly where it is. Signing in never replaces
the token; it only delivers the one that already holds your seat, which is why accounts touch a single
method in the Durable Object instead of all of them.

**He can free her seat,** under **"{her} can't get in"**, for the case neither code nor account
covers: a browser that is not hers is holding it, which a private window opened to look at the room
will do. Whoever opens the link next becomes the cat. What deliberately survives a handover: how far
into the notes she has read, the line she left him, and what she had noticed, so the collar stays on
the cat. Her mood resets, which is correct, because a mood is how you are now and the new device will
be asked.

Two things the note deliberately does not do: it never sends tomorrow's text (she could read
ahead in devtools, and a gift you can skim is not a gift), and it advances at most once per her
local day, so a day she doesn't visit is not a note she never sees.

## Tests

```bash
pnpm check       # typecheck, lint, then 395 tests: 182 web, 213 worker
```

`lint` exists for one rule. owewell shipped a `useEffect` below a component's early returns, so the
first render ran one fewer hook than the next one, and React error #310 took out every group page the
instant its data arrived. Typecheck, build and the entire test suite were green throughout. Only a
static rule sees that, so `react-hooks/rules-of-hooks` is an error here and CI runs it before deploying.

The worker suite runs in real workerd via `@cloudflare/vitest-pool-workers`, so Durable Object
storage and the seat rules are exercised as they actually behave rather than against a mock. It is
split across six files, each with its own room, because a worker gets slower the more requests it has
served and one big file is therefore quadratic in its own length. That split is what takes this suite
from two minutes to four seconds; `test/harness.ts` has the measurements.

Anything that is only true for a fraction of the time is tested numerically, never by looking.
The moth visits for 18 seconds out of every 100; two attempts at screenshotting it missed both
times, so `mothAt` is a pure function of `t` with its own tests. Same reasoning for the note
rollover, which uses zones 26 hours apart (`Etc/GMT+12` and `Pacific/Kiritimati`) so their local
dates always differ. An earlier version used New York to Tokyo, passed in the evening, and failed
in the morning.

## Talking about this

**The short version.** A shared pixel cat for exactly two people. One of you is the cat: you tap how
your day is going, she becomes that, and the other one sees it and can do something about it. No
accounts, no database, no notifications.

**The shape.** One Durable Object per room, and that's the entire backend. Two seats, assigned by
arrival order and enforced in the object rather than the UI, because the link is the only credential
the app has. A third person holding the link gets no notes, no mood, and a 403 on anything that
writes. The room runs on her clock, not the server's, so the light crosses the floor over her day and
the cat waits by the door around the time she usually gets home.

**The call I'd defend.** Almost all of the design work here was refusing things. Nothing bad can
happen to the cat: no hunger, no streaks, no decay, because the moment a shared pet can be neglected
it becomes a chore and the other person becomes someone you're letting down. She also doesn't copy a
low mood, she comes over and stays. And you only ever see what the other person did, never whether
they saw yours, because knowing someone saw and did nothing is worse than not knowing.

**The interesting technical bit.** She learns what you usually do. That needed the whole history, but
the visit log is capped at 40 entries to keep the object small, so a naive count over the log silently
stopped being true once you passed 40 visits. There's a running tally alongside the log now. The bug
that caught me was subtler: I seeded the tally from a log that already had the new visit appended, so
every action counted twice. Unit tests passed. Only the tests running against a real Durable Object
found it.

**The one I did not expect to matter.** One logical pixel has to be a whole number of device pixels.
The draw code snapped every cell to the device grid, so nothing was ever blurry, and that made the
real problem invisible: at 8.425 device pixels per cell, consecutive cells round to 8 and 9, so the
floorboards came out at two different widths. The whole look rests on not doing that, and it was
happening at almost every viewport size, because filling the container only lands on a whole number
when the container is an exact multiple of the grid. The fix is to take the largest whole-pixel size
that fits and give the remainder back as margin.

**The one that needed a number, not an eye.** Making the interface follow the room into the dark
looked like a crossfade problem and is not one. Blending a light panel into a dark one drags it
through mid grey, where neither dark nor light text has 4.5:1 against it, so the app would have spent
every dawn and dusk unreadable. I checked all 24 hours of the keyframe table before writing any of it:
the crossfade failed at ten of them, worst case 1.5:1. Two palettes with the text polarity flipping at
one point never crosses that zone, and the worst ratio anywhere is now 4.54.

**What breaks first.** Nothing, realistically. Two people per room and rooms don't talk to each other,
so it scales by doing nothing. The real limit is that the room is the only copy of the data, and
there's no export.

**What I'd change.** The art is hand-authored pixel grids you can read in the source, one rectangle
per logical pixel with no upscaling, because resampling a small canvas leaves you with pixels of two
different sizes and it reads as a mistake rather than a style. That was right, but it means adding a
sprite is a manual job and there's no tooling for it. I'd build a tiny editor before adding many more.

## Deploying

Merging to `main` deploys. The workflow runs typecheck, lint, a formatting check, build and tests
first, and only then deploys, so a red suite cannot ship. It needs a Workers-scoped `CLOUDFLARE_API_TOKEN` secret on
the repo.

```bash
pnpm --filter @mrrp/worker deploy   # by hand, if you need to
```

That script builds `packages/web` before `wrangler deploy`, because `packages/web/dist` is
gitignored and CI runs from a fresh checkout. A bare `wrangler deploy` there has no assets to
upload.

The Worker is served only on its custom domain, with `workers_dev = false`. The whole thing is
one private link sent to one person, so a second guessable `*.workers.dev` address should not
exist for it.

## License

MIT. See [LICENSE](LICENSE).

# mrrp

A cat that belongs to exactly two people. One private link, two seats, and no accounts.

You tell the cat how you are. It answers, and the other person finds out.

```bash
pnpm install
pnpm --filter @mrrp/web build     # the Worker serves these assets
pnpm --filter @mrrp/worker dev    # http://localhost:8791
```

The web app is served by the Worker itself, so **rebuild the web package after editing it**
or you'll be looking at the last build.

## The three rules

These are design constraints, not preferences. Each one is load-bearing.

**1. Nothing can go wrong for the cat.** No hunger, no sadness, no streak, no decay. The moment
a shared pet can be neglected it becomes a chore, and a chore is the opposite of a gift.

**2. The cat never mirrors a low mood, it answers it.** Sad brings her over and she stays.
Stressed and she sits on you and won't move. A cat that gets sad when you're sad is a cat you
protect by lying to, so on the days it matters you'd tap "good" and the feature would be dead.
Low moods make the room *warmer and closer*, never darker. See `packages/web/src/moods.ts`.

**3. You only ever see what the other person did.** Your own actions are never echoed back at
you, because that's just a log. And the room only says somebody *came in* after you spoke,
never that they saw it, because "they saw it and did nothing" is worse to know than nothing.

## Where things are

| file | what |
|---|---|
| `worker/src/room.ts` | the Durable Object. One per room, two seats, no alarms, no sockets |
| `worker/src/notes.ts` | the default notes, used until a room writes its own |
| `web/src/sprites.ts` | the cat, hand-authored pixel grids |
| `web/src/hours.ts` | her clock: light, palette, where she lies, keyframed by hand |
| `web/src/moods.ts` | what the cat does about what you told it |

## Before you send it

**Write the notes.** In the app, not in the source. Open the setup panel and there is a box for them,
one per line. The thirty it ships with are generic on purpose so a new room is never a blank page, but
they are a floor: a note written by someone else is not a gift from you, and that difference is the
whole app. Editing them no longer needs a deploy.

**Dress the cat.** Same panel. She defaults to a ginger tabby called Bean; point her at a cat somebody
actually knows and set whose day the room runs on. Her eyes are held open while the panel is up, because
shut eyes are drawn as a line in the outline colour and you cannot pick a colour you cannot see.

Then open the link yourself first, and send it. **Whoever opens it second is the one the cat is.**

The same thing over HTTP, if you'd rather. `me` must be the seat that made the room, because only he
may dress the cat, set her hours or write the notes. Without it you get a 403:

```bash
curl -X POST localhost:8791/api/room/<id>/dress \
  -H 'content-type: application/json' \
  -d '{"me":"<his-token>","name":"...","fur":"#e8963f","furDk":"#c9752a","belly":"#fbf0dd","eyes":"#7cb342","tabby":true}'

curl -X POST localhost:8791/api/room/<id>/notes \
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

`dither()` takes an optional `phase`. Do not pass `y` to it: the parity becomes `x + 2y`, which
depends on `x` alone, and your checkerboard silently becomes vertical stripes.

## Seats

A room has exactly two seats, assigned by arrival order and never reassigned. He makes the room,
so he is first. **Whoever opens the link second is the one the cat is.** Everyone after that can
look, but holds no seat.

That last part is enforced, not assumed. A third person with the link gets no note, no "you're
both in here", and a 403 on anything that writes. All of it lives in the Durable Object rather
than the UI, because a rule enforced in the browser is a rule anyone can turn off.

| endpoint | who | notes |
|---|---|---|
| `GET /api/room/:id` | anyone | seats the first two callers. Only her read advances the note |
| `POST .../tell` | her only | her mood, one of six |
| `POST .../say` | her only | one line back, 140 chars, empty clears it |
| `POST .../act` | him only | pet, brush, bring, sit |
| `POST .../dress`, `.../clock` | him only | 403 otherwise |
| `POST .../notes` | him only | this room's notes, one per entry; empty restores the defaults |
| `POST .../release` | him only | frees her seat so a new device can be her |

### When she loses her phone

A seat is a random token in `localStorage`. That is what makes this frictionless (no account, no
password, no email) and it is also the one thing that can go permanently wrong: clearing Safari's
data or moving to a new phone loses the seat, and with exactly two seats and no way to free one, the
room would be stuck forever with nobody able to be the cat.

So he has one recovery action, on his side, under **"She got a new phone"**. It frees her seat, and
whoever opens the link next becomes the cat. What deliberately survives: **how far into the notes she
has read**, and **the line she left him**. Losing a phone should not cost her three weeks of notes.
Her mood resets, which is correct, because a mood is how you are now and the new device will be asked.

His own seat has no recovery, by the same logic that makes the rest of this safe: the link is the only
credential, so there is nobody who could prove they are him. If he loses his device he makes a new
room, which costs the note count and nothing else.

Two things the note deliberately does not do: it never sends tomorrow's text (she could read
ahead in devtools, and a gift you can skim is not a gift), and it advances at most once per her
local day, so a day she doesn't visit is not a note she never sees.

## Tests

```bash
pnpm check       # typecheck, lint, then 114 tests: 58 web, 56 worker
```

`lint` exists for one rule. owewell shipped a `useEffect` below a component's early returns, so the
first render ran one fewer hook than the next one, and React error #310 took out every group page the
instant its data arrived. Typecheck, build and the entire test suite were green throughout. Only a
static rule sees that, so `react-hooks/rules-of-hooks` is an error here and CI runs it before deploying.

The worker suite runs in real workerd via `@cloudflare/vitest-pool-workers`, so Durable Object
storage and the seat rules are exercised as they actually behave rather than against a mock.

Anything that is only true for a fraction of the time is tested numerically, never by looking.
The moth visits for 18 seconds out of every 100; two attempts at screenshotting it missed both
times, so `mothAt` is a pure function of `t` with its own tests. Same reasoning for the note
rollover, which uses zones 26 hours apart (`Etc/GMT+12` and `Pacific/Kiritimati`) so their local
dates always differ. An earlier version used New York to Tokyo, passed in the evening, and failed
in the morning.

## Deploying

Merging to `main` deploys. The workflow runs typecheck, lint, build and tests first, and only then
deploys, so a red suite cannot ship. It needs a Workers-scoped `CLOUDFLARE_API_TOKEN` secret on
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

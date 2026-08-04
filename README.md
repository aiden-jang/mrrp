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
| `worker/src/notes.ts` | one note a day. **Rewrite these in your own words** |
| `web/src/sprites.ts` | the cat, hand-authored pixel grids |
| `web/src/hours.ts` | her clock: light, palette, where she lies, keyframed by hand |
| `web/src/moods.ts` | what the cat does about what you told it |

## Two things it needs before it's a gift

**Rewrite `notes.ts`.** The thirty in there now are placeholders in roughly the right register so
the mechanism works. The rules are at the top of the file. A note written by someone else is not
a gift from you, and that difference is the whole app.

**Dress the cat.** She defaults to a ginger tabby called Bean. Point her at a cat somebody
actually knows, and set whose day the room runs on:

```bash
curl -X POST localhost:8791/api/room/<id>/dress \
  -H 'content-type: application/json' \
  -d '{"name":"...","fur":"#e8963f","furDk":"#c9752a","belly":"#fbf0dd","eyes":"#7cb342","tabby":true}'

curl -X POST localhost:8791/api/room/<id>/clock \
  -H 'content-type: application/json' \
  -d '{"tz":"America/New_York","homeHour":18}'
```

`tz` is validated at the edge on purpose: an unchecked zone string reaches `Intl.DateTimeFormat`
inside the Durable Object and takes the whole room down with it.

## Notes on the art

Everything renders on a fixed 100x80 grid, one logical pixel per aligned rectangle. There is no
offscreen buffer and no upscaling, because resampling a small canvas leaves you with pixels of two
different sizes and it reads as a mistake rather than a style.

Light is **extra palette entries** (`litWall`, `litFloor`, `patch`), not translucent layers.
Glazing alpha over dithered bands is what produced vertical streaks the first time.

`dither()` takes an optional `phase`. Do not pass `y` to it: the parity becomes `x + 2y`, which
depends on `x` alone, and your checkerboard silently becomes vertical stripes.

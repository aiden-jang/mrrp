# mrrp

One of you is the cat. One private link, two seats, and no account needed.

## She is the cat

Not "she has a cat". He makes the room and names her, and that name is what she is called
everywhere, to both of them. She is never asked for a name of her own, because a second name for the
same person is what makes the app unable to say what she is.

Everything else follows from that one sentence:

- **She acts as the cat, the room does not roll for her.** She knocks something off the shelf
  because she means to, gets into the box he put out, and picks which of the three things he finds.
- **Her own acts do not count toward the tally.** Her personality is derived from that tally, so
  counting them would have her learning traits from herself. They are not dream material either, for
  the same reason: she is the one who did them.
- **Nothing in the copy tells her to touch herself.** No "hold on Sofia", no "tap Sofia". His touch
  on her is a recorded action that reaches her; hers is a local sound that reaches nobody.
- **Ending the room asks him to sign his own name.** Asking for the cat's name was a nice touch
  while the cat was a pet, and reads as "type her name to erase her" once she is not.
- **A joke about a cat is not always a joke about a person.** "She has no idea what that means" is
  fond about a cat and unkind about a person, so her side of that milestone points at him
  remembering instead. The seat-awareness tests cover milestones for this reason.
- **`awayLine` is told to him alone**, the way `homingLine` already was. To her it would be the room
  reporting her own arrival back to her, in her own name. The full moon is the only ambient line both
  seats read, and on her side it is her window.

## Running it

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

## Where things are

| file                    | what                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `worker/src/room.ts`    | the Durable Object. One per room, two seats, one alarm, the sockets   |
| `worker/src/notes.ts`   | the default notes, used until a room writes its own                   |
| `web/src/sprites.ts`    | the cat, hand-authored pixel grids                                    |
| `web/src/Cat.tsx`       | the room, drawn one aligned rectangle per logical pixel               |
| `web/src/hours.ts`      | her clock: light, palette, where she lies, keyframed by hand          |
| `web/src/moods.ts`      | what the cat does about what you told it                              |
| `web/src/doodle.ts`     | the seven-by-five sheet either of you can hang in the frame           |
| `worker/src/weather.ts` | her sky, from a timezone and a keyless forecast                       |
| `web/src/overlays.ts`   | where the painted-on details go, held to the sprites by its own test  |
| `web/src/blanket.ts`    | the five blankets, the one thing in the room she picks                |
| `web/src/screens.tsx`   | the screens and panels kept out of `App.tsx` so a test can click them |
| `web/src/live.ts`       | the socket, receive-only. Every write still goes through a POST       |
| `web/src/legible.ts`    | contrast, so a mark on a floor that is retinted hourly stays visible  |
| `web/src/wire.check.ts` | imported by nothing. Makes `tsc` fail when the two type files drift   |

## Tests

```bash
pnpm verify      # gates, size, typecheck, lint, format, build, tests, then the browser journey
```

`lint` exists for one rule. owewell shipped a `useEffect` below a component's early returns, so the
first render ran one fewer hook than the next one, and React error #310 took out every group page the
instant its data arrived. Typecheck, build and the entire test suite were green throughout. Only a
static rule sees that, so `react-hooks/rules-of-hooks` is an error here and CI runs it before deploying.

The worker suite runs in real workerd via `@cloudflare/vitest-pool-workers`, so Durable Object
storage and the seat rules are exercised as they actually behave rather than against a mock. It is
split a file per area, each with its own room, because a worker gets slower the more requests it has
served and one big file is therefore quadratic in its own length. That split is what takes this suite
from minutes to seconds; `test/harness.ts` has the measurements.

The canvas has a headless harness. `canvasHarness.tsx` mounts the cat in jsdom with a recording 2D
context and a frame clock the test drives, so layering and timing get real assertions instead of
somebody squinting at a browser. `room.draw.test.tsx` covers the ones that actually bit: the box
hiding the mug, the box hiding her mood, and the mug waiting on the shelf until she gets there.

Anything that is only true for a fraction of the time is tested numerically, never by looking.
The moth visits for 18 seconds out of every 100; two attempts at screenshotting it missed both
times, so `mothAt` is a pure function of `t` with its own tests. Same reasoning for the note
rollover, which uses zones 26 hours apart (`Etc/GMT+12` and `Pacific/Kiritimati`) so their local
dates always differ. An earlier version used New York to Tokyo, passed in the evening, and failed
in the morning.

## Deploying

Merging to `main` deploys. The workflow runs typecheck, lint, a formatting check, build and tests
first, and only then deploys, so a red suite cannot ship. It needs a Workers-scoped `CLOUDFLARE_API_TOKEN` secret on
the repo.

```bash
pnpm run deploy   # by hand, if you need to
```

Note the `run`. `pnpm deploy` is a built-in pnpm command for copying a workspace package somewhere,
so `pnpm --filter @mrrp/worker deploy` runs _that_ and fails with `ERR_PNPM_INVALID_DEPLOY_TARGET`
rather than the script you meant. CI never hit it because it runs `pnpm run deploy` from inside
`packages/worker`.

That script builds `packages/web` before `wrangler deploy`, because `packages/web/dist` is
gitignored and CI runs from a fresh checkout. A bare `wrangler deploy` there has no assets to
upload.

The Worker is served only on its custom domain, with `workers_dev = false`. The whole thing is
one private link sent to one person, so a second guessable `*.workers.dev` address should not
exist for it.

**"Bring her something" is gone.** It rolled a die between putting the box out and setting a flag, so
the button could never say what he brought, because he never chose. What he leaves out replaces it
and does the same job better: he picks the thing, she finds it, and he is told. Her personality's
"fed" trait comes from the treats now, and so does the dream about food. The floor sprite that button
used to set draws the thing he actually left, which also means it sits there waiting rather than
existing only inside a six-second animation.

**The box takes both of them.** Putting one out is a person's doing and getting into it is a cat's,
and they used to be the same event: she summoned a box from nowhere and was already sitting in it.
"Bring her something" hid that by putting the box out a third of the time it was pressed, and cutting
it left her the only source. He puts a box out now and she decides whether to get in, which makes it
the one thing in the room that needs the two of them. Her button says so when there is nothing to get
into, rather than doing nothing when pressed.

## License

MIT. See [LICENSE](LICENSE).

# Development notes

Use a disposable local room when checking states that take time to reach. The normal setup is
in [README](../README.md).

## Older room states

Copy `packages/worker/.dev.vars.example` to `.dev.vars` in the same directory and restart the
local Worker. `DEV_TOOLS=on` enables the age route; it is absent in production configuration.
Wrangler does not upload `.dev.vars` during deployment. Keep that file ignored.

The route still requires a seat in the room. In your local browser's developer tools, obtain
your own `mrrp:me` credential from local storage. Never use a production token or publish it.
Then request a local change, replacing the placeholders:

```sh
curl -X POST 'http://localhost:8787/api/room/<id>/age' \
  -H 'content-type: application/json' \
  -d '{"me":"<local-seat-token>","days":400,"tally":{"pet":120,"sit":22},"noteIdx":29}'
```

`days` moves the room's age, `tally` changes its accumulated interactions, and `noteIdx` moves
through the notes. `awayHours` changes your own last visit. The next room read consumes that
arrival interval, so inspect that first read when checking a return message.

## Optional services

The example local bindings also describe `AUTH_URL` for a locally running accounts app and
`WEATHER_URL` for the weather endpoint. A refused weather endpoint exercises the room's ordinary
weather-unavailable behavior. Local sign-in requires the shared accounts service; anonymous
room use does not.

## Isolated browser ports

Browser journeys refuse an existing server. If a manual room is already open, set
`MRRP_E2E_WEB_PORT` and `MRRP_E2E_INSPECTOR_PORT` to unused ports before running
`pnpm run verify`. Defaults are 34601 and 34602. One Worker serves the already-built app,
API, and sockets. Journeys retain their own storage and never reuse the manual room.
They disable external auth/weather calls and do not need local `.dev.vars` settings.

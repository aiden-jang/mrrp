# Architecture

Current analytics: `analytics/` holds the fixed browser/Worker event contract, bounded
anonymous ingestion and credential-free transport. See [Analytics](docs/ANALYTICS.md) for
coverage, privacy and dashboard queries. Private app paths are not traffic dimensions.

## Runtime

The React client renders a room snapshot from a Cloudflare Worker. Each room has one Durable
Object, which owns its state, seat permissions, alarms and live connections. The web app and API
ship together. Account linking uses the separate shared accounts service; visiting a room does
not require an account.

`packages/shared/src/index.ts` is the dependency-free browser/server contract: room views,
request bodies, action labels, input limits, and discovery/blanket keys. The web and Worker
type modules re-export it; Worker-only untrusted bodies and stored records stay in the Worker.
Neither runtime imports the other to validate its contract.

## Client ownership

`App.tsx` composes the room. It does not own every editor and network operation.

| Area                                                        | Owner                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Initial load, live updates, visibility and polling fallback | `useRoomSession.ts`                                         |
| Room actions, optimistic updates and interaction timers     | `useRoomActions.ts`                                         |
| Arrival and contextual feedback                             | `useRoomFeedback.ts`, `RoomArrival.tsx`                     |
| Notes, appearance and clock draft                           | `useCatSetup.ts`, `CatSetupPanel.tsx`                       |
| Saved conversations                                         | `useRoomHistory.tsx`                                        |
| Invitations and image sharing                               | `useRoomSharing.ts`                                         |
| Connection and action feedback                              | `RoomStatus.tsx`, `ConnectionNotice.tsx`                    |
| Cat-side controls                                           | `CatRoom.tsx`                                               |
| Companion-side controls                                     | `CompanionRoom.tsx`                                         |
| Recovery, settings and room lifecycle                       | `useSeatAccount.ts`, `RoomSettings.tsx`, `SeatRecovery.tsx` |
| Landing and unavailable-room states                         | `RoomLanding.tsx`, `RoomFallback.tsx`                       |
| Time-dependent UI palette and document effects              | `roomTheme.ts`, `RoomEffects.tsx`                           |

Hooks own side effects and writes. Role components render the authoritative snapshot and call
those operations. Draft state stays with its editor. A failed notes request must not become an
empty editable list, and a failed drawing save must keep the draft open.

`api.ts` owns browser requests and seat credentials. A room link alone is not a credential for
another person's seat. The client may preview a change immediately, but the server's response
settles permission and persisted state.

Before entering the app, `StorageUnavailable.tsx` checks that the browser can persist a seat.
It offers retry when storage is blocked. The app does not substitute an ephemeral credential
that would disappear on the next full-page navigation.

Room pages are keyed by room ID. Delayed reads can apply only while their owner is mounted
and no newer read, live snapshot, or action update has superseded them. Live sockets ignore
disposed callbacks and malformed messages, and reuse a connection that is still opening.
Account-link resumption belongs to `useSeatAccount.ts`, including blocked session-storage feedback.

Sharing coalesces pending requests and ignores work that finishes after cleanup. Postcards
are generated and downloaded first; a prepared file can then be shared from a fresh click.
Failed link sharing keeps selectable text visible. Replies and gift messages preserve drafts
on failure, and pending sends cannot be submitted repeatedly.

## Canvas

`Cat.tsx` is a single canvas engine with a stable draw loop. Refs deliver current props without
resubscribing the animation. Drawing and hit geometry share the same room coordinates; moving
furniture must move its hit area too. Keep this engine together. Extract pure calculations when
they have an independent responsibility, not pieces of the loop merely to shorten the file.

Art is hand-authored code and whole-pixel sprites. The approved image references guide warmth
and composition, not runtime assets. Reduced motion, touch targets and the accessible canvas
controls are part of the renderer's contract.

## Worker

`packages/worker/src/index.ts` routes requests. `room.ts` owns the Durable Object and stays one
class. Role checks and guards belong here even when the client hides the corresponding button.
Writes use authenticated POST requests. Live connections receive seat-filtered snapshots.
HTTP API responses forbid caching and referrer disclosure, including denied reads. WebSocket
upgrades pass through without reconstructing their response.

Checking whether an invitation exists does not claim its second seat. Joining is an explicit
choice. Missing rooms, deleted rooms and network failures have different meanings and must not
collapse into the same message.

Recovery codes restore a seat on another browser. Account links are optional. Deletion and
seat release use server-side rules and alarms rather than relying on an open client.

## Storage and failure handling

The Durable Object is the source of truth. Browser state holds seat credentials and local UI
preferences; it is not a second room database. A stale snapshot may be useful during reconnect,
but must not be presented as evidence that the connection is live.

The service worker caches the shell and static assets. It never caches API responses.
Navigation tries the network first. Only a successful public homepage refreshes the offline
HTML; room URLs, contextual queries, and failed responses cannot replace it. Cache writes
extend the fetch event's lifetime. Cache activation removes only old mrrp caches.

## Verification and release

`pnpm run verify` and CI share the gate inventory. Static checks cover source budgets, comments,
CSS references, docs and unused code. Tests exercise pure helpers, a recording canvas, real
Durable Object storage and two-seat browser journeys against the production assets. Browser review supplements assertions
with desktop, narrow-screen and keyboard inspection.

CI deploys the verified build artifact only after checks pass on `main`. A failed browser run
retains screenshots, traces, and Worker logs. Secrets belong in GitHub or Cloudflare configuration,
never in the browser build. See [UI review](docs/ui-review/README.md) for what was actually reviewed;
a passing automated suite is not a claim about every physical device or assistive technology.

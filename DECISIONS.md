# Decisions

Current product and engineering choices. The [historical notebook](docs/history/decisions.md)
records earlier experiments and implementation history; it is not the current module map.

## One room, two different roles

One person looks after the cat; the other is the cat. Naming, notes and appearance belong to
the companion. Answering and acting as the cat belong to her. Both can draw for the frame. Shared objects still
belong to both. The Durable Object enforces these distinctions.

There is no attendance system. Time away does not create debt, decay or a neglected pet.
The room should feel pleasant to return to without becoming another obligation.

## The room is one scene

Art, animation and hit geometry share room coordinates. Whole-pixel sprites avoid softened
edges. `Cat.tsx` keeps a stable animation loop and receives live props through refs; splitting
that loop into effects would change its lifetime and timing. Pure calculations can live outside
it when they have a useful independent boundary.

The scene has accessible controls alongside the canvas. Reduced motion changes animation,
not access to the room's actions. Approved art references live in [ART](ART.md).

## The server settles state

One Durable Object owns a room. `room.ts` stays one class because its methods share the same
state, guards and snapshot builder. Moving those methods behind more modules would hide the
coupling rather than remove it.

Authenticated POST requests perform writes. Live connections receive seat-filtered snapshots.
Visibility changes and polling provide a fallback when a live connection is interrupted.
An unavailable network is not the same thing as a deleted room.

Opening an invitation may check existence but must not claim the empty seat. Joining requires
an explicit choice. Recovery codes and optional account links let someone return from another
browser without making an account a condition of using the room.

## Drafts survive failure

Notes must load successfully before opening an editable setup draft. A rejected fetch cannot
be interpreted as an empty saved list. A drawing editor closes only after a successful save.
Failures explain what happened while leaving the work available to retry.

Role components render controls; hooks own requests, local drafts and effect cleanup. `App.tsx`
is a composition layer rather than the owner of every room interaction.

## Day and night remain readable

The room's palette follows its local time. Night uses warm charcoal, cream and amber rather
than a separate purple interface. Text must clear 4.5:1 against its background: the worst ratio anywhere is 4.54, checked by the palette test. Selected states also use shape, labels or pressed
state rather than color alone.

## Local storage is not the room

Browser storage holds credentials and preferences. Room content belongs to the Durable Object.
The service worker never caches API responses. Navigation uses the network first, and activation
only removes older mrrp caches, not caches belonging to other applications on the origin.

Deletion and seat release are server rules with recovery windows where applicable. Leaving a
tab open is not required for those rules to finish.

## Verify the mechanism that ships

Worker tests run in real workerd through `@cloudflare/vitest-plugin`. Canvas tests record actual
drawing calls against a controlled clock. Browser journeys exercise both roles against the real
local Worker. Development and test rooms use disposable local storage.

Repository gates must fail for the mistakes they guard and must remain aligned with CI. Size
exemptions ratchet downward after extraction. Documentation names are checked mechanically,
while the prose and visual result still need a human review. Physical-device and manual screen
reader testing are separate claims; automated results do not imply either happened.

# Mrrp art direction and rollout plan

Mrrp should keep the small, hand-made feeling it already has while becoming richer, warmer, and
more visually authored. The goal is not to paste an AI illustration behind the cat. The goal is to
use image generation to explore composition and atmosphere, then translate the approved direction
into consistent pixel art that still responds to the clock, moods, touch, and each room's cat.

The first approved reference is
[`docs/art/golden-hour-room-concept-v1.png`](docs/art/golden-hour-room-concept-v1.png). It is a target
for warmth, depth, material detail, and environmental storytelling. It is not a drop-in game asset.

## Status

**Phase 1 shipped.** The room in `packages/web/src/Cat.tsx` is the authored Canvas renderer, enriched
with wall texture, floorboard depth, the rug, window architecture and a focal shadow. Everything after
that is still a plan.

**Phase 4 and most of Phase 6 shipped without the pipeline.** The living-room states, the mood and
secret responses, and the interface following the room's light are all in, done as authored Canvas
work rather than as generated layers. Worth knowing before picking up the plan below: the phases were
written assuming Phase 2 came first, and two of them turned out not to need it at all.

What landed: whole-pixel rendering (one logical pixel is a whole number of device pixels, or the
floorboards come out at two different widths); the cat lit by the room, with a rim from the window and
a shadow that leans with the light; the chrome going dark when the room does, as two palettes rather
than a crossfade; her voice pitched per coat and her purr following her mood and deepening while she
is held; and the room keeping what he leaves in it. Deliberately not done: anything that could make
the room worse over time, which rules out most of what "living" usually means.

Since then, all authored grids and all in the same spirit: a head sprite that becomes the tab icon in
her actual coat; a collar she wears once both of them have called her by name; an empty frame and a
seven-by-five sheet either of them can draw on, which is the size of the hole that was already in the
frame; a worn patch on the rug where she has taken to sitting; one swipe at the moth per visit, which
she always misses; the pointer becoming the same paw as the credit line; and her voice settling four
percent over her first year. The rule from the reverted phases held throughout: the cute is authored,
never computed.

**Phases 2 and 3 were built as generated layers, and reverted.** The migration went all the way: six
generated room states, nine cat poses with recolorable eye overlays, a DOM interaction surface
replacing the canvas, and postcard capture compositing the image layers. It was then reverted in two
steps, `dc479fc` and `cad4481`, back to the authored renderer.

Read that before starting Phase 2 again. What went wrong was not the pipeline, which worked. It was
that a generated room is a picture of a room, and this app is two people watching a cat notice things.
Every interaction had to be re-aligned to artwork that no longer knew where the furniture was, the
poses drifted between frames, and the result was richer and deader. The cute has to be authored,
because authored is what makes it specific to her.

The phases below are kept as written. If they are picked up again, the constraint the revert added is
that nothing may own visible pixels unless it also knows the hit geometry.

## What must survive

- The ginger cat, cream face and belly, dark brown outline, and tiny expressive face
- User-selected fur, belly, and eye colors
- A small private room rather than a large virtual-pet world
- Light that follows her local time
- Moods that change what the cat does without punishing her
- Quiet discoveries embedded in furniture
- Crisp, aligned pixels with no blurry resampling
- Fast local rendering with no image-model request at runtime
- The existing screen-reader descriptions, reduced-motion behavior, and keyboard access

## Visual rules

- Use a limited warm palette: cream, ginger, chocolate, faded sage, dusty rose, muted lavender, and
  honey light.
- Prefer deliberate pixel clusters and readable silhouettes over smooth gradients or noisy detail.
- Let one strong light source organize each scene. At golden hour, the window beam should lead the
  eye toward the cat.
- Give materials one or two memorable cues: board seams and highlights for wood, edge pixels for
  ceramic, clustered leaves for plants, and sparse rain streaks for glass.
- Keep the cat as the highest-contrast object in the room.
- Leave quiet space. Props should imply a life rather than fill every empty patch.
- The room may become warmer and closer for a low mood, never darker or distressed.

Avoid smooth AI edges, mixed pixel sizes, fake film filters, generic anime features, excessive
dithering, unreadable miniature clutter, text baked into images, and generated poses whose anatomy
changes from frame to frame.

## How image generation is used

Use the image model for:

- Room compositions and lighting studies
- Cat turnaround and expression references
- Furniture, keepsake, and seasonal prop concepts
- Marketing art and larger non-interactive illustrations

Do not use it directly for:

- Runtime-generated rooms
- Final animation frames without pixel cleanup
- Interface copy or labels
- Independent cat poses that do not share a locked model sheet
- Anything that prevents palette replacement for custom cats

Every generated reference kept in the repository should include its final prompt and intended role
in `docs/art/README.md`. Final runtime assets must be locally bundled and require no network request.

## Layer model

The room should render in this order:

1. Wall, floor, skirting, and fixed architecture
2. Window view and time-of-day lighting
3. Rug and furniture behind the cat
4. Interactive props
5. Cat shadow, tail, and cat
6. Foreground objects, weather, and secret effects

The existing Canvas renderer remains the source of interaction geometry. If sprite atlases are
introduced later, their metadata must use the same logical coordinates as hit testing.

## Phase 1: visual foundation

- Keep the approved golden-hour reference in the repository.
- Add a short provenance record and a stable visual vocabulary.
- Enrich the existing room with wall texture, floorboard depth, a quiet rug, stronger window
  architecture, more grounded furniture, and a better cat focal shadow.
- Preserve every current interaction and palette-driven time state.
- Validate the result before generating more scenes.

Stopping point:

`feat: establish Mrrp's richer golden-hour art direction`

## Phase 2: asset pipeline

Attempted and reverted; see Status above.

- Add layered PNG or WebP sprite-atlas support alongside the current grid sprites.
- Load atlases once with `ImageBitmap` and use nearest-neighbor rendering.
- Store frame coordinates, anchors, palette slots, and hit regions in validated metadata.
- Build a development-only sprite viewer and enforce file-size budgets.
- Keep the current code-rendered room as a temporary fallback.

Stopping point:

`feat: add a layered pixel art pipeline for Mrrp`

## Phase 3: cat model sheet and animation

- Lock head, ear, paw, eye, and tail proportions in a single character sheet.
- Rebuild loaf, sit, stand, play, perk, sleep, stretch, walk, pounce, and box-peek poses.
- Add compact blink, ear, breathing, tail, and transition frames.
- Keep semantic palette roles so every existing cat customization still works.
- Test silhouette, eye visibility, and hitboxes against every room palette.

Stopping point:

`feat: replace the Mrrp cat with a cohesive animated sprite set`

## Phase 4: living room states

Largely shipped; see Status above.

- Create deliberate dawn, afternoon, golden-hour, evening, night, and rain treatments.
- Add restrained curtain movement, rain on glass, plant movement, steam, dust, and foreground depth.
- Let seasons change only a few meaningful objects.
- Keep reduced-motion versions emotionally equivalent rather than simply empty.

Stopping point:

`feat: bring Mrrp's room and weather states to life`

## Phase 5: moods, secrets, and keepsakes

- Give each mood a distinct visual response that supports the cat's authored behavior.
- Refresh the box, stars, rain, bubbles, mouse, piano, and window-light moments with the new art
  vocabulary.
- Let shared keepsakes appear naturally on the shelf, wall, or floor.
- Avoid progress bars, permanent particle effects, and reward language.

Stopping point:

`feat: refresh Mrrp's moods secrets and shared keepsakes`

## Phase 6: interface integration

Largely shipped; see Status above.

- Let the room remain the dominant surface.
- Match the surrounding interface colors to the room's current light.
- Make notes and setup controls feel like objects that belong near the room without sacrificing DOM
  semantics or readability.
- Reduce generic panels, borders, and controls that compete with the cat.

Stopping point:

`feat: unify Mrrp's interface with the new room art`

## Phase 7: rollout and validation

- Compare fixed screenshots for major hours, moods, cat palettes, and viewport sizes.
- Test high-DPI and low-DPI rendering, reduced motion, touch targets, offline loading, and captures.
- Measure startup size and frame time on a representative phone.
- Keep a temporary `?art=classic` fallback while the new rendering settles.
- Document generated-source provenance and confirm redistribution rights for every bundled asset.

Stopping point:

`test: harden Mrrp's art rendering across devices and preferences`

## Definition of done

- The cat remains recognizable and customizable in every pose.
- A first-time visitor understands the room and notices one charming detail within seconds.
- Golden hour, night, and rain feel like authored places rather than palette swaps.
- The room looks richer without becoming busy or hiding interactive objects.
- No runtime image generation, paid service, or external asset request is required.
- The app remains keyboard accessible, screen-reader understandable, reduced-motion safe, and usable
  on a small phone.
- Each stopping point delivers a cohesive visual bundle and exactly one commit message for manual
  committing.

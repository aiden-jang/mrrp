# Mrrp art direction

Mrrp should keep the small, hand-made feeling it already has while becoming richer, warmer, and more
visually authored. The goal is not to paste an illustration behind the cat. It is to use image
generation to explore composition and atmosphere, then translate the approved direction into
consistent pixel art that still responds to the clock, moods, touch, and each room's cat.

The first approved reference is
[`docs/art/golden-hour-room-concept-v1.png`](docs/art/golden-hour-room-concept-v1.png). It is a target
for warmth, depth, material detail, and environmental storytelling. It is not a drop-in game asset.

This was a seven-phase rollout plan. Six of the phases either shipped or were tried and reverted, so
what is left is the direction itself and the reason the pipeline half of it was abandoned. That reason
is the most useful thing in this file.

## Why there is no asset pipeline

**It was built, and reverted.** The migration went all the way: six generated room states, nine cat
poses with recolorable eye overlays, a DOM interaction surface replacing the canvas, and postcard
capture compositing the image layers. It was reverted in two steps, `dc479fc` and `cad4481`, back to
the authored renderer.

What went wrong was not the pipeline, which worked. It was that a generated room is a picture of a
room, and this app is two people watching a cat notice things. Every interaction had to be re-aligned
to artwork that no longer knew where the furniture was, the poses drifted between frames, and the
result was richer and deader.

**The cute has to be authored, because authored is what makes it specific to her.** If anything like
this is attempted again, the constraint the revert added is that nothing may own visible pixels unless
it also knows its own hit geometry.

## What is in the room

Everything visible is a hand-laid grid in `packages/web/src/sprites.ts` or a rect drawn in
`packages/web/src/Cat.tsx`. Nothing is generated at runtime and nothing is fetched.

Landed as authored Canvas work: whole-pixel rendering (one logical pixel is a whole number of device
pixels, or the floorboards come out at two different widths); the cat lit by the room, with a rim from
the window and a shadow that leans with the light; the chrome going dark when the room does, as two
palettes rather than a crossfade; wall texture, floorboard depth, the rug and the window architecture;
the living-room states, the mood and secret responses; her voice pitched per coat, her purr following
her mood and deepening while she is held, and settling a few percent over her first year; a head sprite
that becomes the tab icon in her actual coat; a collar she wears once both of them have called her by
name; an empty frame and a seven-by-five sheet either of them can draw on, which is the size of the
hole that was already in the frame; a worn patch on the rug where she has taken to sitting; one swipe
at the moth per visit, which she always misses; and the pointer becoming the same paw as the credit
line.

Deliberately not done: anything that could make the room worse over time, which rules out most of what
"living" usually means.

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

## What image generation is for

Use the image model for room compositions and lighting studies, cat turnaround and expression
references, furniture and seasonal prop concepts, and larger non-interactive illustration.

Do not use it for runtime-generated rooms, final frames without pixel cleanup, interface copy, poses
that do not share a locked model sheet, or anything that prevents palette replacement for custom cats.

Every generated reference kept in the repository should record its final prompt and intended role in
`docs/art/README.md`. Runtime assets are locally bundled and require no network request.

## Layer order

The room renders in this order, and the Canvas renderer remains the source of interaction geometry:

1. Wall, floor, skirting, and fixed architecture
2. Window view and time-of-day lighting
3. Rug and furniture behind the cat
4. Interactive props
5. Cat shadow, tail, and cat
6. Foreground objects, weather, and secret effects

## The bar

- The cat remains recognizable and customizable in every pose.
- A first-time visitor understands the room and notices one charming detail within seconds.
- Golden hour, night, and rain feel like authored places rather than palette swaps.
- The room looks richer without becoming busy or hiding interactive objects.
- No runtime image generation, paid service, or external asset request is required.
- The app remains keyboard accessible, screen-reader understandable, reduced-motion safe, and usable
  on a small phone.

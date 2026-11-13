# Mrrp art direction

The approved Pocket room direction gives Mrrp a wider, quiet room and a newly drawn cat.
Ivory curtains, timber, muted fabric and window light carry the scene. Sage day chrome and
forest night chrome let the room lead. [DESIGN.md](DESIGN.md) records the interface system.

Image studies guide composition and character; the interactive scene is authored Canvas work.
The earlier [golden-hour study](docs/art/golden-hour-room-concept-v1.png) remains an atmosphere
reference, not the current cat model or layout, and is not a runtime asset.

## The scene owns its pixels

The room is an authored canvas, not a background illustration with controls laid over it.
Visible objects must own their interaction geometry. Generated poses can drift between frames;
hand-authored sprites keep animation, custom colors and hit areas consistent.

## What is in the room

`sprites.ts` owns the logical pose envelopes, movement anchors and facial landmarks.
`catArt.ts` maps a finer head, cream muzzle, small eyes, body and tail onto those envelopes,
and supplies replaceable coat and eye colors. `roomArt.ts` selects this artwork and authors
the props; `roomShell.ts` paints architecture, materials and light. `Cat.tsx` owns behavior
and layering, with expression and collar placement in `overlays.ts`. No image model or
external asset request runs in the room.

Movement still uses the same 100 by 80 world. Most new art uses half-cell details;
`roomPainter.ts` aligns them to whole device pixels. The viewport can widen to show more of
the room without stretching it. A very short landscape window uses the coarse grid so the
entrance controls remain visible. Postcards preserve the captured scene's proportions.

The enlarged window, left-hand cabinet and plant share their placement and activation bounds
through `roomGeometry.ts`. Window projection, mug positions and the shelf trip must agree
with the visible furniture. The cat's round eyes have small tracking pupils and cream catchlights.
Blinks use curved lids; winks close one eye. Eyes, collar and expressions follow her pose.
Closed eyes keep her face color; custom colors survive every pose.

Landed as authored Canvas work: whole-pixel rendering (one logical pixel is a whole number of device
pixels, or the floorboards come out at two different widths); the cat lit by the room, with a rim from
the window and a shadow that leans with the light; the chrome going dark when the room does, as two
palettes rather than a crossfade; wall texture, floorboard depth, the rug and the window architecture;
the living-room states, the mood and secret responses; her voice pitched per coat, her purr following
her mood and deepening while she is held, and settling a few percent over her first year; a small cat-face tab icon in her actual coat; a collar she wears once both of them have called her by
name; an empty frame and a pixel sheet either of them can draw on; a worn patch on the rug where she has taken to sitting; one swipe
at the moth per visit, which she always misses; and the pointer becoming the same paw as the credit
line.

Deliberately not done: anything that could make the room worse over time, which rules out most of what
"living" usually means.

## What must survive

- The default ginger cat, cream muzzle and belly, brown outline, and small expressive eyes
- User-selected fur, belly, and eye colors
- A small private room rather than a large virtual-pet world
- Light that follows her local time
- Moods that change what the cat does without punishing her
- Quiet discoveries embedded in furniture
- Crisp, aligned pixels with no blurry resampling
- Fast local rendering with no image-model request at runtime
- The existing screen-reader descriptions, reduced-motion behavior, and keyboard access

## Visual rules

- Use a limited warm palette: cream, ginger, chocolate, faded sage, dusty rose, warm charcoal, and
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

## Pocket room interface

The landing leads with the scene on wide screens, then places the introduction and room form
beside each other. Phones put the introduction and first action before the scene. Invitations
keep the action beside the scene on desktop and before it on phones.

Inside a room, the scene leads and a four-action dock sits below it. Notes, mood and objects
sit in one adjacent column on desktop and follow the scene on phones. The dock becomes
two-by-two on phones. Notes and appearance use separate editors; appearance has cat, room
and day sections. Waiting keeps the invitation beside the scene when there is room. The original interaction world stays centered
inside the wider viewport, with whole device pixels and a restrained scene height on wide screens.

Bricolage Grotesque headings and Nunito Sans body text are bundled locally with their licenses.
The primary action uses sage by day and pale sage at night. The legacy `--honey` token names
that role. Controls use an 8px radius; panels and the scene use 12px. Quiet dividers and tonal
surfaces group content without turning every section into a card.

The companion's notes status and write/edit action stay together. Room & account is reachable
from the header and opens the existing details section, where recovery, access and lifecycle
controls remain. Editors keep save/cancel visible; motion gives brief feedback while the living
scene carries the atmosphere.

## The bar

- The cat remains recognizable and customizable in every pose.
- A first-time visitor understands the room and notices one charming detail within seconds.
- Golden hour, night, and rain feel like authored places rather than palette swaps.
- The room looks richer without becoming busy or hiding interactive objects.
- No runtime image generation, paid service, or external asset request is required.
- The app remains keyboard accessible, screen-reader understandable, reduced-motion safe, and usable
  on a small phone.

Ceramic glaze, an open mug handle, cushion stitching, cabinet books and clustered leaves use
the same palette roles as the room. Stronger golden-hour light, moonlight and lamp light sit
under the floor seams and fabric details so those materials remain readable.

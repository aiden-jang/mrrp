# Art references

These images are generated source assets for the visible room. Each one is locally bundled only
after its crop, compression, interaction alignment, and visual consistency have been checked.

## Golden-hour room concept v1

File: `golden-hour-room-concept-v1.png`

Role: approved direction and first visible runtime room state.

Generated with the built-in image generation model using the existing Mrrp social image as an
identity and palette reference.

Prompt:

> Create one polished wide pixel-art scene showing the Mrrp cat in her small cozy room at golden
> hour. Preserve the ginger cat, cream face and belly, green eyes, dark chocolate outline, tiny pink
> nose, and blush. Use an intimate side-view room with a rain-speckled window, a long warm sunbeam,
> cat bed, shelf and mug, unruly plant, framed cat photo, and open cardboard box. Use a crisp,
> consistent pixel grid, deliberate clusters, restrained dithering, warm honey light, cool lavender
> shadows, and quiet environmental storytelling. No text, logo, UI, watermark, smooth vector
> gradients, photorealism, 3D rendering, anime styling, extra animals, or people.

## Cat model sheet v1

File: `cat-model-sheet-v1.png`

Role: proportion and silhouette reference for the five core runtime poses. The generated pixels are
not shipped directly; each pose is translated into Mrrp's semantic palette grid so fur, belly, and
eye customization continue to work.

Generated with the built-in image generation model using the approved room concept and original
Mrrp social image as references.

Prompt:

> Create a clean pixel-art character model sheet of the exact same ginger cat in five separated
> full-body poses: compact loaf, upright sit, standing side profile with tail raised, playful rear-up
> pose with one paw extended, and alert ears-up sit. Lock head size, ear spacing, eye placement,
> cream markings, outline, paws, body proportions, and tail thickness across every pose. Use crisp
> uniform square pixels, a limited ginger, cream, chocolate, green, pink, and white palette, neutral
> studio lighting, and a plain warm ivory background. No text, labels, scenery, shadows, accessories,
> extra animals, perspective distortion, 3D, vector, painterly, anime, or photorealistic rendering.

## Cat motion sheet v1

File: `cat-motion-sheet-v1.png`

Role: silhouette and anatomy reference for four motion-specific runtime poses: walk, stretch,
pounce, and box peek. As with the core sheet, the reference is translated into semantic grid
sprites rather than bundled into the live renderer, preserving instant loading and cat colors.

Generated with the built-in image generation model using `cat-model-sheet-v1.png` as the locked
character reference.

Prompt:

> Create a second clean model sheet showing exactly four additional poses of the same
> ginger-and-cream cat: walking in profile, a full-body forward stretch with front paws extended and
> hips raised, a low playful pounce with front paws forward, and peeking from a cardboard box with
> paws hooked over the rim. Use crisp hand-authored 16-bit pixel art with one consistent logical
> pixel size. Arrange the four poses in one evenly spaced horizontal row with ample whitespace and
> no labels. Match the reference's ginger fur, cream muzzle, chest and paws, dark chocolate outline,
> pink nose and ears, and green eyes. Preserve the exact head size, ear spacing, eye placement,
> muzzle shape, limb proportions, outline weight, and palette. The box is plain warm kraft brown.
> No anatomy drift, extra limbs or tails, mixed pixel sizes, antialiasing, gradients, shadows,
> scenery, text, watermark, costumes, or accessories.

## Runtime cat pose sheet v1

File: `cat-runtime-sheet-v1.png`

Role: transparent generated runtime overlay containing the nine locked poses from the two approved
model sheets. Individual cells are bundled under `packages/web/public/art/cat/`.

The runtime uses the `*-v3.png` cells. These were re-extracted by isolating each pose's connected
silhouette, centering it on a consistent transparent frame, and applying the identical transform to
the matching eye overlay. This avoids neighboring-cell fragments and keeps all nine eye layers aligned.

Generated with the built-in image generation model using both approved cat sheets as identity and
pose references, followed by a background-extraction edit. The extracted PNG was verified to contain
a real alpha channel before being added to the project. The source request preserved the shared head,
ears, eyes, muzzle, cream markings, outline weight, limbs, tail, palette, and uniform pixel grid while
arranging loaf, sit, stand, play, perk, walk, stretch, pounce, and box-peek in a 3×3 sheet.

The four lighting-study runtime crops, evening image, and rain image were also edited to remove their
baked cat and reconstruct the rug and floor beneath it. The generated pose sheet is now the only
visible cat layer; the transparent Canvas continues to provide interaction geometry during migration.

## Runtime eye overlay sheet v1

File: `cat-eye-overlay-sheet-v1.png`

Role: semantic transparent overlay that restores selectable eye colors without recoloring the
generated fur, cream markings, nose, or outline.

Generated with the built-in image generation model using `cat-runtime-sheet-v1.png` as the locked
alignment reference. The edit removed every pixel except the green eyes and white highlights from
all nine poses. Its dimensions and alpha channel were verified before the cells were cropped under
`packages/web/public/art/cat-eyes/`. Runtime color treatments cover green, amber, copper, blue, and
grey while retaining a single aligned generated silhouette set.

## Interaction overlay sheet v1

File: `interaction-overlay-sheet-v1.png`

Role: final generated source sheet for secrets, gifts, keepsakes, and small room reactions. Its twenty
cells are bundled under `packages/web/public/art/interactions/` and enumerated in
`packages/web/src/interactionArt.ts`.

The sheet contains the leaf, bottle cap, moth, cake, yarn, treat, catnip, mouse, bubble, piano,
shooting star, constellation, rainbow, aurora, window light, note, bird, steam, sparkles, and plant
bloom. It was generated with the approved room and cat sheets as palette and pixel-grid references.

Three later transparent furniture overlays complete state that cannot be baked into a single room:
`fallen-mug-v1.png`, `door-closed-v1.png`, and `door-open-v1.png`. The closed and open doors share
one design and runtime position; lighting filters adapt them across the room's time-of-day chapters.

The image model did not preserve clean alpha for this sheet after repeated extraction passes. The
selected source therefore retains its solid black background and declares `screen` as its runtime
blend mode; black contributes no light while the authored colored pixels remain visible. Do not draw
these cells with normal blending unless they are given a verified alpha extraction first.

This completes planned image generation for the Canvas-to-generated-art migration. Remaining work is
runtime integration, positioning, animation, reduced-motion behavior, and visual QA.

## Room lighting study v1

File: `room-lighting-study-v1.png`

Role: locked lighting reference for dawn, clear afternoon, golden hour, and late night. The runtime
uses authored palette chapters and Canvas details rather than shipping the study itself, so the room
still follows the cat's timezone, loads offline, and stays interactive.

Generated with the built-in image generation model using `golden-hour-room-concept-v1.png` as the
locked composition, character, furniture, and pixel-style reference.

Prompt:

> Show the exact same small room and ginger cat in four equal panels at dawn, clear afternoon,
> golden hour, and late night. Change only the natural light, window view, curtain color response,
> shadows, and tiny ambient details. Use crisp hand-authored 16-bit pixel art with one consistent
> logical pixel size and identical camera and object placement in every panel. Dawn has a cool
> lavender sky with a thin peach horizon and long delicate light. Afternoon has airy cream daylight
> and one quiet cloud. Golden hour has honey light and the strongest warm beam. Late night has deep
> blue-violet glass, a crescent moon, sparse stars, a few lit distant windows, and a small warm pool
> around the shelf. Preserve the warm cream, ginger, chocolate, faded sage, dusty rose, muted
> lavender, and honey palette. Keep the cat as the highest-contrast object. No labels, text, UI,
> extra furniture, weather icons, neon, harsh black shadows, full-screen overlays, photorealism, 3D,
> smooth gradients, antialiasing, mixed pixel sizes, or watermark.

The four panels are cropped into the bundled dawn, day, golden-hour, and night runtime images. They
share one camera and object layout, so changing the cat's local hour does not move the room around.

## Evening room v1

File: `packages/web/public/art/room-evening-v1.png`

Role: generated blue-hour runtime state between golden hour and late night.

Generated with the built-in image generation model using the golden-hour runtime crop as the edit
target. Final prompt:

> Change only the lighting and window view from golden hour to quiet blue-hour evening, after sunset
> but before full night. Use a muted lavender-blue window, a last dusty-rose band at the horizon,
> weak cool ambient room light, and a small trace of warmth in the mug and wood. Preserve the crop,
> camera, room geometry, cat identity and pose, furniture placement, pixel grid, hard pixel edges,
> and every object. No moon, stars, rain, neon, black shadows, text, UI, watermark, antialiasing,
> blur, gradients, or geometry changes.

## Rain room v1

File: `packages/web/public/art/room-rain-v1.png`

Role: generated runtime weather state shown while the room's rain moment is active.

Generated with the built-in image generation model using the daylight runtime crop as the edit
target. Final prompt:

> Change only the weather outside and its light response: steady gentle rain on the window,
> overcast cool daylight outside, visible rain streaks and droplets on the glass, softly muted room
> light, and a slightly warmer candle-and-wood interior contrast. Preserve the crop, camera, room
> geometry, cat identity and pose, furniture placement, pixel grid, hard pixel edges, and every
> object. Rain stays outside. No storm drama, lightning, flooding, dark distressed mood, text, UI,
> watermark, antialiasing, blur, smooth gradients, or geometry changes.

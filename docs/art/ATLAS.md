# Runtime art atlas contract

Generated art references are never loaded directly by the room. A frame enters the runtime only
after its pixels are cleaned to the shared grid, separated from the reference background, and added
to an atlas whose manifest passes `artAtlas.test.ts`.

Each manifest records the source rectangle, logical anchor, optional semantic palette slots, and
interaction hit region. Source rectangles and pixel ratios are integers so Canvas can render with
nearest-neighbor sampling. Hit regions stay in the room's existing 100×80 coordinate system.

Replacement order:

1. Fixed architecture: wall trim, window frame, curtains, rug
2. Furniture and keepsakes: bed, shelf, plant, frame, box, gifts
3. Weather and secret overlays
4. Cat poses, only after palette-slot replacement preserves fur, belly, and eye customization

If an atlas or frame is absent or fails validation, the code-rendered room remains the fallback.

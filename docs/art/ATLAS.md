# Runtime generated-art contract

Generated room states and transparent overlays are bundled directly under
`packages/web/public/art/`. Runtime modules map semantic state—light phase, weather, pose, eye color,
keepsake, and interaction—to stable local asset paths.

The visible stack is:

1. Time-of-day or rain room image
2. Door and persistent furniture-state overlays
3. Keepsakes and generated interaction effects
4. Generated cat pose and its matching eye overlay
5. Lightweight DOM reactions such as speech, sleep, music, and purr marks
6. Transparent keyboard and pointer interaction surface

Cat and eye files are preloaded and swapped atomically so poses cannot mismatch during loading. All
interactive placement and hit regions remain in the room's 100×80 logical coordinate system.

Postcard export walks the live stack in order and composites visible image and DOM-effect layers into
an offscreen PNG. The offscreen canvas exists only for export; it is not a runtime renderer.

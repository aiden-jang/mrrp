# Scene redesign review

The room now uses finer pixel art for the window, furniture and plants, with stronger time-of-day
lighting, wall depth and perspective floorboards. The cat keeps her original face, silhouette
and tail, including the original open-eye artwork. Her colors remain customizable.
See [ART](../ART.md) for ownership and visual constraints.

The scene keeps its movement coordinates while sharing projected prop placement with pointer
targets. Named keyboard controls activate the selected object even when another object covers
its center. Postcards fit the captured scene without changing its proportions.

## Verification

Canvas assertions cover pose anchors, eye and collar placement, fine-grid alignment, projected
prop bounds, pointer and keyboard activation, sleeping poses, gifts on each blanket and camera
movement. Contrast checks sample the room chrome through the full day. Existing browser journeys
exercise both seats and the app around the scene.

The complete repository verification passed. Deterministic canvas recordings compared the old
and new renderers at the same clock time and room settings. Visual inspection covered golden
hour, night, rain and snow, custom coats, held poses, furniture responses, box, yarn, treats,
catnip, music, mouse, bubbles, piano and aurora. Narrow and reduced-motion captures were also
checked. These samples supplement the pose and overlay assertions; they do not establish every
possible animation combination.

The running app was inspected in desktop Chrome, a narrow Chrome viewport and desktop Safari,
including the cat seat and keyboard activation. The scene remained crisp and the surrounding
controls usable. Native phone hardware was not part of this review.

Keep generated evidence outside Git according to the [artifact policy](quality.md#review-artifacts).
Physical iOS and Android behavior, manual screen-reader use, native share delivery and live
account or weather services require separate verification.

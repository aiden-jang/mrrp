---
name: Mrrp
description: A quiet pocket room for two, with a living pixel cat.
colors:
  air: "#e5e9de"
  air-warm: "#ebeee2"
  panel: "#f9f8ef"
  ink: "#2c4135"
  soft: "#596b5d"
  line: "#c6cfbf"
  error: "#984a34"
  honey: "#566c4c"
  on-honey: "#fffdf4"
  night-air: "#232e26"
  night-air-warm: "#29372b"
  night-panel: "#303e32"
  night-ink: "#ebf1e2"
  night-soft: "#b3c2ac"
  night-line: "#52654e"
  night-error: "#d39a88"
  night-honey: "#bdcba3"
  night-on-honey: "#263322"
typography:
  display:
    fontFamily: '"Bricolage Grotesque", "Nunito Sans", ui-sans-serif, -apple-system, system-ui, sans-serif'
    fontSize: "clamp(34px, 4vw, 48px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Bricolage Grotesque", "Nunito Sans", ui-sans-serif, -apple-system, system-ui, sans-serif'
    fontSize: "clamp(28px, 4vw, 36px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.037em"
  title:
    fontFamily: '"Bricolage Grotesque", "Nunito Sans", ui-sans-serif, -apple-system, system-ui, sans-serif'
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Nunito Sans", ui-sans-serif, -apple-system, system-ui, sans-serif'
  label:
    fontFamily: '"Nunito Sans", ui-sans-serif, -apple-system, system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 650
rounded:
  control: "8px"
  panel: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.on-honey}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-quiet:
    textColor: "{colors.soft}"
    padding: "12px 8px"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  mood-choice:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 2px"
  note:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "15px 16px"
---

# Design System: Mrrp

## Overview

**Creative North Star: "Pocket room"**

The room feels small, private and lived in. Timber, ivory curtains, muted fabric and a compact
pixel cat provide the detail; the surrounding interface stays quiet and readable.

Sage day surfaces become forest green at night. Softly rounded controls and friendly, compact
headings support the authored scene without competing with it. [ART.md](ART.md) owns the
character and rendering rules; product behavior remains in the existing product and engineering docs.

**Key Characteristics:**

- A living pixel scene with quiet interface chrome.
- Sage and forest surfaces with cream and pale sage contrast.
- Friendly headings, clear body text and restrained containers.

## Colors

The frontmatter records the default day seeds and deep-night anchors from `index.css` and
`roomTheme.ts`. Runtime chrome follows the room's local light: dawn/day and deep-night/dusk
anchors blend within separate day and night families, then receive a small scene tint.
The palette changes immediately so background and text stay paired across the day/night switch.
The sidecar's tonal ramps are preview samples, not additional runtime palettes.

### Primary

- **Sage action:** `honey` is the existing token name for the primary action and selection role.
  It becomes pale sage at night; `on-honey` supplies its contrasting text.

### Neutral

- **Sage air:** `air` is the page; `air-warm` supports warmer feedback surfaces.
- **Ivory panel:** `panel` holds fields, notes and controls.
- **Forest ink:** `ink` is primary text; `soft` is readable secondary text.
- **Quiet seam:** `line` divides content. Interactive borders use the computed control color.
- **Forest night:** the `night-` entries anchor dark surfaces and pale text.

Error text uses the clay-colored `error` role. `roomTheme.ts` adjusts secondary and error text
against the actual surfaces; `legible.ts` derives control edges separately from quiet dividers.
Mood tints stay tied to their existing mood roles and use pressed state and outlines as well as color.

**The Shared Light Rule.** Use the live room tokens for interface surfaces and feedback. Do not
freeze a daytime color inside a component that also appears at night.

## Typography

Headings use Bricolage Grotesque; body text and controls use Nunito Sans. Both families and their
OFL licenses are bundled in `packages/web/public/fonts/`. No font request leaves the app.

The frontmatter captures the landing display, room headline, section title and form-label roles.
Body size and line height follow context: ordinary controls use 15px, fields use 16px, and short
helper text uses 12px to 13.5px. Notes receive a larger reading size. Headings balance; prose wraps
naturally. Mobile landing display type uses `clamp(34px, 9vw, 48px)`.

## Layout

The main room and landing container stops at 960px. Page gutters grow with the viewport;
sections use a small spacing vocabulary rather than nested cards.

The landing shows the scene first on desktop, with introduction and form below in two columns.
At 760px and below, introduction and form precede the scene. Invitations put action before scene
in source order and use adjacent columns from 860px.

An occupied room leads with its scene and caption, then a four-action dock. Role sections use
two columns from 860px and one below it. Setup and waiting use an adjacent scene/editor layout
from that breakpoint. Notes status and its edit action stay together. Room & account is reachable
from the header and opens the existing details section.

The scene keeps the original 100 by 80 interaction world inside a viewport that can widen to
160 logical units. Wide displays cap scene height at 480 CSS pixels. `roomGeometry.ts` and
`roomPainter.ts` fit the camera and align half-cell art to whole device pixels; a short landscape
window can use the coarse grid. Preserve this fitting rather than stretching a screenshot.

## Elevation & Depth

Most interface surfaces are flat. Tonal panels, quiet rules and space group content. The room's
material depth comes from pixel clusters and light, while a small shadow is reserved for arrival
feedback and floating context. Selected controls use inset outlines rather than lift.

## Shapes

Controls have gently rounded corners; notes, panels and the scene have the broader panel radius
in the frontmatter. Control borders remain visible, while dividers can be quieter. Pixel art keeps
hard, aligned edges inside the scene's rounded outer clip. Color swatches retain their existing
round form; they are not a replacement shape for ordinary buttons.

## Components

- **Buttons:** solid sage for the main action, ivory for secondary actions, and underlined text
  for quiet actions. Minimum height is 44px. Selection also uses an inset outline or pressed state.
  Disabled buttons stay legible. Hover feedback is limited to devices that can hover.
- **Fields:** panel background, visible control border and 16px text. Replies can grow within a
  bounded scroll area. Save and cancel stay part of the editor; failed writes keep the draft.
- **Mood choices:** compact labels in a three-column grid, with pressed state and a
  visible selected outline. Feedback sits immediately below the choices.
- **Notes:** a quiet panel with a small source label, larger message and secondary date.
- **Header utilities:** the wordmark, sound control and Room & account share a quiet ruled header.
  The tagline yields space on phones before actions do.
- **Action dock:** four role-specific actions below the scene, with inline line icons and text.
  Labels sit below icons at 600px and below. Long labels wrap inside their column.
- **Focus and motion:** keyboard focus uses an ink outline with an offset. Brief hover, press and
  arrival feedback supports the scene. Reduced motion collapses durations without exposing hidden
  content or removing access to actions.

## Do's and Don'ts

### Do:

- **Do** keep the cat and room interactive, customizable and crisp at every viewport.
- **Do** use the live palette for text, controls and feedback in both room palettes.
- **Do** keep role-specific actions, notes and editor ownership clear.
- **Do** preserve keyboard controls, readable status and reduced-motion access.

### Don't:

- **Don't** use generated room images as runtime backgrounds or animation frames.
- **Don't** stretch pixels or move furniture without moving its interaction geometry.
- **Don't** turn every room section into a raised card.
- **Don't** make moods or time away create neglect, decay or attendance pressure.

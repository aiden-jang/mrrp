/*
 * Every painted-on detail, held against the grid it lands on.
 *
 * All of these were hand-written numbers once and several were wrong: the eye highlight sat on her
 * muzzle in a loaf and her blush standing, and the yawn opened `perk`'s nose. A screenshot only ever
 * proves the frame it was taken in.
 */
import { describe, expect, it } from "vitest";
import {
  BED_STRIPES,
  COLLAR,
  EAR,
  eyeHighlights,
  faceShift,
  FRAME_CENTRE,
  FRAME_X,
  GROOM,
  KNEAD,
  YAWN,
  bedGrid,
  poseGrid,
} from "./overlays.js";
import { DOODLE_H, DOODLE_W } from "./doodle.js";
import { FRAME, FRAME_HOLE, POSES, type Pose } from "./sprites.js";

const cellAt = (rows: string[], x: number, y: number) => rows[y]?.[x] ?? ".";
const POSE_NAMES = Object.keys(POSES) as Pose[];

describe("washing", () => {
  it("puts the paw on her face in every pose, and never on an eye", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      for (const dx of [0, 1]) {
        for (const dy of [0, 1]) {
          const cell = cellAt(rows, GROOM.pawX + dx, GROOM.pawY + dy + faceShift(pose));
          expect(cell, `${pose} paw at ${GROOM.pawX + dx},${GROOM.pawY + dy}`).not.toBe(".");
          expect(cell, `${pose} paw on an eye`).not.toBe("e");
        }
      }
    }
  });

  it("puts the tongue on her face too, and next to the mouth rather than through it", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const ty = GROOM.tongueY + faceShift(pose);
      expect(cellAt(rows, GROOM.tongueX, ty), `${pose} tongue`).not.toBe(".");
      expect(cellAt(rows, GROOM.tongueX, ty), `${pose} tongue on the mouth`).not.toBe("m");
    }
  });
});

describe("kneading", () => {
  it("moves the loaf's actual paws", () => {
    const rows = poseGrid("loaf");
    for (const start of [KNEAD.left, KNEAD.right]) {
      for (let i = 0; i < KNEAD.w; i++) {
        expect(cellAt(rows, start + i, KNEAD.y), `paw cell ${start + i}`).toBe("d");
      }
    }
  });

  it("lifts them into her body and not into the floor", () => {
    const rows = poseGrid("loaf");
    for (const start of [KNEAD.left, KNEAD.right]) {
      expect(cellAt(rows, start, KNEAD.y - 1), "the row above a paw").not.toBe(".");
    }
  });
});

describe("the ear twitch", () => {
  it("lands beside an ear in every pose", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      for (const x of [EAR.left, EAR.right]) {
        const here = cellAt(rows, x, EAR.y);
        const inward = cellAt(rows, x === EAR.left ? x + 1 : x - 1, EAR.y);
        expect([here, inward].join(""), `${pose} ear at ${x}`).toMatch(/[wf]/);
      }
    }
  });
});

describe("the yawn", () => {
  it("opens the mouth row and not the nose above it", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const row = rows[YAWN.y + faceShift(pose)] ?? "";
      expect(row.includes("m"), `${pose} yawn row is the mouth`).toBe(true);
    }
  });
});

describe("the bed stripes", () => {
  it("all land on the cushion", () => {
    const rows = bedGrid();
    const mid = Math.floor(rows.length / 2);
    for (const x of BED_STRIPES) expect(cellAt(rows, x, mid), `stripe at ${x}`).toBe("b");
  });

  it("mirror about the middle of the bed, so the gaps at each end match", () => {
    const rows = bedGrid();
    const cushion = [...rows[Math.floor(rows.length / 2)]!].flatMap((c, i) => (c === "b" ? [i] : []));
    const first = Math.min(...cushion);
    const last = Math.max(...cushion);
    expect(Math.min(...BED_STRIPES) - first).toBe(last - Math.max(...BED_STRIPES));
  });
});

describe("the picture frame", () => {
  it("has a hole the drawing sheet exactly fits", () => {
    expect(FRAME_HOLE.w).toBe(DOODLE_W);
    expect(FRAME_HOLE.h).toBe(DOODLE_H);
  });

  it("is looked at in its middle, wherever the middle happens to be", () => {
    expect(FRAME_CENTRE).toBe(FRAME_X + Math.floor(FRAME.w / 2));
    expect(FRAME_CENTRE).toBeGreaterThan(FRAME_X);
    expect(FRAME_CENTRE).toBeLessThan(FRAME_X + FRAME.w);
  });
});

describe("her eye highlights", () => {
  it("lands on the highlight cells the sprite already has", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const { l, r, row } = eyeHighlights(pose);
      const ox = POSES[pose].ox;
      expect(cellAt(rows, l - ox, row), `${pose} left highlight`).toBe("h");
      expect(cellAt(rows, r - ox, row), `${pose} right highlight`).toBe("h");
    }
  });

  it("finds the row the eyes are actually on, pose by pose", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const { row } = eyeHighlights(pose);
      expect(rows[row]?.includes("e"), `${pose} highlight row has eyes on it`).toBe(true);
    }
  });

  it("leaves room to shift without falling off her face", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const { l, r, row } = eyeHighlights(pose);
      const ox = POSES[pose].ox;
      for (const col of [l - ox - 1, l - ox + 1, r - ox - 1, r - ox + 1]) {
        expect(cellAt(rows, col, row), `${pose} shifted highlight at ${col}`).not.toBe(".");
      }
    }
  });
});

describe("the collar", () => {
  it("sits on the cat in every pose, band and tag", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const { ox, oy } = POSES[pose];
      const c = COLLAR[pose];
      const row = c.dy - oy;
      for (let i = 0; i < c.w; i++) {
        expect(cellAt(rows, c.dx - ox + i, row), `${pose} band cell ${i}`).not.toBe(".");
      }
      expect(cellAt(rows, c.tag - ox, row), `${pose} tag`).not.toBe(".");
    }
  });

  // "Below the mouth" was the first way this was written and it is wrong: `flop` has her on her side,
  // so her neck is beside her head rather than under it.
  it("never covers a part of her face", () => {
    for (const pose of POSE_NAMES) {
      const rows = poseGrid(pose);
      const { ox, oy } = POSES[pose];
      const c = COLLAR[pose];
      const row = c.dy - oy;
      for (let i = 0; i < c.w; i++) {
        expect("emnch", `${pose} band cell ${i} is on her face`).not.toContain(
          cellAt(rows, c.dx - ox + i, row),
        );
      }
    }
  });
});

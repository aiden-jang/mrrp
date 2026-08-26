import { describe, expect, it } from "vitest";
import { mouseRunAt } from "./mouse.js";

describe("mouseRunAt", () => {
  it("peeks from the door before crossing the room", () => {
    expect(mouseRunAt(350, 7000)?.phase).toBe("peek");
    const middle = mouseRunAt(3500, 7000);
    expect(middle?.phase).toBe("dash");
    expect(middle!.x).toBeGreaterThan(30);
    expect(middle!.x).toBeLessThan(80);
  });

  it("fades into the far wall and then leaves", () => {
    const escape = mouseRunAt(6800, 7000);
    expect(escape?.phase).toBe("escape");
    expect(escape!.presence).toBeLessThan(0.5);
    expect(mouseRunAt(7000, 7000)).toBeNull();
  });
});

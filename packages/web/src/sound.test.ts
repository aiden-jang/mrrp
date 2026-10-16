// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
test("sound levels reach the master gain, remain muted when changed, and persist only after choosing", async () => {
  vi.resetModules();
  localStorage.clear();
  const target = vi.fn();
  const gain = {
    gain: { value: 0, cancelScheduledValues: vi.fn(), setTargetAtTime: target },
    connect: vi.fn(),
  };
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 4;
      state = "running";
      destination = {};
      createGain() {
        return gain;
      }
    },
  );
  const sound = await import("./sound");
  expect(localStorage.getItem("mrrp.sound-level.v1")).toBeNull();
  sound.primeOnFirstGesture();
  window.dispatchEvent(new Event("pointerdown"));
  expect(gain.gain.value).toBe(0.22);
  sound.setSoundLevel("normal");
  expect(target).toHaveBeenLastCalledWith(0.6, 4, 0.04);
  expect(localStorage.getItem("mrrp.sound-level.v1")).toBe("normal");
  expect(sound.toggleMuted()).toBe(true);
  expect(target).toHaveBeenLastCalledWith(0, 4, 0.04);
  sound.setSoundLevel("quiet");
  expect(target).toHaveBeenLastCalledWith(0, 4, 0.04);
  expect(localStorage.getItem("mrrp.sound-level.v1")).toBe("quiet");
});

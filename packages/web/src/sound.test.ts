// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
test("sound starts quietly and keeps the existing mute preference", async () => {
  vi.resetModules();
  localStorage.clear();
  localStorage.setItem("mrrp.sound-level.v1", "normal");
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
  sound.primeOnFirstGesture();
  window.dispatchEvent(new Event("pointerdown"));
  expect(gain.gain.value).toBe(0.22);
  expect(sound.toggleMuted()).toBe(true);
  expect(target).toHaveBeenLastCalledWith(0, 4, 0.04);
  expect(localStorage.getItem("mrrp.muted.v1")).toBe("1");
});

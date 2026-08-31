/*
 * A cat built from oscillators and noise. No sound files. See DECISIONS.md.
 *
 * A purr is a rumble whose volume flutters about 25 times a second, and that flutter is the "pitch"
 * you hear. The real pitch is too low for a phone speaker, so this flutters filtered noise instead.
 */

const MUTE_KEY = "mrrp.muted.v1";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Private mode. The setting just does not survive a reload.
  }
  if (!muted) play("mrrp");
  return muted;
}

function graph(): { ctx: AudioContext; master: GainNode } | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return master ? { ctx, master } : null;
}

export function primeOnFirstGesture(): void {
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const prime = () => {
    for (const e of events) window.removeEventListener(e, prime);
    graph();
  };
  for (const e of events) window.addEventListener(e, prime, { passive: true });
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise) return noise;
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  noise = buf;
  return buf;
}

function rumble(
  g: { ctx: AudioContext; master: GainNode },
  o: {
    at: number;
    dur: number;
    gain: number;
    filter: BiquadFilterType;
    from: number;
    to?: number;
    q?: number;
    flutter?: number;
    flutterDepth?: number;
    attack?: number;
  },
): void {
  const src = g.ctx.createBufferSource();
  src.buffer = noiseBuffer(g.ctx);
  src.loop = true;

  const filter = g.ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.frequency.setValueAtTime(o.from, o.at);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, o.at + o.dur);
  filter.Q.value = o.q ?? 1;

  // Keep two gain stages. With one, the LFO and the scheduled ramps fight over the same
  // AudioParam and the envelope wins, silently.
  const trem = g.ctx.createGain();
  trem.gain.value = 1;
  if (o.flutter) {
    const depth = Math.min(o.flutterDepth ?? 0.5, 0.5);
    trem.gain.value = 1 - depth;
    const lfo = g.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = o.flutter;
    const lfoDepth = g.ctx.createGain();
    lfoDepth.gain.value = depth;
    lfo.connect(lfoDepth).connect(trem.gain);
    lfo.start(o.at);
    lfo.stop(o.at + o.dur + 0.05);
  }

  const env = g.ctx.createGain();
  const attack = o.attack ?? 0.02;
  env.gain.setValueAtTime(0, o.at);
  env.gain.linearRampToValueAtTime(o.gain, o.at + attack);
  env.gain.setValueAtTime(o.gain, o.at + Math.max(attack, o.dur * 0.6));
  env.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);

  src.connect(filter).connect(trem).connect(env).connect(g.master);
  src.start(o.at);
  src.stop(o.at + o.dur + 0.05);
}

function voice(
  g: { ctx: AudioContext; master: GainNode },
  o: {
    at: number;
    dur: number;
    gain: number;
    sweep: number[];
    wobble?: number;
    wobbleDepth?: number;
    type?: OscillatorType;
  },
): void {
  const osc = g.ctx.createOscillator();
  osc.type = o.type ?? "triangle";
  const step = o.dur / Math.max(1, o.sweep.length - 1);
  osc.frequency.setValueAtTime(o.sweep[0]!, o.at);
  o.sweep.slice(1).forEach((f, i) => {
    osc.frequency.exponentialRampToValueAtTime(f, o.at + step * (i + 1));
  });

  if (o.wobble) {
    const lfo = g.ctx.createOscillator();
    lfo.frequency.value = o.wobble;
    const depth = g.ctx.createGain();
    depth.gain.value = o.wobbleDepth ?? 20;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(o.at);
    lfo.stop(o.at + o.dur + 0.05);
  }

  const env = g.ctx.createGain();
  env.gain.setValueAtTime(0, o.at);
  env.gain.linearRampToValueAtTime(o.gain, o.at + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);

  osc.connect(env).connect(g.master);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.05);
}

let pitch = 1;
let settled = 0.5;

export function setVoice(v: { pitch?: number; settled?: number }): void {
  if (v.pitch !== undefined) pitch = Math.max(0.85, Math.min(1.2, v.pitch));
  if (v.settled !== undefined) settled = Math.max(0, Math.min(1, v.settled));
}

export type Cue =
  | "purr"
  | "mrrp"
  | "chirp"
  | "chatter"
  | "brush"
  | "thump"
  | "shutter"
  | "settle"
  | "twinkle"
  | "jingle"
  | "bell"
  | "rain"
  | "glint"
  | "hello";

const CUES: Record<Cue, (g: { ctx: AudioContext; master: GainNode }, t: number) => void> = {
  purr: (g, t) => {
    const flutter = 26 - settled * 6;
    const dur = 2.2 + settled * 0.6;
    rumble(g, {
      at: t,
      dur,
      gain: 0.3,
      filter: "lowpass",
      from: 380,
      q: 0.7,
      flutter,
      flutterDepth: 0.5,
      attack: 0.35,
    });
    rumble(g, {
      at: t,
      dur,
      gain: 0.12,
      filter: "lowpass",
      from: 140,
      q: 0.5,
      flutter,
      flutterDepth: 0.45,
      attack: 0.35,
    });
  },

  mrrp: (g, t) => {
    const p = (f: number[]) => f.map((x) => x * pitch);
    voice(g, { at: t, dur: 0.19, gain: 0.16, sweep: p([430, 720, 600]), wobble: 42, wobbleDepth: 26 });
    voice(g, {
      at: t,
      dur: 0.19,
      gain: 0.05,
      sweep: p([860, 1440, 1200]),
      wobble: 42,
      wobbleDepth: 30,
      type: "sine",
    });
  },

  hello: (g, t) => {
    const p = (f: number[]) => f.map((x) => x * pitch);
    voice(g, { at: t, dur: 0.14, gain: 0.13, sweep: p([390, 560]), wobble: 30, wobbleDepth: 16 });
    voice(g, { at: t + 0.11, dur: 0.16, gain: 0.14, sweep: p([620, 780]), wobble: 34, wobbleDepth: 18 });
    voice(g, {
      at: t + 0.25,
      dur: 0.42,
      gain: 0.12,
      sweep: p([820, 900, 840]),
      wobble: 26,
      wobbleDepth: 22,
    });
    voice(g, { at: t + 0.25, dur: 0.42, gain: 0.04, sweep: p([1640, 1800, 1680]), type: "sine" });
  },

  glint: (g, t) => {
    voice(g, { at: t, dur: 0.16, gain: 0.07, sweep: [880, 1180], type: "sine" });
    voice(g, { at: t + 0.12, dur: 0.26, gain: 0.05, sweep: [1320, 1245], type: "sine" });
  },

  rain: (g, t) => {
    rumble(g, { at: t, dur: 2.4, gain: 0.05, filter: "bandpass", from: 1400, q: 0.6, attack: 0.5 });
    rumble(g, { at: t, dur: 2.4, gain: 0.03, filter: "highpass", from: 2600, attack: 0.5 });
  },

  chatter: (g, t) => {
    for (let i = 0; i < 6; i++) {
      voice(g, {
        at: t + i * 0.07,
        dur: 0.045,
        gain: 0.085,
        sweep: [(700 + i * 26) * pitch, (900 + i * 26) * pitch],
        wobble: 70,
        wobbleDepth: 26,
      });
    }
  },

  chirp: (g, t) => {
    voice(g, {
      at: t,
      dur: 0.11,
      gain: 0.13,
      sweep: [620 * pitch, 980 * pitch],
      wobble: 55,
      wobbleDepth: 34,
    });
  },

  brush: (g, t) => {
    rumble(g, { at: t, dur: 0.34, gain: 0.37, filter: "bandpass", from: 1900, to: 700, q: 0.8 });
    rumble(g, { at: t + 0.38, dur: 0.34, gain: 0.3, filter: "bandpass", from: 1700, to: 640, q: 0.8 });
  },

  thump: (g, t) => {
    voice(g, { at: t, dur: 0.13, gain: 0.2, sweep: [110, 48], type: "sine" });
    rumble(g, { at: t, dur: 0.07, gain: 0.07, filter: "lowpass", from: 900, q: 0.5 });
  },

  shutter: (g, t) => {
    rumble(g, { at: t, dur: 0.035, gain: 0.7, filter: "bandpass", from: 2600, q: 1.4, attack: 0.002 });
    rumble(g, { at: t + 0.07, dur: 0.05, gain: 0.57, filter: "bandpass", from: 1800, q: 1.2, attack: 0.002 });
  },

  settle: (g, t) => {
    rumble(g, {
      at: t,
      dur: 1.1,
      gain: 0.2,
      filter: "lowpass",
      from: 320,
      q: 0.7,
      flutter: 24,
      flutterDepth: 0.55,
      attack: 0.25,
    });
  },

  twinkle: (g, t) => {
    voice(g, { at: t, dur: 0.18, gain: 0.055, sweep: [660, 740], type: "sine" });
    voice(g, { at: t + 0.11, dur: 0.2, gain: 0.05, sweep: [880, 990], type: "sine" });
    voice(g, { at: t + 0.23, dur: 0.25, gain: 0.045, sweep: [1100, 1320], type: "sine" });
  },

  bell: (g, t) => {
    voice(g, { at: t, dur: 0.16, gain: 0.05, sweep: [1480 * pitch, 1440 * pitch], type: "sine" });
    voice(g, { at: t + 0.02, dur: 0.11, gain: 0.03, sweep: [2210 * pitch, 2160 * pitch], type: "sine" });
  },

  jingle: (g, t) => {
    const notes = [523, 659, 784, 659, 880];
    notes.forEach((freq, index) => {
      voice(g, { at: t + index * 0.13, dur: 0.19, gain: 0.045, sweep: [freq, freq * 1.025], type: "sine" });
    });
  },
};

const MIN_GAP_SECONDS = 0.35;
const lastPlayed = new Map<Cue, number>();

const LOOKAHEAD_SECONDS = 0.02;

export function play(cue: Cue): void {
  const g = graph();
  if (!g) return;
  const at = g.ctx.currentTime + LOOKAHEAD_SECONDS;
  if (at - (lastPlayed.get(cue) ?? -Infinity) < MIN_GAP_SECONDS) return;
  lastPlayed.set(cue, at);
  CUES[cue](g, at);
}

export function buzz(kind: "pet" | "brush"): void {
  if (isMuted()) return;
  try {
    navigator.vibrate?.(kind === "pet" ? 12 : [8, 40, 8]);
  } catch {
    // No buzzer, or the browser refuses. Nothing to fall back to and nothing worth saying.
  }
}

export function playPianoNote(index: number): void {
  const g = graph();
  if (!g) return;
  const notes = [392, 494, 587, 659, 784];
  const frequency = notes[Math.max(0, Math.min(notes.length - 1, Math.round(index)))]!;
  const at = g.ctx.currentTime + LOOKAHEAD_SECONDS;
  voice(g, { at, dur: 0.3, gain: 0.055, sweep: [frequency, frequency * 1.012], type: "sine" });
}

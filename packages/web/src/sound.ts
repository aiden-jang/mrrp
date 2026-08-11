/*
 * A very small cat, synthesized.
 *
 * Everything here is oscillators and filtered noise built at runtime, so the whole voice costs no
 * download and no cache. That is partly a budget decision and mostly a correctness one: a cat that
 * needs a 200 KB sample to purr is silent on the first visit, which is exactly the visit where
 * somebody is deciding whether this room is worth coming back to.
 *
 * A purr is not a note, so none of this is musical. A real purr is a ~25 Hz amplitude modulation of
 * a broadband rumble — the pitch you think you hear is the flutter rate, not a fundamental. The
 * fundamental itself sits near 25 Hz, which a phone speaker physically cannot reproduce, so this
 * modulates filtered noise instead and the flutter survives the speaker intact.
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

/** Returns the new state. Unmuting answers with a mrrp so the toggle proves itself. */
export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode; the setting just won't survive a reload */
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

/**
 * Build the graph on the first gesture anywhere.
 *
 * She reacts to things that aren't gestures: the other person arriving, the room going from one of
 * you to both. iOS only resumes an audio context inside a gesture, so without this the sounds that
 * matter most are the ones that get dropped.
 */
export function primeOnFirstGesture(): void {
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const prime = () => {
    for (const e of events) window.removeEventListener(e, prime);
    graph();
  };
  for (const e of events) window.addEventListener(e, prime, { passive: true });
}

/**
 * Two seconds of brown noise, generated once and reused.
 *
 * Brown rather than white because white noise is all treble and reads as radio static; integrating
 * it tilts the spectrum down into something that sounds like an animal and a hairbrush rather than
 * a broken speaker.
 */
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

/** Filtered noise with an ADSR-ish envelope. The body of every non-vocal sound she makes. */
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
    /** Amplitude modulation rate in Hz. This is what turns a rumble into a purr. */
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

  // Two gain stages on purpose. The tremolo stage holds a constant value that the LFO adds to, and
  // the envelope stage carries the scheduled fade. Doing both on one node means the LFO connection
  // and the scheduled ramps fight over the same AudioParam and the envelope wins, silently.
  const trem = g.ctx.createGain();
  trem.gain.value = 1;
  if (o.flutter) {
    // Capped at 0.5: the LFO swings +/- depth around (1 - depth), so anything larger drives the gain
    // negative at the troughs. That isn't extra silence, it's a phase flip, and two layers flipping
    // against each other partly cancel instead of dipping together. 0.5 is already 100% modulation.
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

/** A pitched, wobbling voice. Cats chirp with heavy frequency modulation, which is the whole trick. */
function voice(
  g: { ctx: AudioContext; master: GainNode },
  o: {
    at: number;
    dur: number;
    gain: number;
    /** Frequency waypoints swept through across the note. */
    sweep: number[];
    /** Vibrato rate in Hz, and how many Hz it swings. */
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

export type Cue = "purr" | "mrrp" | "chirp" | "brush" | "thump" | "shutter" | "settle" | "twinkle" | "jingle";

const CUES: Record<Cue, (g: { ctx: AudioContext; master: GainNode }, t: number) => void> = {
  /*
   * 26 Hz flutter under a 380 Hz lowpass. Slow in, slow out, because a purr that starts at full
   * volume is a machine and a purr that fades is an animal deciding you're staying a while.
   */
  purr: (g, t) => {
    rumble(g, { at: t, dur: 2.2, gain: 0.3, filter: "lowpass", from: 380, q: 0.7, flutter: 26, flutterDepth: 0.5, attack: 0.35 });
    rumble(g, { at: t, dur: 2.2, gain: 0.12, filter: "lowpass", from: 140, q: 0.5, flutter: 26, flutterDepth: 0.45, attack: 0.35 });
  },

  /* The greeting: up and back down in under a fifth of a second, with a fast trill on top. */
  mrrp: (g, t) => {
    voice(g, { at: t, dur: 0.19, gain: 0.16, sweep: [430, 720, 600], wobble: 42, wobbleDepth: 26 });
    voice(g, { at: t, dur: 0.19, gain: 0.05, sweep: [860, 1440, 1200], wobble: 42, wobbleDepth: 30, type: "sine" });
  },

  /* Shorter and higher than a mrrp. What she says when she notices, rather than when she greets. */
  chirp: (g, t) => {
    voice(g, { at: t, dur: 0.11, gain: 0.13, sweep: [620, 980], wobble: 55, wobbleDepth: 34 });
  },

  /* Bristles, not a cat: a bandpass sweeping down, twice, at the speed of a hand. Gains here look
     high next to the vocal cues because they are applied before the filter, and a narrow bandpass
     throws away most of what it is given. Measured at the output these sit deliberately under the
     voice: a hairbrush should not compete with the animal holding still for it. */
  brush: (g, t) => {
    rumble(g, { at: t, dur: 0.34, gain: 0.37, filter: "bandpass", from: 1900, to: 700, q: 0.8 });
    rumble(g, { at: t + 0.38, dur: 0.34, gain: 0.3, filter: "bandpass", from: 1700, to: 640, q: 0.8 });
  },

  /* Something set down on the floor near her. */
  thump: (g, t) => {
    voice(g, { at: t, dur: 0.13, gain: 0.2, sweep: [110, 48], type: "sine" });
    rumble(g, { at: t, dur: 0.07, gain: 0.07, filter: "lowpass", from: 900, q: 0.5 });
  },

  /* A shutter is two clicks, not one, and the gap between them is the whole reason it reads as one. */
  shutter: (g, t) => {
    rumble(g, { at: t, dur: 0.035, gain: 0.7, filter: "bandpass", from: 2600, q: 1.4, attack: 0.002 });
    rumble(g, { at: t + 0.07, dur: 0.05, gain: 0.57, filter: "bandpass", from: 1800, q: 1.2, attack: 0.002 });
  },

  /* Her settling against you: a short purr with no attack to speak of. */
  settle: (g, t) => {
    rumble(g, { at: t, dur: 1.1, gain: 0.2, filter: "lowpass", from: 320, q: 0.7, flutter: 24, flutterDepth: 0.55, attack: 0.25 });
  },

  /* Three tiny glassy notes for a secret being accepted. It stays shorter and quieter than her
     voice, because the room should acknowledge the discovery without turning into a game menu. */
  twinkle: (g, t) => {
    voice(g, { at: t, dur: 0.18, gain: 0.055, sweep: [660, 740], type: "sine" });
    voice(g, { at: t + 0.11, dur: 0.2, gain: 0.05, sweep: [880, 990], type: "sine" });
    voice(g, { at: t + 0.23, dur: 0.25, gain: 0.045, sweep: [1100, 1320], type: "sine" });
  },

  /* A tiny pentatonic phrase for the room's dance secret. Five separated plucks read as a tune,
     while a longer loop would make a hidden interaction annoy everyone else in the room. */
  jingle: (g, t) => {
    const notes = [523, 659, 784, 659, 880];
    notes.forEach((freq, index) => {
      voice(g, { at: t + index * 0.13, dur: 0.19, gain: 0.045, sweep: [freq, freq * 1.025], type: "sine" });
    });
  },
};

/*
 * Petting is a hold, and a held pointer can fire repeatedly. Retriggering a two-second purr on top
 * of itself stacks into a drone, so a repeat inside the window is dropped rather than layered.
 */
const MIN_GAP_SECONDS = 0.35;
const lastPlayed = new Map<Cue, number>();

/*
 * Schedule slightly ahead of now, never at now.
 *
 * The audio thread has already rendered up to currentTime by the time this runs, so a note booked
 * for exactly currentTime lands in the past and the hardware skips whatever it missed. That doesn't
 * silence the cue, which is why it's easy to miss: it eats the attack and you get the tail. Traced
 * on a cold context, a mrrp produced nothing for 100ms and then appeared already decaying, while a
 * chirp scheduled the same way was fine, purely because it happened to be second. 20ms is under the
 * threshold where a delay is perceptible and comfortably clears one render quantum.
 */
const LOOKAHEAD_SECONDS = 0.02;

export function play(cue: Cue): void {
  const g = graph();
  if (!g) return;
  const at = g.ctx.currentTime + LOOKAHEAD_SECONDS;
  if (at - (lastPlayed.get(cue) ?? -Infinity) < MIN_GAP_SECONDS) return;
  lastPlayed.set(cue, at);
  CUES[cue](g, at);
}

/*
 * A very small cat, built out of oscillators and noise. No sound files. See DECISIONS.md.
 *
 * A purr is not a note. It is a rumble whose volume flutters about 25 times a second, and that
 * flutter is the "pitch" you think you hear. Its real pitch is too low for a phone speaker, so this
 * flutters filtered noise instead, which comes out of a small speaker intact.
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
 * Build the graph on the first gesture anywhere. She reacts to things that aren't gestures, like the
 * other person arriving, and iOS only resumes an audio context inside one, so without this the sounds
 * that matter most are the ones that get dropped.
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
 * Two seconds of brown noise, generated once and reused. Brown rather than white: white is all treble
 * and reads as radio static, and tilting the spectrum down sounds like an animal and a hairbrush.
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

// Whose cat is talking. Module state, not an argument, so every cue after the room says which cat it
// is drawing belongs to that cat. `settled` only reaches the purr: how fast an animal purrs says how
// it feels, everything else says which animal it is.
let pitch = 1;
let settled = 0.5;

/** Called by the room whenever the cat or her mood changes. */
export function setVoice(v: { pitch?: number; settled?: number }): void {
  // Clamped: a stray value here does not make a cat, it makes a kettle.
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
  | "rain"
  | "glint"
  | "hello";

const CUES: Record<Cue, (g: { ctx: AudioContext; master: GainNode }, t: number) => void> = {
  /*
   * 26 Hz flutter under a 380 Hz lowpass. Slow in, slow out, because a purr that starts at full
   * volume is a machine and a purr that fades is an animal deciding you're staying a while.
   */
  purr: (g, t) => {
    /*
     * The flutter rate is how she is.
     *
     * A real purr sits near 25 Hz, and it slows when a cat is heavy-eyed and quickens when she is
     * pleased. Everything else about the sound stays put: this is the same purr, at the speed of the
     * mood she was told about, not a different noise per feeling.
     */
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

  /* The greeting: up and back down in under a fifth of a second, with a fast trill on top. */
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

  /*
   * The one she only ever makes once.
   *
   * A room has exactly one first moment and it was silent: `firstEver` put her by the door and that
   * was the whole of it. Three notes rather than mrrp's two, climbing and then holding, so it is
   * audibly not the greeting she gives every other day. Nothing else in here plays it, and after the
   * first read of a room nothing ever will again.
   */
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
    // A quiet upper voice on the last note only, which is what makes it read as pleased rather than
    // as a longer mrrp.
    voice(g, { at: t + 0.25, dur: 0.42, gain: 0.04, sweep: p([1640, 1800, 1680]), type: "sine" });
  },

  /*
   * A light passed through the window, and collected on the other side.
   *
   * Borrowed `twinkle` before, which is the app's general-purpose sparkle and fires for eleven other
   * things. This is the only object that travels between the two of them, so it gets a sound nobody
   * else has: two notes, up then settling, rather than twinkle's single shimmer.
   */
  glint: (g, t) => {
    voice(g, { at: t, dur: 0.16, gain: 0.07, sweep: [880, 1180], type: "sine" });
    voice(g, { at: t + 0.12, dur: 0.26, gain: 0.05, sweep: [1320, 1245], type: "sine" });
  },

  /*
   * Rain on the glass, which was drawn and silent.
   *
   * A bandpass around 1.4k over the same noise the brush uses: high enough to be water on a window
   * rather than wind, narrow enough not to hiss. Quiet on purpose. This plays under a room somebody
   * is looking at in bed, and rain you have to notice is better than rain you have to tolerate.
   */
  rain: (g, t) => {
    rumble(g, { at: t, dur: 2.4, gain: 0.05, filter: "bandpass", from: 1400, q: 0.6, attack: 0.5 });
    rumble(g, { at: t, dur: 2.4, gain: 0.03, filter: "highpass", from: 2600, attack: 0.5 });
  },

  /* Shorter and higher than a mrrp. What she says when she notices, rather than when she greets. */
  /*
   * The stutter a cat makes at a bird it cannot reach.
   *
   * Six clipped chirps in a row rather than one, because the sound is the rhythm: a single chirp is
   * her noticing something, and the machine-gun repeat is the frustration, which is the whole joke of
   * it. Rising slightly across the run, the way it does when she works herself up.
   */
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
 * Schedule slightly ahead of now, never at now. The audio thread has already rendered up to
 * currentTime, so a note booked for exactly currentTime lands in the past and the hardware skips what
 * it missed. It does not silence the cue, which is why it is easy to miss: it eats the attack and you
 * get the tail. 20ms is imperceptible and clears one render quantum.
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

/*
 * A short pulse in the hand, for the two gestures that are touch rather than tap.
 *
 * Only petting and brushing: those are the ones where your finger is on her for a while, and a phone
 * that answers the touch is the closest this app gets to her being in the room. Everything else here
 * is a button, and buzzing a button is a notification.
 *
 * Guarded, not assumed. iOS Safari has never implemented this, and some Android builds throw rather
 * than return false when the page has no user activation.
 */
export function buzz(kind: "pet" | "brush"): void {
  if (isMuted()) return;
  try {
    navigator.vibrate?.(kind === "pet" ? 12 : [8, 40, 8]);
  } catch {
    // A phone that will not buzz is not a problem worth reporting.
  }
}

/** One of the five soft pentatonic notes under the hidden paw piano. */
export function playPianoNote(index: number): void {
  const g = graph();
  if (!g) return;
  const notes = [392, 494, 587, 659, 784];
  const frequency = notes[Math.max(0, Math.min(notes.length - 1, Math.round(index)))]!;
  const at = g.ctx.currentTime + LOOKAHEAD_SECONDS;
  voice(g, { at, dur: 0.3, gain: 0.055, sweep: [frequency, frequency * 1.012], type: "sine" });
}

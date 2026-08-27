import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, Arrival, Cat as CatLook, Mood, RoomView } from "./types.js";
import { ACTIONS, MOODS } from "./types.js";
import {
  doAct,
  doClock,
  doDress,
  doNotes,
  doRecover,
  doRelease,
  doSay,
  doTell,
  doTidy,
  doWindowLight,
  fetchRoom,
  lastCat,
  lastRoom,
  myName,
  newRoomId,
  roomFromPath,
} from "./api.js";
import { Cat } from "./Cat.js";
import { dayApart, mixHex, sceneFor, type Scene } from "./hours.js";
import { moonLine } from "./moon.js";
import { EYES, LOOKS, timezones } from "./looks.js";
import { MoodFace } from "./faces.js";
import type { Cue } from "./sound.js";
import { buzz, isMuted, play, setVoice, toggleMuted } from "./sound.js";
import s from "./App.module.css";
import { makeKeepsake } from "./keepsake.js";
import { faviconFor } from "./favicon.js";
import { foundKeys, noticed } from "./discoveries.js";
import { awayLine, milestoneLine, personalityLine } from "./remembers.js";
import { myToken } from "./api.js";

/* What each button sounds like. Sitting with her is the only one that answers with a purr: the rest
   are things you do to a cat, and that one is a cat deciding to stay. */
const ACTION_SOUND: Record<Action, Cue> = {
  pet: "purr",
  brush: "brush",
  bring: "thump",
  sit: "settle",
  photo: "shutter",
};

/*
 * Sound is on by default, which is only defensible because a browser will not start an audio
 * context until you touch something: the first noise she can make is an answer to your own tap.
 * Fixed to the corner rather than in a settings panel, because this room gets opened next to
 * sleeping people and "make it stop" has to be reachable from anywhere in it.
 */
function SoundToggle() {
  const [off, setOff] = useState(isMuted);
  return (
    <button
      type="button"
      onClick={() => setOff(toggleMuted())}
      aria-pressed={off}
      aria-label={off ? "Turn sound on" : "Turn sound off"}
      className={s.soundToggle}
    >
      <SpeakerMark off={off} />
    </button>
  );
}

/*
 * The speaker, drawn.
 *
 * This was 🔊 and 🔇: a full-colour raster glyph the reader's OS picks, sitting in the corner of an
 * app where every other visible mark is authored, and changing shape entirely between an iPhone, an
 * Android and a laptop. Same reasoning as the icon grid in scripts/icons.mjs. Two waves on, a slash
 * off, on the same 16-unit box the rest of the drawing uses.
 */
function SpeakerMark({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden
      focusable="false"
      style={{ display: "block" }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6.2h2.3L8.4 3.6v8.8L5.3 9.8H3z" fill="currentColor" stroke="currentColor" />
        {off ? (
          <path d="M11 6.2l3.2 3.6M14.2 6.2L11 9.8" />
        ) : (
          <>
            <path d="M10.8 6.1a2.6 2.6 0 0 1 0 3.8" />
            <path d="M12.7 4.4a5 5 0 0 1 0 7.2" />
          </>
        )}
      </g>
    </svg>
  );
}

/*
 * The same paw the postcard signs off with, drawn once here and once on the canvas.
 *
 * A mark rather than the word "mrrp". The footer already ends with a credit, and the block was put
 * together in the first place so two quiet things would stop competing to be last; a second name
 * would undo that. The room says what it is by being the room, and this ties it to the keepsake,
 * which carries the same paw beside the same name.
 */
function PawMark() {
  return (
    <svg viewBox="0 0 22 22" width="11" height="11" aria-hidden focusable="false" className={s.paw}>
      <g fill="currentColor">
        <ellipse cx="4" cy="5" rx="2.6" ry="3" />
        <ellipse cx="10" cy="3" rx="2.8" ry="3.2" />
        <ellipse cx="16" cy="5" rx="2.6" ry="3" />
        <ellipse cx="20.5" cy="10" rx="2.2" ry="2.5" />
        <ellipse cx="11" cy="15" rx="7.5" ry="5.8" />
      </g>
    </svg>
  );
}

/*
 * The mark against each line in the arrivals list.
 *
 * A filled dot for something she said, a small burst for something one of you found, a leaf for a
 * keepsake, a plain dot for anything else. Drawn on the same 10-unit box so the column stays even
 * whichever mark a row gets.
 */
function ArrivalMark({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden
      focusable="false"
      style={{ display: "block" }}
    >
      {kind === "found" ? (
        <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M5 1v2.4M5 6.6V9M1 5h2.4M6.6 5H9" />
        </g>
      ) : kind === "kept" ? (
        <path
          d="M5 1.4c2.4 0 3.6 1.4 3.6 3.4S7.2 8.6 5 8.6 1.4 6.8 1.4 4.8 2.6 1.4 5 1.4z"
          fill="currentColor"
        />
      ) : (
        <circle cx="5" cy="5" r={kind === "line" ? 2.6 : 1.6} fill="currentColor" />
      )}
    </svg>
  );
}

/** Copy with the small fallback needed by older browsers and embedded web views. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

/** A recovery code only helps if it can leave this phone before it is lost. */
function RecoveryCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <p className={s.code} style={{ flex: 1 }}>
        {code}
      </p>
      {/* The label carries the result, so a screen reader hears the copy happen. A live region for a
          button whose own text changes would announce it twice. */}
      <button
        type="button"
        className={s.btn}
        style={{ flexShrink: 0, padding: "9px 11px", fontSize: FS.micro }}
        onClick={() => void copy()}
        aria-label={copied ? "Recovery code copied" : "Copy the recovery code"}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/**
 * What to say out loud when a secret fires. The visual reward is the whole payoff, so without this a
 * screen reader user does the work of finding one and is told nothing. Phrased as observations of the
 * room rather than confirmations, for the same reason the room never says "unlocked".
 */
export const FOUND_ANNOUNCEMENTS: Record<string, string> = {
  constellation: "the stars in the window have all come out.",
  roomTour: "the whole room is awake at once.",
  piano: "the floorboards are playing notes.",
  bubbles: "bubbles are drifting through the room.",
  aurora: "lights are moving across the window.",
  mrrp: "she is purring.",
  summon: "she has come over.",
  herName: "she knows her own name.",
  box: "a box has turned up.",
  yarn: "there is yarn on the floor now.",
  treat: "she has found a treat.",
  catnip: "the catnip has arrived.",
  music: "music is playing.",
  mouse: "a mouse just ran along the wall.",
};

/** "this morning", "yesterday evening" — warmer and vaguer than a timestamp, which is the point. */
function whenish(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 3) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const sameDay = new Date(at).toDateString() === new Date().toDateString();
  const h = new Date(at).getHours();
  const part = h < 5 ? "in the night" : h < 12 ? "this morning" : h < 18 ? "this afternoon" : "this evening";
  if (sameDay) return part;
  const days = Math.floor((Date.now() - at) / 86400000);
  if (days <= 1) return `yesterday ${part.replace("this ", "")}`;
  return `${days} days ago`;
}

const pastTense = (a: Action) => ACTIONS.find((x) => x.id === a)?.past ?? "was here";

/** What she left on the floor, named so the sentence about it reads like a thing rather than a type. */
const GIFT_NAMES: Record<string, string> = {
  leaf: "leaf",
  cap: "bottle cap",
  moth: "moth",
};

/*
 * What to call a secret the other person found. Only reachable when the viewer has found it too, since
 * the server sends `what: null` otherwise. Phrased as a thing that happened in the room rather than a
 * feature with a label: "the piano in the floorboards", not "piano easter egg".
 */
const FOUND_NAMES: Record<string, string> = {
  constellation: "the stars in the window",
  roomTour: "every corner of the room",
  piano: "the piano in the floorboards",
  bubbles: "the bubbles",
  aurora: "the lights over the window",
  mrrp: "what she does when you say her word",
  summon: "that she comes when called",
  herName: "that she knows her own name",
  box: "the box that turns up",
  yarn: "the yarn",
  treat: "where the treats are",
  catnip: "the catnip",
  music: "the music",
  mouse: "the mouse",
};

/** A one-read postcard assembled from things the other person did between visits. */
function ArrivalCard({ name, items, onClose }: { name: string; items: Arrival[]; onClose: () => void }) {
  return (
    <section className={s.arrival} aria-label="Things the room kept for you">
      <div className={s.arrivalTop}>
        <div>
          <p className={s.arrivalTitle}>the room kept this for you</p>
          <p className={s.small} style={{ marginTop: 2 }}>
            It waited here until you looked in.
          </p>
        </div>
        <button type="button" onClick={onClose} className={s.arrivalClose} aria-label="Put away arrival card">
          ×
        </button>
      </div>
      <ul className={s.arrivalList}>
        {items.map((item, index) => (
          <li key={`${item.kind}-${item.at}-${index}`} className={s.arrivalItem}>
            {/* Drawn, not dingbats. ✦ ✧ ❧ come from whatever font resolves them, and ❧ in particular
                is not in every face, so the list used to change character between devices. */}
            <span className={s.arrivalPaw} aria-hidden>
              <ArrivalMark kind={item.kind} />
            </span>
            <span>
              {item.kind === "action" ? (
                <>
                  <b>{name}</b> {pastTense(item.action)}.
                </>
              ) : item.kind === "mood" ? (
                <>
                  <b>{name}</b> said she was {MOODS.find((m) => m.id === item.mood)?.said ?? item.mood}.
                </>
              ) : item.kind === "found" ? (
                item.what ? (
                  <>
                    <b>{name}</b> found {FOUND_NAMES[item.what] ?? "something in here"} too.
                  </>
                ) : (
                  /* Unnamed on purpose: there is something in here he has not walked into yet, and
                     telling him what it is would spend the best part of it for him. */
                  <>
                    <b>{name}</b> found something in here you haven&apos;t seen yet.
                  </>
                )
              ) : item.kind === "kept" ? (
                /* The one arrival that closes a loop rather than reporting a new thing: she left it,
                   he took it, and this is the only way she finds out. */
                <>
                  <b>{name}</b> took the {GIFT_NAMES[item.gift] ?? "thing"} you left.
                </>
              ) : (
                <>
                  <b>{name}</b> left: “{item.text}”
                </>
              )}
              <small className={s.arrivalWhen}>{whenish(item.at)}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A tint per mood, for the one control she actually touches.
 *
 * Very low saturation, all in the room's creams, clays and roses. Saturated chips read as a paintbox,
 * and a paintbox beside hand-authored pixel art looks like two different apps. Nothing dark or cold:
 * what she taps on a bad day should not look like a bad day.
 */
/*
 * The daylight tints. `moodTint` takes them somewhere dark when the room is.
 *
 * Note how close these are to each other: sad, done and tired differ by six across all three
 * channels. That is on purpose and worth knowing before "improving" them. The tint is a whisper of
 * warmth, not a code for which mood is which, and the label and the face do the identifying.
 */
const MOOD_TINT: Record<string, string> = {
  good: "#f8e3b8",
  tired: "#e7ddd0",
  stressed: "#f2dcc9",
  sad: "#e4dfd4",
  lonely: "#f0dcd8",
  bored: "#e6e3d2",
  feral: "#f6dcc4",
  done: "#e3dcd2",
  horny: "#f2d4d6",
};

export function App() {
  const id = roomFromPath();
  if (id) lastRoom.set(id);
  return id ? <RoomPage id={id} /> : <Landing />;
}

/**
 * Launched from a home screen icon rather than opened in a browser, which decides whether the front
 * door sends you straight to your room. In a normal tab that would be hijacking: you typed the address,
 * you should get the page. From the installed icon it is the only correct behaviour.
 */
const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/**
 * The cat the front door shows, before anybody has made a room. She explains this app faster than a
 * sentence can. Ginger tabby, which is what a new room ships with, so the door is not advertising a
 * cat you then have to go and build.
 *
 * The viewer's own timezone, so she is doing whatever fits the hour where they are.
 */
/** Long enough that it cannot be an accident, short enough to happen inside one sitting. */
const STAY_MS = 180_000;

const DOOR_CAT = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
const DOOR_CLOCK = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  homeHour: 19,
};

/*
 * The hour the door is standing in.
 *
 * The landing and the offline screens draw a room on the viewer's own clock, so the page around that
 * room has to run on the same clock. Without this the frame is midnight inside a cream afternoon.
 * Ticked once a minute because the canvas keeps moving on its own and nobody promises to go in
 * before sunset.
 */
function useDoorScene(): Scene {
  const [at, setAt] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAt(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return sceneFor(DOOR_CLOCK, at, null, false);
}

/* ─────────────── landing: make a room, send the link ─────────────── */
function Landing() {
  const back = lastRoom.get();
  const wantsNew = new URLSearchParams(location.search).has("new");

  // From the home screen icon, go where she meant to go. `?new` is the way out, for making a second room.
  useEffect(() => {
    if (back && installed() && !wantsNew) location.replace(`/r/${back}`);
  }, [back, wantsNew]);

  const [name, setName] = useState(myName.get() ?? "");
  const door = useDoorScene();
  const make = () => {
    if (!name.trim()) return;
    myName.set(name.trim());
    location.href = `/r/${newRoomId()}`;
  };
  return (
    <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
      <ChromeSync night={isNightChrome(door.sun)} />
      <div className={s.card} style={{ textAlign: "center" }}>
        <div className={s.stage} style={{ marginBottom: 14 }}>
          <Cat
            label="A pixel cat asleep in a sunlit room."
            look={DOOR_CAT}
            clock={DOOR_CLOCK}
            mood={null}
            nudge={0}
          />
        </div>
        <h1 className={s.h1}>mrrp</h1>
        {/* Written for somebody who has never heard of this. "A cat that is her" made sense only if you
            already knew, which was fine while it had one user and is not any more. Says the mechanism
            first, because the mechanism is the charming part. */}
        <p className={s.lede} style={{ margin: "0 auto 14px" }}>
          One of you is the cat. You make the room; whoever you send the link to becomes her. They tap how
          their day is going and she becomes that, so you know without having to ask.
        </p>
        <p className={s.lede} style={{ margin: "0 auto 18px", fontSize: FS.body }}>
          Then you turn up and sit with her. No accounts, no notifications, nothing to keep up with.
        </p>
        {/* In a browser tab this is an offer rather than a redirect, so the page you asked for is the
            page you get, and making a second room stays possible. */}
        {back && (
          <button
            className={`${s.btn} ${s.btnGo}`}
            style={{ width: "100%", marginBottom: 14 }}
            onClick={() => location.assign(`/r/${back}`)}
          >
            Back to the room
          </button>
        )}
        {back && (
          <p className={s.small} style={{ marginBottom: 14 }}>
            Or start another one for somebody else.
          </p>
        )}
        <input
          className={s.input}
          value={name}
          maxLength={24}
          placeholder="your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && make()}
        />
        {/* Whichever one you actually want is the gold one. Two gold buttons stacked is the mistake I
            already made on his side: they compete and neither reads as the answer. Somebody with a room
            already is almost certainly coming back to it. And it is not "her" room any more, because the
            person on the other end is no longer assumed to be a her. */}
        <button
          className={`${s.btn} ${back ? "" : s.btnGo}`}
          style={{ width: "100%", marginTop: 10 }}
          onClick={make}
          disabled={!name.trim()}
        >
          Make a room
        </button>
        <p className={s.small} style={{ marginTop: 14 }}>
          You'll get a link. Send it to one person. That's the whole thing.
        </p>
        {/* A link here and plain text inside a room, on purpose. This page is the one strangers see, so
            a credit that goes somewhere belongs. In the room the only two people are the two it is for,
            and a link pointing away from a note she is reading turns a signature into a byline with a
            call to action, which is the one thing this app has refused to be all along. */}
        <p className={s.credit}>
          made by{" "}
          <a href="https://aidenjang.com" target="_blank" rel="noopener noreferrer" className={s.creditLink}>
            aiden jang
          </a>
        </p>
      </div>
    </main>
  );
}

/* ─────────────── the room ─────────────── */
function RoomPage({ id }: { id: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [captureRoom, setCaptureRoom] = useState<(() => Promise<Blob | null>) | null>(null);
  /** The room's objects and a way to touch them without a pointer. See Cat's onProps. */
  const [roomProps, setRoomProps] = useState<{
    props: { key: string; label: string }[];
    poke: (key: string) => void;
  } | null>(null);
  /** What just happened, for anybody who cannot see the room react. */
  const [found, setFound] = useState("");
  const [imageStatus, setImageStatus] = useState<"saving" | "shared" | "saved" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const handleCaptureReady = useCallback((capture: () => Promise<Blob | null>) => {
    setCaptureRoom(() => capture);
  }, []);
  /*
   * Memoized, and it has to be.
   *
   * Cat's effect that reports the room's props lists this in its dependencies, and calling it sets
   * state up here. An inline arrow gets a new identity on every render, so the effect re-ran, set
   * state, re-rendered, and handed itself a new callback: React's "Maximum update depth exceeded",
   * looping forever on the app's main screen. `onCapture` above already had the same shape and the
   * same fix; this one was missed.
   */
  const handleRoomProps = useCallback(
    (props: { key: string; label: string }[], poke: (key: string) => void) => {
      setRoomProps({ props, poke });
    },
    [],
  );
  /** Put the mug back. Either seat may, so this is not gated on being him. */
  const tidy = useCallback(async () => {
    const r = roomFromPath();
    if (!r) return;
    try {
      await doTidy(r);
      setView(await fetchRoom(r));
    } catch {
      // A failed tidy is not worth an error banner. The mug is still on the floor; tap it again.
    }
  }, []);
  const windowLightPending = useRef(false);
  const touchWindowLight = useCallback(async () => {
    if (windowLightPending.current) return;
    windowLightPending.current = true;
    try {
      setView(await doWindowLight(id));
    } catch {
      // It is an easter egg, not a form. A failed glint leaves the ordinary window untouched.
    } finally {
      windowLightPending.current = false;
    }
  }, [id]);

  const saveRoomImage = async (): Promise<void> => {
    if (!captureRoom || imageStatus) return;
    setImageStatus("saving");
    try {
      const roomBlob = await captureRoom();
      if (!roomBlob) throw new Error("capture unavailable");
      const currentScene = view ? sceneFor(view.clock, Date.now(), view.catMood, view.bothHereNow) : null;
      const blob = await makeKeepsake(roomBlob, {
        catName: view?.cat.name ?? "the cat",
        doing: currentScene?.doing ?? "keeping the room warm",
        together: view?.bothHereNow ?? false,
        night: currentScene ? isNightChrome(currentScene.sun) : false,
        day: view?.note?.day ?? view?.noteDay ?? undefined,
      });
      if (!blob) throw new Error("postcard unavailable");
      const slug =
        view?.cat.name
          ?.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "mrrp";
      // Dated, because every card used to save as the same name and the second one became
      // "bean-postcard (1)". A keepsake should sort next to the others, not queue behind them.
      const fileName = `${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const share = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      // Sharing the actual image feels right on a phone (Messages, WhatsApp, etc.). `canShare` is
      // essential: Safari can expose navigator.share while declining files, in which case we keep
      // the ordinary PNG download rather than showing a share sheet that cannot complete.
      if (navigator.share && share.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: `${view?.cat.name ?? "mrrp"}'s room`, files: [file] });
          setImageStatus("shared");
          window.setTimeout(() => setImageStatus(null), 2200);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            setImageStatus(null);
            return;
          }
        }
      }
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      setImageStatus("saved");
      window.setTimeout(() => setImageStatus(null), 2200);
    } catch {
      setImageStatus(null);
    }
  };

  const [doorOpenAt, setDoorOpenAt] = useState<number | null>(null);
  const wasHere = useRef<boolean | null>(null);
  const youArrived = useRef(false);

  /*
   * The door swings on an arrival: yours on first paint, theirs on the edge into presence. Opening
   * only for them almost never fires, since both of you have to be here at once inside one poll.
   * Watch the edge, not the value: `themHereNow` stays true for a whole visit.
   */
  // Read out first, so the dependency is the value the effect actually uses. Depending on the whole
  // view would re-run this on every poll, since each fetch returns a new object; null covers both the
  // not-loaded-yet case and a spectator, neither of which is an arrival.
  const yourSeat = view?.you ?? null;
  useEffect(() => {
    if (yourSeat === null || youArrived.current) return;
    youArrived.current = true;
    setDoorOpenAt(Date.now());
    const t = setTimeout(() => setDoorOpenAt(null), 4200);
    return () => clearTimeout(t);
  }, [yourSeat]);
  /*
   * Coming and going both swing the door; only one of them gets a sound.
   *
   * Arriving was marked twice over and leaving was not marked at all, so the room had a cat who was
   * delighted to see you and indifferent to your going. `themHereNow` falls when their presence
   * window lapses rather than the instant they close the tab, which is late but not wrong: it is
   * still the moment she is on her own again.
   */
  /*
   * Being in the room, which the room asks for and has never once answered.
   *
   * Pointer *movement* deliberately does not count: a mouse nudged on the way past is not somebody
   * leaving, and moving the cursor near her already earns a slow blink. Only a real action resets it,
   * along with the tab going away, so this cannot run while nobody is looking.
   */
  const [staying, setStaying] = useState(false);
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      setStaying(false);
      window.clearTimeout(timer);
      if (document.hidden || !document.hasFocus()) return;
      timer = window.setTimeout(() => setStaying(true), STAY_MS);
    };
    const acts = ["pointerdown", "keydown", "touchstart"] as const;
    arm();
    acts.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    document.addEventListener("visibilitychange", arm);
    window.addEventListener("focus", arm);
    window.addEventListener("blur", arm);
    return () => {
      window.clearTimeout(timer);
      acts.forEach((e) => window.removeEventListener(e, arm));
      document.removeEventListener("visibilitychange", arm);
      window.removeEventListener("focus", arm);
      window.removeEventListener("blur", arm);
    };
  }, []);

  const [watchDoorAt, setWatchDoorAt] = useState<number | null>(null);
  useEffect(() => {
    const here = view?.themHereNow ?? false;
    const prev = wasHere.current;
    wasHere.current = here;
    if (prev === null || prev === here) return;
    if (here) play("chirp");
    else setWatchDoorAt(Date.now());
    setDoorOpenAt(Date.now());
    const t = setTimeout(() => setDoorOpenAt(null), 4200);
    return () => clearTimeout(t);
  }, [view?.themHereNow]);

  const [nudge, setNudge] = useState(0);

  /*
   * She says mrrp the moment it becomes both of you. Reuses `nudge` rather than adding a channel: it
   * already means "something happened, react to it" and gives the bounce and bubble together. Edge
   * only, or a long visit becomes a cat chanting at the poll interval.
   */
  const wasTogether = useRef<boolean | null>(null);
  useEffect(() => {
    const now = view?.bothHereNow ?? false;
    const prev = wasTogether.current;
    wasTogether.current = now;
    if (prev === null || !now || prev) return;
    play("mrrp");
    setNudge((v) => v + 1);
  }, [view?.bothHereNow]);

  const [asking, setAsking] = useState(!myName.get());
  const [name, setName] = useState("");
  const [shareResult, setShareResult] = useState<"copied" | "shared" | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [arrivalCard, setArrivalCard] = useState<Arrival[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupErr, setSetupErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    look: string;
    eyes: string;
    tz: string;
    homeHour: number;
    notes: string;
  } | null>(null);

  /*
   * She answers to the name once you settle on it. Debounced rather than per-keystroke: reacting to
   * every letter makes her twitchy and turns her into a progress bar, where a beat of stillness and
   * then a look up reads as hearing it. Seeded with the open value so opening the panel is silent.
   */
  const heardName = useRef<string | null>(null);
  useEffect(() => {
    const called = draft?.name.trim() ?? "";
    if (!setup) {
      heardName.current = null;
      return;
    }
    if (heardName.current === null) {
      heardName.current = called;
      return;
    }
    if (!called || called === heardName.current) return;
    const t = setTimeout(() => {
      heardName.current = called;
      play("chirp");
      setNudge((v) => v + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [setup, draft?.name]);

  const load = useCallback(
    async (n?: string | null) => {
      try {
        const next = await fetchRoom(id, n ?? myName.get());
        setView(next);
        lastCat.set(id, next.cat);
        // Polls return an empty list after the server advances this seat's last-seen marker. Keep the
        // postcard on screen until the person puts it away, rather than flashing it for 15 seconds.
        if (next.arrivals.length > 0) setArrivalCard(next.arrivals);
        setErr(null);
      } catch (e) {
        setErr(`${e instanceof Error ? e.message : "Something went wrong."} Trying again in a moment.`);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!asking) void load();
  }, [asking, load]);

  /*
   * Retry quickly while there is nothing on screen. A failed first load otherwise leaves "Something
   * went wrong" sitting there until the slow poll comes round, which on a phone on a weak connection
   * is the normal case. Stops once the room has loaded: after that a dropped request is a quiet line.
   */
  useEffect(() => {
    if (asking || view || !err) return;
    const t = setTimeout(() => void load(), 2500);
    return () => clearTimeout(t);
  }, [asking, view, err, load]);

  // No socket: the room is asynchronous by design, so a quiet poll is enough to turn "was here" into
  // "is here" while the tab is open.
  //
  // Skip hidden tabs. A phone left on this page overnight is ~1,900 Durable Object requests rendering
  // a sleeping cat to a screen nobody is looking at; one fetch on becoming visible covers it.
  useEffect(() => {
    if (asking) return;
    /*
     * 15s while the tab is visible. The door is a promise that something is happening *now*, and one
     * that opens three quarters of a minute after somebody walked in reads as broken rather than late.
     * The hidden-tab check above means this only costs a read from a tab someone is looking at.
     */
    const tick = setInterval(() => {
      if (!document.hidden) void load();
    }, 15_000);
    const onShow = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [asking, load]);

  const act = async (a: Action) => {
    setNudge((v) => v + 1);
    play(ACTION_SOUND[a]);
    // Both the button and the hold-to-pet gesture come through here, so this is the only place the
    // two gestures that are actually touch need naming.
    if (a === "pet" || a === "brush") buzz(a);
    try {
      setView(await doAct(id, a));
      // He gets one line back, phrased the way she'll read it, so the button does something visible.
      const said = ACTIONS.find((x) => x.id === a)?.mine;
      if (said) {
        setDid(said);
        setTimeout(() => setDid(null), 2600);
      }
    } catch {
      /*
       * Say so. The bounce and the sound fire before the request, so a failed action looked exactly
       * like a successful one: you would believe you had petted her and she would never know.
       * Quiet, because the room's rule is not to announce things, but not silent, because this is
       * the one case where quiet reads as done.
       */
      setErr("That didn't reach her. Try it again.");
      setTimeout(() => setErr(null), 4000);
    }
  };

  /** Opening the panel seeds the draft from whatever the room already has. */
  const openSetup = () => {
    if (!view) return;
    const look =
      LOOKS.find((l) => l.cat.fur.toLowerCase() === view.cat.fur.toLowerCase())?.id ?? LOOKS[0]!.id;
    const eyes = EYES.find((e) => e.hex.toLowerCase() === view.cat.eyes.toLowerCase())?.id ?? EYES[0]!.id;
    setDraft({
      name: view.cat.name,
      look,
      eyes,
      tz: view.clock.tz,
      homeHour: view.clock.homeHour,
      // Seeded from whatever the room runs on, which for an untouched room is the defaults. Editing
      // from a real starting point is far easier than facing an empty box.
      notes: (view.yourNotes ?? []).join("\n"),
    });
    setSetup(true);
  };

  /*
   * Focus around the setup panel.
   *
   * Opening it unmounts the button that opened it, so focus fell to <body>: the panel arrived with no
   * announcement and the next Tab started again from the top of the document. Closing it did the same
   * in reverse. The panel takes focus on open, and the trigger takes it back on close.
   */
  const setupTrigger = useRef<HTMLButtonElement>(null);
  const setupPanel = useRef<HTMLDivElement>(null);
  const wasSetup = useRef(false);
  useEffect(() => {
    if (setup && !wasSetup.current) setupPanel.current?.focus();
    if (!setup && wasSetup.current) setupTrigger.current?.focus();
    wasSetup.current = setup;
  }, [setup]);

  const saveSetup = async () => {
    if (!draft) return;
    // He has just decided who she is. `settle` is the same sound as sitting down with her: done,
    // rather than congratulations.
    play("settle");
    const look = LOOKS.find((l) => l.id === draft.look)!;
    const eyes = EYES.find((e) => e.id === draft.eyes)!;
    setSavingSetup(true);
    setSetupErr(null);
    try {
      await doDress(id, { name: draft.name.trim() || "Bean", ...look.cat, eyes: eyes.hex });
      await doClock(id, { tz: draft.tz, homeHour: draft.homeHour });
      await doNotes(id, draft.notes.split("\n"));
      setSetup(false);
      await load();
    } catch (e) {
      setSetupErr(e instanceof Error ? e.message : "Couldn't save that.");
    }
    setSavingSetup(false);
  };

  const say = async () => {
    setSaving(true);
    try {
      setView(await doSay(id, line));
      setLineOpen(false);
    } catch {
      /* she'll survive */
    }
    setSaving(false);
  };

  /**
   * Optimistic on purpose. Waiting for the round trip means that on anything slower than a desk
   * connection, tapping a mood feels like it did not register. The mood is hers and the server never
   * rejects a valid one, so showing it immediately is honest.
   */
  const tell = async (m: Mood) => {
    /*
     * The cat notices.
     *
     * All five of his actions map to a cue; the one thing she does every day had none, so her side
     * of the room was silent. A chirp rather than a mrrp: a mrrp is what she says to you when you
     * arrive, and this is her registering something you told her.
     */
    play("chirp");
    setNudge((v) => v + 1);
    setNudge((v) => v + 1);
    setView((v) => (v ? { ...v, catMood: m, catMoodAt: Date.now() } : v));
    try {
      setView(await doTell(id, m));
    } catch {
      void load(); // put the real state back if it never landed
    }
  };

  const shareRoom = async () => {
    const resetResult = (result: "copied" | "shared") => {
      setShareResult(result);
      setTimeout(() => setShareResult(null), 2200);
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "mrrp",
          text: `I made a room with ${view?.cat.name ?? "a cat"} for you.`,
          url: location.href,
        });
        resetResult("shared");
        return;
      } catch (e) {
        // Dismissing the sheet is a choice, not an error to turn into a
        // surprise clipboard write. Other failures retain that fallback.
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    if (await copyText(location.href)) resetResult("copied");
  };

  // Both screens below stand at the door rather than in a room, and neither can call a hook of its own.
  const door = useDoorScene();
  // Her clock is on the server, so the offline room still runs on the viewer's. Her coat is not, and
  // showing the door's ginger stranger was the room forgetting whose it was at the worst moment.
  const remembered = lastCat.get(id);
  const knownCat = remembered ?? DOOR_CAT;

  if (asking) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        <div className={s.card} style={{ textAlign: "center" }}>
          <h1 className={s.h1}>mrrp</h1>
          <p className={s.lede} style={{ margin: "0 auto 20px" }}>
            Someone made you a cat.
          </p>
          <input
            className={s.input}
            value={name}
            maxLength={24}
            placeholder="your name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                myName.set(name.trim());
                setAsking(false);
              }
            }}
          />
          <button
            className={`${s.btn} ${s.btnGo}`}
            style={{ width: "100%", marginTop: 10 }}
            disabled={!name.trim()}
            onClick={() => {
              myName.set(name.trim());
              setAsking(false);
            }}
          >
            Go in
          </button>
        </div>
      </main>
    );
  }

  // Only a total failure with nothing to show gets the whole page. Once the room has loaded once, a
  // dropped request is a quiet line at the bottom, not the cat vanishing.
  if (!view) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        {/* Only once this device has actually seen the room. Titling a stranger's failed first load
            after the door's demo cat would be naming a cat that is not theirs. */}
        {remembered && (
          <>
            <DocTitle name={remembered.name} />
            <FaviconSync cat={remembered} />
          </>
        )}
        <div className={s.card} style={{ textAlign: "center" }}>
          {/* The cat, even here. The app opens from cache on a bad connection, so this screen is what
              she sees standing on a train with no signal, and an empty page with an error on it is a
              worse thing to be handed than a sleeping cat and a promise to keep trying. */}
          <div className={s.stage}>
            <Cat
              label={`${knownCat.name} asleep in a sunlit room.`}
              look={knownCat}
              clock={DOOR_CLOCK}
              mood={null}
              nudge={0}
            />
          </div>
          <p className={s.small} style={{ marginTop: 16 }}>
            {err ?? "opening the door quietly…"}
          </p>
        </div>
      </main>
    );
  }

  const last = view.theirRecent[0];
  // Same four inputs the canvas uses, so the caption under the room can never describe a different
  // cat from the one being drawn.
  const scene = sceneFor(view.clock, Date.now(), view.catMood, view.bothHereNow);

  const chrome = chromeFor(scene);
  const roomTheme = chrome as React.CSSProperties;

  const nightChrome = isNightChrome(scene.sun);

  /**
   * Whether the viewer actually holds his seat, rather than merely not being her. Never gate on
   * `!view.youAreHer`: that is true for a third person with the link, and it hands spectators his
   * whole control surface, which then 403s on save. Offering a control that cannot work is its own
   * kind of broken, separate from the server refusing it.
   */
  const iAmHim = view.you !== null && !view.youAreHer;

  // Both build an Intl formatter, so they are resolved once rather than twice in the condition and
  // again in the body.
  const herDay = iAmHim ? dayApart(view.clock) : null;
  const moon = nightChrome ? moonLine(new Date(), view.cat.name) : null;

  // While the panel is open the canvas shows the draft, so choosing a cat is a thing you watch
  // happen rather than a form you submit and hope about.
  const previewLook =
    setup && draft
      ? {
          ...view.cat,
          name: draft.name.trim() || "Bean",
          ...LOOKS.find((l) => l.id === draft.look)!.cat,
          eyes: EYES.find((e) => e.id === draft.eyes)!.hex,
        }
      : view.cat;

  return (
    <main className={s.page} style={{ ...roomTheme }}>
      <ChromeSync night={nightChrome} />
      <VoiceSync fur={view.cat.fur} />
      <DocTitle name={view.cat.name} />
      <FaviconSync cat={view.cat} />
      {/* The room is the page, and it had no heading at all: the only one was the hidden <h2> over
          the props list, which left a screen reader with an h2 and nothing above it. */}
      <h1 className={s.srOnly}>{`${view.cat.name}'s room`}</h1>
      <SoundToggle />
      <div className={s.card}>
        <div className={s.stage}>
          <Cat
            collectionKey={id}
            label={`${previewLook.name} is ${scene.doing}.`}
            look={previewLook}
            clock={setup && draft ? { ...view.clock, tz: draft.tz, homeHour: draft.homeHour } : view.clock}
            mood={view.catMood}
            nudge={nudge}
            eyesOpen={setup}
            framed={view.framed}
            doorOpenAt={doorOpenAt}
            watchDoorAt={watchDoorAt}
            staying={staying && (iAmHim || view.youAreHer)}
            box={view.box}
            brought={view.brought}
            brushed={view.brushed}
            satWith={view.satWith}
            firstEver={view.firstEver}
            monthsOld={view.monthsOld}
            gift={view.gift}
            windowLight={view.windowLight}
            onWindowLight={() => void touchWindowLight()}
            shelfDown={view.shelfDown}
            onTidy={() => void tidy()}
            /* Holding on her is petting, the one gesture that isn't a button. She gets a poke instead:
               she IS the cat, so petting herself would be nonsense and telling him she did it would be
               worse, but a tap that gets a mrrp back costs nothing. Local only, nobody told. A spectator
               gets neither, though the furniture is tappable for everyone. */
            role={iAmHim ? "him" : view.youAreHer ? "her" : null}
            /* The banner says you're both here; this is her doing something about it. */
            together={view.bothHereNow}
            onPet={() => void act("pet")}
            onPoke={() => {
              play("mrrp");
              setNudge((v) => v + 1);
            }}
            /* Fire and forget. The canvas calls this mid-frame, so nothing here may await or throw. */
            onFound={(key) => {
              noticed(id, myToken(), key);
              // Announced as a thing that happened in the room, not as an achievement unlocked.
              setFound(FOUND_ANNOUNCEMENTS[key] ?? "something in the room answered.");
            }}
            onProps={handleRoomProps}
            /*
             * Everything she could be dreaming about, gathered here rather than in the canvas. Filter
             * by `found`, this device's own discoveries, or the dream hands somebody the answer to a
             * secret they were going to enjoy finding.
             */
            dreamContext={{
              found: foundKeys(),
              recent: view.theirRecent.map((visit) => visit.action),
              trait: view.personality?.trait ?? null,
              framed: view.framed,
              hasBox: view.box,
            }}
            onDream={(dream) => setFound(dream.line)}
            cake={!!view.milestone}
            bothCalledHer={view.bothCalledHer}
            onCapture={handleCaptureReady}
          />
        </div>

        {/*
         * The room, reachable without a pointer. Visually hidden and fully focusable; without these
         * the two biggest secrets in the app cannot be found at all without a mouse. Activating one
         * runs the real interaction, so the room reacts exactly as it would to a tap.
         */}
        {/* A way past the room's props. Seven of them sit in front of everything else on the page, so
            without this a keyboard user tabs all seven on every visit before reaching anything they
            can act on. Styled in index.css rather than here, because it has to appear on :focus. */}
        {roomProps && !setup && (
          <a href="#room-actions" data-skip="">
            Skip to what you can do
          </a>
        )}

        {roomProps && !setup && (
          <nav className={s.srOnly} aria-labelledby="room-things">
            <h2 id="room-things">things in the room</h2>
            <ul>
              {roomProps.props.map((prop) => (
                <li key={prop.key}>
                  <button type="button" onClick={() => roomProps.poke(prop.key)}>
                    {prop.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Anything the room does in response, spoken once. Polite so it never interrupts a reader. */}
        <p aria-live="polite" className={s.srOnly}>
          {found}
        </p>

        {/* What she's doing about what you told her, in her time, not the server's. During setup she is
            held awake so her eye colour is visible, which makes "deeply asleep" a lie, so it says what
            is actually happening instead. */}
        <p className={s.doing}>
          {setup ? `Picking out ${previewLook.name}.` : `${previewLook.name} is ${scene.doing}.`}
        </p>

        <span id="room-actions" tabIndex={-1} />

        {captureRoom && !setup && (
          <button className={s.quiet} onClick={() => void saveRoomImage()} disabled={imageStatus !== null}>
            {imageStatus === "saving"
              ? "Making postcard…"
              : imageStatus === "shared"
                ? "Postcard shared"
                : imageStatus === "saved"
                  ? "Postcard saved"
                  : "Make a postcard"}
          </button>
        )}

        {/*
         * What the two of you have turned up in here. A count and nothing else: no total, no list,
         * no progress bar. The moment it says "3 of 14" the room becomes a thing to finish.
         *
         * Only from two onwards. At one it reads as a score for what you just did, and at zero it
         * advertises that there is anything to find.
         */}
        {!setup && view.noticed >= 2 && (iAmHim || view.youAreHer) && (
          <p className={s.noticed}>Between you, you have noticed {view.noticed} things in here.</p>
        )}

        {/*
         * The two things the room worked out from having been used for a while. The milestone goes
         * first on the rare day there is one: it is the only line here about a date, and burying it
         * would read as an afterthought. Neither is shown to a spectator, who is not part of the year.
         */}
        {!setup && view.milestone && (iAmHim || view.youAreHer) && (
          <p className={s.remembers}>{milestoneLine(view.milestone, view.cat.name)}</p>
        )}
        {/* Only after a real absence, and never a count of it. See awayLine. */}
        {!setup && (iAmHim || view.youAreHer) && awayLine(view.awayMs, view.cat.name) && (
          <p className={s.remembers}>{awayLine(view.awayMs, view.cat.name)}</p>
        )}
        {!setup && view.personality && (iAmHim || view.youAreHer) && (
          <p className={s.remembers}>{personalityLine(view.personality, view.youAreHer, view.them)}</p>
        )}

        {/*
         * Where she is, in the two ways the room can be honest about it being somewhere else.
         *
         * The date line only appears for a couple who are actually on different days, so for most
         * rooms it never fires at all. His side only: the room runs on her clock, so on her side there
         * is no gap to name and "where she is" would be talking about the person reading it. The moon
         * needs the room to be dark for the window it is talking about to be the one on screen.
         */}
        {!setup && herDay && (
          <p className={s.remembers}>
            {herDay === "ahead"
              ? "it is already tomorrow where she is."
              : "it is still yesterday where she is."}
          </p>
        )}
        {!setup && moon && (iAmHim || view.youAreHer) && <p className={s.remembers}>{moon}</p>}

        {/* The one gesture that isn't a button was also the one nobody could find. It disappears after
            the first touch rather than nagging, and it is never shown to a spectator, who has nothing
            to touch. */}
        {!setup && nudge === 0 && (iAmHim || view.youAreHer) && (
          <p className={s.hint}>{iAmHim ? `Hold on ${view.cat.name} to pet her` : `Tap ${view.cat.name}`}</p>
        )}

        {iAmHim && setup && draft && (
          // tabIndex -1 so it can take focus on open without becoming a tab stop of its own.
          <div
            className={s.panel}
            id="setup-panel"
            ref={setupPanel}
            tabIndex={-1}
            aria-label="Set up her cat"
          >
            <p className={s.panelTitle}>her cat</p>

            <input
              className={s.input}
              value={draft.name}
              maxLength={24}
              placeholder="her cat's name"
              onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
            />

            {/* Functional setDraft throughout: spreading the captured draft drops any change made
                earlier in the same tick, which loses a tap when you pick fur and eyes quickly. */}
            <p className={s.fieldLabel}>fur</p>
            <div className={s.swatchRow}>
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  title={l.label}
                  onClick={() => setDraft((d) => ({ ...d!, look: l.id }))}
                  className={s.swatch}
                  style={{
                    background: l.cat.fur /*
                     * Selection is drawn with a shadow, never an outline. An inline outline outranks
                     * any stylesheet rule, so the focus ring could never appear on the one row where
                     * you are actually choosing something.
                     */,
                    boxShadow:
                      `inset 0 -7px 0 ${l.cat.furDk}, inset 0 7px 0 ${l.cat.belly}` +
                      (draft.look === l.id ? ", 0 0 0 2.5px var(--honey)" : ""),
                  }}
                />
              ))}
            </div>

            <p className={s.fieldLabel}>eyes</p>
            {/* One row, however many there are, so adding an eye colour cannot leave an orphan. */}
            <div className={s.eyeRow} style={{ gridTemplateColumns: `repeat(${EYES.length}, 26px)` }}>
              {EYES.map((e) => (
                <button
                  key={e.id}
                  title={e.label}
                  onClick={() => setDraft((d) => ({ ...d!, eyes: e.id }))}
                  className={s.swatch}
                  style={{
                    width: 26,
                    height: 26,
                    background: e.hex,
                    boxShadow: draft.eyes === e.id ? "0 0 0 2.5px var(--honey)" : "none",
                  }}
                />
              ))}
            </div>

            <p className={s.fieldLabel}>her timezone</p>
            <Select value={draft.tz} onChange={(e) => setDraft((d) => ({ ...d!, tz: e.target.value }))}>
              {timezones().map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </Select>

            <p className={s.fieldLabel}>usually home around</p>
            <Select
              value={draft.homeHour}
              onChange={(e) => setDraft((d) => ({ ...d!, homeHour: Number(e.target.value) }))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h === 0 ? "midnight" : h < 12 ? `${h}am` : h === 12 ? "noon" : `${h - 12}pm`}
                </option>
              ))}
            </Select>

            {/*
             * Her notes, one per line. A textarea rather than add/remove fields: this gets written
             * once and probably pasted in, and thirty inputs would be thirty things to tab through.
             * Blank lines are dropped server-side, so pasting messy text is fine.
             */}
            <p className={s.fieldLabel}>her notes, one per line</p>
            <textarea
              /* 16px, not 14: iOS zooms the whole page when you focus an input smaller than that,
                 and this is the longest thing anybody types in here. */
              className={s.sayInput}
              style={{ minHeight: 150 }}
              value={draft.notes}
              rows={8}
              placeholder="One a day, in your own words."
              onChange={(e) => setDraft((d) => ({ ...d!, notes: e.target.value }))}
            />
            <p className={s.small} style={{ marginTop: 6 }}>
              {draft.notes.split("\n").filter((l) => l.trim()).length} notes. She gets one a day and the last
              one stays. Leave this empty to use the ones it came with.
            </p>

            {/* The advice belongs here, next to the box, not in the notes themselves. A default that
             * sounds specific but is not true for whoever reads it lands as a form letter, so the
             * shipped ones stay safely general and the register gets taught in the editor instead.
             * Collapsed, because it is needed once. */}
            <details style={{ marginTop: 8 }}>
              <summary className={s.summary}>What makes a good one</summary>
              <div className={s.small} style={{ marginTop: 8, display: "grid", gap: 7 }}>
                <p className={s.small}>
                  One small ordinary thing beats one big kind thing.{" "}
                  <i>You fell asleep before the film ended again</i> lands harder than{" "}
                  <i>you are wonderful</i>, because only you could have written the first one.
                </p>
                <p className={s.small}>Shapes that work:</p>
                <p className={s.small} style={{ paddingLeft: 12 }}>
                  Something you noticed. <i>You hum when you are concentrating and you have no idea.</i>
                </p>
                <p className={s.small} style={{ paddingLeft: 12 }}>
                  Something you have not said out loud. <i>I was nervous the whole first month.</i>
                </p>
                <p className={s.small} style={{ paddingLeft: 12 }}>
                  Something with no point to it.{" "}
                  <i>The bakery on the corner has moved. I am upset about it and I know you will be too.</i>
                </p>
                <p className={s.small}>
                  Put the one you would find hardest to say near the end. She reaches it, and by then it has
                  had a few weeks to be true.
                </p>
              </div>
            </details>

            {/* What she will actually see, in the real card, as you type.
             *
             * Thirty lines went into a plain textarea with no idea how any of them would land, and that
             * card is the whole product: the difference between a line that works and one that does not
             * is mostly how it sits at that width, in that type, under his name. */}
            {(() => {
              const first = draft.notes
                .split("\n")
                .map((l) => l.trim())
                .find(Boolean);
              if (!first) return null;
              return (
                <>
                  <p className={s.fieldLabel} style={{ marginTop: 14 }}>
                    day one, as she'll get it
                  </p>
                  <div className={s.note} style={{ margin: 0 }}>
                    <p className={s.noteFrom}>{view.you ?? "You"} left you something</p>
                    <p className={s.noteText}>{first}</p>
                    <p className={s.noteDay}>day 1</p>
                  </div>
                </>
              );
            })()}

            {/* Errors belong next to the button that failed. This used to surface at the very bottom of
                the card, below everything, which on a panel this tall is off screen. */}
            {view.recoveryCode && (
              <>
                <p className={s.fieldLabel} style={{ marginTop: 14 }}>
                  recovery code
                </p>
                <p className={s.small} style={{ marginBottom: 6 }}>
                  Save this somewhere that is not this phone. It is the only way to get your side of the room
                  back if you lose it.
                </p>
                <RecoveryCode code={view.recoveryCode} />
              </>
            )}

            {setupErr && (
              <p className={s.small} style={{ color: "var(--error)", marginTop: 12 }}>
                {setupErr}
              </p>
            )}

            <div className={s.row} style={{ marginTop: 12 }}>
              <button className={s.btn} onClick={() => setSetup(false)}>
                Cancel
              </button>
              <button
                className={`${s.btn} ${s.btnGo}`}
                disabled={savingSetup}
                onClick={() => void saveSetup()}
              >
                {savingSetup ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Both of you at once: rare in an asynchronous app, so it is worth saying. Additive, not a
            branch — it used to replace the page, which hid her mood and her line at the exact moment
            she was in the room. */}
        {view.bothHereNow && (
          <div className={s.together}>
            <p className={s.togetherMain}>You're both in here right now.</p>
            {/* The card is honey in every light, so this takes the same ink as the line above it.
                No opacity: dimming it to 0.78 drops it to 3.7:1, and the size already separates them. */}
            <p className={s.small} style={{ color: "var(--on-honey)", marginTop: 4 }}>
              {view.youAreHer
                ? `Hold on ${view.cat.name} and he'll see it happen.`
                : `Hold on ${view.cat.name}. She's right there.`}
            </p>
          </div>
        )}

        {arrivalCard && arrivalCard.length > 0 && view.them && (
          <ArrivalCard name={view.them} items={arrivalCard} onClose={() => setArrivalCard(null)} />
        )}

        {view.waitingForThem ? (
          <>
            {/* The italic caption above already says she's asleep, in the room's own voice. Saying it
                again immediately underneath read as a layout fault, because the two lines collided. */}
            <p className={s.newsMain}>Nobody else is here yet.</p>
            <p className={s.small} style={{ textAlign: "center" }}>
              Send this link to the one person it's for. Whoever opens it second is the one the cat is.
            </p>
            {!setup && (
              <button
                ref={setupTrigger}
                className={s.btn}
                style={{ width: "100%", marginTop: 12 }}
                onClick={openSetup}
                // No aria-controls: this button unmounts when the panel opens, so the id it named
                // would not exist at the moment anything could follow it.
                aria-expanded={setup}
              >
                Set up her cat first
              </button>
            )}
            <button
              className={`${s.btn} ${s.btnGo}`}
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => void shareRoom()}
            >
              {shareResult === "shared"
                ? "Sent."
                : shareResult === "copied"
                  ? "Copied. Go send it."
                  : "Send her the link"}
            </button>
          </>
        ) : view.youAreHer ? (
          /* ── her side: she says how she is, and finds out he came ── */
          <>
            {view.note && (
              <div className={s.note}>
                <p className={s.noteFrom}>
                  {view.note.final ? `${view.them} left this out for you` : `${view.them} left you something`}
                </p>
                <p className={s.noteText}>{view.note.text}</p>
                {/* Just the day, not "day 1 of 30". The total is however many notes are in notes.ts,
                    which is an implementation detail, and printing it turned a gift into a countdown
                    she could watch run out. */}
                {!view.note.final && <p className={s.noteDay}>day {view.note.day}</p>}
              </div>
            )}

            {/* The banner above already says you're both in here, in bigger type. Saying it twice
                on the same screen reads as a bug rather than as warmth. */}
            {view.bothHereNow ? null : view.themHereNow ? (
              <p className={s.came}>
                <b>{view.them}</b> is in here right now.
              </p>
            ) : last ? (
              <p className={s.came}>
                <b>{view.them}</b> {pastTense(last.action)}, {whenish(last.at)}.
              </p>
            ) : view.themLastAt ? (
              <p className={s.came}>
                <b>{view.them}</b> looked in {whenish(view.themLastAt)}.
              </p>
            ) : null}

            {view.theyCameAfter && !view.themHereNow && (
              <p className={s.came}>He came in after you said that.</p>
            )}

            {/* Her sentence. Before this the app was one-directional: he wrote thirty notes and she
                had six words to answer with. */}
            {lineOpen ? (
              <div className={s.sayBox}>
                <textarea
                  autoFocus
                  value={line}
                  maxLength={140}
                  rows={2}
                  placeholder={`Something for ${view.them ?? "him"} to find`}
                  onChange={(e) => setLine(e.target.value)}
                  className={s.sayInput}
                />
                <div className={s.row} style={{ marginTop: 8 }}>
                  <button className={s.btn} onClick={() => setLineOpen(false)}>
                    Never mind
                  </button>
                  <button className={`${s.btn} ${s.btnGo}`} disabled={saving} onClick={() => void say()}>
                    {saving ? "Leaving it..." : "Leave it"}
                  </button>
                </div>
              </div>
            ) : view.herLine ? (
              <button
                className={s.yourLine}
                onClick={() => {
                  setLine(view.herLine!.text);
                  setLineOpen(true);
                }}
              >
                <span className={s.yourLineLabel}>you left him this</span>
                <span className={s.yourLineText}>{view.herLine.text}</span>
              </button>
            ) : (
              <button
                className={s.quiet}
                onClick={() => {
                  setLine("");
                  setLineOpen(true);
                }}
              >
                Leave {view.them ?? "him"} a line
              </button>
            )}

            <p className={s.tellLabel}>
              {view.catMood
                ? `still ${MOODS.find((m) => m.id === view.catMood)?.label}?`
                : "How are you today?"}
            </p>
            <div className={s.moodRow}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className={`${s.mood} ${view.catMood === m.id ? s.moodOn : ""}`}
                  style={
                    view.catMood === m.id
                      ? { justifyContent: "center", padding: "9px 8px" }
                      : {
                          justifyContent: "center",
                          padding: "9px 8px",
                          background: moodTint(m.id, nightChrome, chrome["--panel"]!),
                          borderColor: "transparent",
                        }
                  }
                  onClick={() => void tell(m.id)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <MoodFace mood={m.id} color="var(--ink)" />
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── his side: he finds out how she is, and does something about it ── */
          <>
            {iAmHim && (
              <div className={s.theirs}>
                <p className={s.theirsMain}>
                  {view.catMood ? (
                    <>
                      <b>{view.them}</b> is {MOODS.find((m) => m.id === view.catMood)?.said}
                      {view.catMoodAt ? `, ${whenish(view.catMoodAt)}` : ""}.
                    </>
                  ) : (
                    <>
                      <b>{view.them}</b> hasn't said how she is yet today.
                    </>
                  )}
                </p>
                <p className={s.small} style={{ marginTop: 4 }}>
                  Go and be in there. That's all it takes.
                </p>
              </div>
            )}

            {/* Above the buttons, deliberately. She wrote him a sentence; the buttons are things he
                can do any time. Having her words sit underneath four controls got the priority exactly
                backwards on the one screen where she has actually said something. */}
            {iAmHim && view.herLine && (
              <div className={s.note}>
                <p className={s.noteFrom}>{view.them} left you this</p>
                <p className={s.noteText}>{view.herLine.text}</p>
                <p className={s.noteDay}>{whenish(view.herLine.at)}</p>
              </div>
            )}

            {iAmHim && (
              <div className={s.row} style={{ marginTop: 14 }}>
                {ACTIONS.map((a) => (
                  <button key={a.id} className={s.btn} onClick={() => void act(a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {iAmHim && (
              <p className={s.did} style={{ opacity: did ? 1 : 0 }} aria-live="polite">
                {did ? `She'll see that you ${did}.` : "\u00a0"}
              </p>
            )}

            {iAmHim && view.noteDay && (
              <p className={s.small} style={{ textAlign: "center" }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
            {iAmHim && !setup && (
              <button className={s.quiet} onClick={openSetup}>
                Change how {view.cat.name} looks, or her hours
              </button>
            )}
            {/* The link was offered exactly once, on the screen that says nobody else is here yet, and
                then never again. Installed to a home screen there is no address bar either, so a buried
                message meant the room was unreachable and unresendable at the same time. */}
            {iAmHim && !setup && (
              <button className={s.quiet} onClick={() => void shareRoom()}>
                {shareResult === "shared"
                  ? "Sent."
                  : shareResult === "copied"
                    ? "Copied. Go send it."
                    : `Send ${view.them ?? "her"} the link again`}
              </button>
            )}

            {/*
             * Somebody who only has the link. They get none of his side: not her mood, not the
             * action buttons, not the link to the setup panel. Gate every one of them, not just the
             * panel, or they are offered controls that 403.
             */}
            {!iAmHim && (
              <>
                <p className={s.small} style={{ textAlign: "center", marginTop: 16 }}>
                  This room belongs to two people, and you are not one of them. You can watch the cat.
                </p>
                {/* A new phone lands on exactly this screen, so this is where the way back belongs.
                    Nothing here leaks: redeeming needs the code, and the code only ever goes to him. */}
                <div className={s.panel} style={{ marginTop: 14 }}>
                  <p className={s.panelTitle}>is this your room?</p>
                  <p className={s.small} style={{ marginBottom: 9 }}>
                    If you made it and lost the device you made it on, put the recovery code in here.
                  </p>
                  <input
                    className={s.input}
                    value={claimCode}
                    placeholder="xxxx-xxxx-xxxx"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setClaimCode(e.target.value)}
                  />
                  {claimErr && (
                    <p className={s.small} style={{ color: "var(--error)", marginTop: 8 }}>
                      {claimErr}
                    </p>
                  )}
                  <button
                    className={`${s.btn} ${s.btnGo}`}
                    style={{ width: "100%", marginTop: 10 }}
                    disabled={claiming || claimCode.trim().length < 8}
                    onClick={async () => {
                      setClaiming(true);
                      setClaimErr(null);
                      try {
                        await doRecover(id, claimCode);
                        await load();
                      } catch (e) {
                        setClaimErr(e instanceof Error ? e.message : "That didn't work.");
                      }
                      setClaiming(false);
                    }}
                  >
                    {claiming ? "Checking..." : "This is my room"}
                  </button>
                </div>
              </>
            )}

            {/* The only recovery this app has, so it has to be findable, and it evicts her current
                device, so it asks first. Kept quiet and last: it matters on one day out of a year. */}
            {iAmHim &&
              !setup &&
              !view.waitingForThem &&
              (releasing ? (
                <div className={s.panel} style={{ marginTop: 14 }}>
                  <p className={s.small} style={{ color: "var(--ink)" }}>
                    This frees her seat, and whoever opens the link next becomes the cat. Send it to her again
                    afterwards. She keeps her place in the notes and the line she left you.
                  </p>
                  <div className={s.row} style={{ marginTop: 12 }}>
                    <button className={s.btn} onClick={() => setReleasing(false)}>
                      Never mind
                    </button>
                    <button
                      className={`${s.btn} ${s.btnGo}`}
                      onClick={async () => {
                        try {
                          await doRelease(id);
                          setReleasing(false);
                          await load();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Couldn't do that.");
                        }
                      }}
                    >
                      Free her seat
                    </button>
                  </div>
                </div>
              ) : (
                <button className={s.quiet} onClick={() => setReleasing(true)}>
                  {view.them ?? "She"} got a new phone
                </button>
              ))}
          </>
        )}

        {/* The whole sentence comes from whoever set it. "Trying again in a moment" used to be
            appended here for every error, including the ones where nothing retries. */}
        {err && (
          <p
            className={s.small}
            style={{ textAlign: "center", marginTop: 12, color: "var(--error)" }}
            role="status"
          >
            {err}
          </p>
        )}

        {/*
            The recovery code, on his side, outside the setup panel.
            It was only ever rendered inside "change how she looks", so the one string that can get
            his seat back lived behind a button labelled as a cosmetic editor. A code you cannot
            find is not a recovery mechanism.
          */}
        {iAmHim && !setup && view.recoveryCode && (
          <details className={s.recovery}>
            <summary className={s.recoverySummary}>show my recovery code</summary>
            <p className={s.small} style={{ marginTop: 8 }}>
              The only way to get your side of the room back on a new phone. Keep it somewhere that is not
              this phone.
            </p>
            <RecoveryCode code={view.recoveryCode} />
          </details>
        )}

        <footer className={s.footer}>
          <p className={s.small} style={{ textAlign: "center" }}>
            Nothing in here needs keeping up with. No streaks, no history, and nothing kept except how you are
            right now.
          </p>
          <p className={s.credit}>
            <PawMark />
            made by aiden jang
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ─────────────── styles, inline to keep this one small ─────────────── */
/*
 * The interface, lit by the same clock as the room.
 *
 * Two sets of surfaces, not one blend between them. Crossfading a light panel into a dark one drags
 * it through mid grey, where neither dark nor light text has 4.5:1 against it, and the app spends
 * every dusk and dawn unreadable. So the chrome is either a day palette or a night one, each blended
 * internally for warmth, and the polarity of the text flips with it at a single point.
 *
 * Checked across all 24 hours of the keyframe table: the worst ratio anywhere is 4.54, at the first
 * hour after the switch.
 *
 * The old version mixed every surface most of the way back to cream, which at midnight produced a
 * bright cool grey wrapped around a dark lavender room, with warm brown text that never moved. Night
 * is when this app is most often opened.
 */
const DEEP = { air: "#221d2e", warm: "#2b2439", panel: "#2f2940", line: "#463d5c", honey: "#e8ad55" };
const DUSK = { air: "#332c42", warm: "#3d3350", panel: "#413851", line: "#584d6e", honey: "#e2a349" };
const DAWN = { air: "#f4e9db", warm: "#fbf1e4", panel: "#fbf5ea", line: "#ded0b8", honey: "#d9963a" };
const FULL = { air: "#f7ecdc", warm: "#fdf6ea", panel: "#fffaf0", line: "#e6d5bb", honey: "#e0a03f" };

/** Where the chrome stops being a light interface and starts being a dark one. */
const NIGHT_BELOW = 0.45;

/** Text on the dark palette. The light palette keeps the --ink and --soft declared in index.css. */
const INK_ON_DARK = "#f6f1e6";
const SOFT_ON_DARK = "#c9bccb";
/** Same hue and saturation as the daylight error, lifted until it clears 4.5 on the dark surfaces. */
const ERROR_ON_DARK = "#d39a88";

/*
 * The tab's name, which was "mrrp" for every room forever.
 *
 * This app lives on a home screen and gets opened next to other things, and its whole subject is one
 * specific cat. Naming her is what makes the tab, the history entry and the app switcher say whose
 * room this is. Reset on unmount so the door is not titled after the last room you looked at.
 */
/*
 * The tab icon, in her coat.
 *
 * index.html ships a ginger cat, which is right for the front door and wrong for every room that
 * chose a different one. Swapped rather than added: leaving the shipped link in place lets whichever
 * the browser prefers win, and the two would not be the same cat. Restored on unmount so the door
 * gets its own back.
 */
function FaviconSync({ cat }: { cat: CatLook }) {
  const { fur, furDk, belly, eyes, tabby } = cat;
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const drawn = faviconFor({ fur, furDk, belly, eyes, tabby });
    if (!drawn) return;
    const shipped = { href: link.href, type: link.type };
    link.type = "image/png";
    link.href = drawn;
    return () => {
      link.type = shipped.type;
      link.href = shipped.href;
    };
  }, [fur, furDk, belly, eyes, tabby]);
  return null;
}

function DocTitle({ name }: { name: string }) {
  useEffect(() => {
    document.title = `${name} \u00b7 mrrp`;
    return () => {
      document.title = "mrrp";
    };
  }, [name]);
  return null;
}

/*
 * She sounds like her own cat.
 *
 * Pitch only. How settled she is belongs to the canvas, which is the one place that knows both the
 * hour and whether somebody is holding on her right now, and two writers to one number would have
 * them undoing each other every frame.
 *
 * Its own component for the same reason ChromeSync is: this sits below the room's early returns, and
 * a hook there runs in a different order on different renders.
 */
function VoiceSync({ fur }: { fur: string }) {
  // Matched by fur colour, not by look id: the room stores the colours, not which swatch was tapped.
  const voice = LOOKS.find((l) => l.cat.fur.toLowerCase() === fur.toLowerCase())?.voice ?? 1;
  useEffect(() => {
    setVoice({ pitch: voice });
  }, [voice]);
  return null;
}

/*
 * The browser's own chrome, following whichever room is on screen.
 *
 * Without this the phone keeps a cream status bar above a dark page while the scrollbars and any
 * native control stay light. Its own component so the effect sits above no early return, which is
 * what lets the door screens mount one of their own.
 */
function ChromeSync({ night }: { night: boolean }) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    document.documentElement.style.colorScheme = night ? "dark" : "light";
    meta?.setAttribute("content", night ? "#221d2e" : "#f7ecdc");
    return () => {
      document.documentElement.style.colorScheme = "";
      meta?.setAttribute("content", "#f7ecdc");
    };
  }, [night]);
  return null;
}

/*
 * A mood chip's background, for the room's current light.
 *
 * At night the daylight tints are pale enough to read as nine glowing pills on a dark page, and the
 * light ink they carry sits on them at about 1.2:1, which is invisible. Mixed most of the way into
 * the panel instead: the hues flatten, which costs nothing given how close they already are, and the
 * chips end up better separated from the panel than the daylight ones are (1.7 against 1.3).
 */
function moodTint(id: string, night: boolean, panel: string): string {
  const day = MOOD_TINT[id];
  if (!day) return "var(--panel)";
  return night ? mixHex(day, panel, 0.8) : day;
}

/*
 * A select in the app's own material.
 *
 * The control already borrowed the border and the radius, but the caret came from the browser, so
 * these two fields were visibly a different object from every input around them. The list a select
 * opens still belongs to the OS and cannot be styled; the closed control is the part that is on the
 * page all the time.
 */
function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <span className={s.selectWrap}>
      <select className={s.select} value={value} onChange={onChange}>
        {children}
      </select>
      <svg className={s.selectCaret} viewBox="0 0 10 6" aria-hidden focusable="false">
        <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function isNightChrome(sun: number): boolean {
  return sun < NIGHT_BELOW;
}

function chromeFor(scene: Scene): Record<string, string> {
  const night = isNightChrome(scene.sun);
  const t = night
    ? Math.min(1, scene.sun / NIGHT_BELOW)
    : Math.min(1, (scene.sun - NIGHT_BELOW) / (1 - NIGHT_BELOW));
  const from = night ? DEEP : DAWN;
  const to = night ? DUSK : FULL;
  // A whisper of the room's own wall, so dawn still reads lavender and golden hour still reads honey.
  const tint = (key: keyof typeof DEEP, hue: string) =>
    mixHex(mixHex(from[key], to[key], t), hue, night ? 0.06 : 0.1);
  return {
    "--air": tint("air", scene.wallTop),
    "--air-warm": tint("warm", scene.beamWarm),
    "--panel": tint("panel", scene.wallTop),
    "--line": tint("line", scene.wallBottom),
    "--honey": mixHex(from.honey, to.honey, t),
    "--ink": night ? INK_ON_DARK : "#3f2f1f",
    "--soft": night ? SOFT_ON_DARK : "#77634a",
    "--error": night ? ERROR_ON_DARK : "#a4563d",
  };
}

/*
 * The scales. Five type steps, four radii, three elevations, three durations.
 *
 * There were fourteen distinct font sizes for thirty-six usages, several of them half a point apart,
 * which is below the threshold anybody can see and above the threshold at which they drift. Same for
 * six radii and three shadows in two different browns. Reach for a step here rather than a number.
 */
const FS = {
  /** Credit lines, the day counter. */
  micro: 12,
  /** Captions, field labels, helper text. Most of the quiet copy in the app. */
  small: 13.5,
  /** Buttons, chips, list rows. */
  body: 15,
  /** Anything you type into. A floor, not a preference: iOS zooms below 16. */
  field: 16,
  /** The note, the arrival headline, anything meant to be read first. */
  lead: 17.5,
} as const;

/*
 * How long things take. `settle` is everything that arrives; `crossfade` is the room's own light
 * changing, which is slow on purpose and belongs to nothing else.
 */

/** One brown, three heights. The tint was two different browns before. */

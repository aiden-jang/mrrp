import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, Arrival, Mood, RoomView } from "./types.js";
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
  lastRoom,
  myName,
  newRoomId,
  roomFromPath,
} from "./api.js";
import { Cat } from "./Cat.js";
import { mixHex, sceneFor, type Scene } from "./hours.js";
import { EYES, LOOKS, timezones } from "./looks.js";
import { MoodFace } from "./faces.js";
import type { Cue } from "./sound.js";
import { isMuted, play, toggleMuted } from "./sound.js";
import { makeKeepsake } from "./keepsake.js";
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
      style={S.soundToggle}
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
      <p style={{ ...S.code, flex: 1 }}>{code}</p>
      <button
        type="button"
        style={{ ...S.btn, flexShrink: 0, padding: "9px 11px", fontSize: FS.micro }}
        onClick={() => void copy()}
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
    <section style={S.arrival} aria-label="Things the room kept for you">
      <div style={S.arrivalTop}>
        <div>
          <p style={S.arrivalTitle}>the room kept this for you</p>
          <p style={{ ...S.small, marginTop: 2 }}>It waited here until you looked in.</p>
        </div>
        <button type="button" onClick={onClose} style={S.arrivalClose} aria-label="Put away arrival card">
          ×
        </button>
      </div>
      <ul style={S.arrivalList}>
        {items.map((item, index) => (
          <li key={`${item.kind}-${item.at}-${index}`} style={S.arrivalItem}>
            {/* Drawn, not dingbats. ✦ ✧ ❧ come from whatever font resolves them, and ❧ in particular
                is not in every face, so the list used to change character between devices. */}
            <span style={S.arrivalPaw} aria-hidden>
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
              <small style={S.arrivalWhen}>{whenish(item.at)}</small>
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
const DOOR_CAT = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
const DOOR_CLOCK = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  homeHour: 19,
};

/* ─────────────── landing: make a room, send the link ─────────────── */
function Landing() {
  const back = lastRoom.get();
  const wantsNew = new URLSearchParams(location.search).has("new");

  // From the home screen icon, go where she meant to go. `?new` is the way out, for making a second room.
  useEffect(() => {
    if (back && installed() && !wantsNew) location.replace(`/r/${back}`);
  }, [back, wantsNew]);

  const [name, setName] = useState(myName.get() ?? "");
  const make = () => {
    if (!name.trim()) return;
    myName.set(name.trim());
    location.href = `/r/${newRoomId()}`;
  };
  return (
    <main style={S.page}>
      <div style={{ ...S.card, textAlign: "center" }}>
        <div style={{ ...S.stage, marginBottom: 14 }}>
          <Cat
            label="A pixel cat asleep in a sunlit room."
            look={DOOR_CAT}
            clock={DOOR_CLOCK}
            mood={null}
            nudge={0}
          />
        </div>
        <h1 style={S.h1}>mrrp</h1>
        {/* Written for somebody who has never heard of this. "A cat that is her" made sense only if you
            already knew, which was fine while it had one user and is not any more. Says the mechanism
            first, because the mechanism is the charming part. */}
        <p style={{ ...S.lede, margin: "0 auto 14px" }}>
          One of you is the cat. You make the room; whoever you send the link to becomes her. They tap how
          their day is going and she becomes that, so you know without having to ask.
        </p>
        <p style={{ ...S.lede, margin: "0 auto 18px", fontSize: FS.body }}>
          Then you turn up and sit with her. No accounts, no notifications, nothing to keep up with.
        </p>
        {/* In a browser tab this is an offer rather than a redirect, so the page you asked for is the
            page you get, and making a second room stays possible. */}
        {back && (
          <button
            style={{ ...S.btn, ...S.btnGo, width: "100%", marginBottom: 14 }}
            onClick={() => location.assign(`/r/${back}`)}
          >
            Back to the room
          </button>
        )}
        {back && <p style={{ ...S.small, marginBottom: 14 }}>Or start another one for somebody else.</p>}
        <input
          style={S.input}
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
          style={{ ...S.btn, ...(back ? null : S.btnGo), width: "100%", marginTop: 10 }}
          onClick={make}
          disabled={!name.trim()}
        >
          Make a room
        </button>
        <p style={{ ...S.small, marginTop: 14 }}>
          You'll get a link. Send it to one person. That's the whole thing.
        </p>
        {/* A link here and plain text inside a room, on purpose. This page is the one strangers see, so
            a credit that goes somewhere belongs. In the room the only two people are the two it is for,
            and a link pointing away from a note she is reading turns a signature into a byline with a
            call to action, which is the one thing this app has refused to be all along. */}
        <p style={S.credit}>
          made by{" "}
          <a href="https://aidenjang.com" target="_blank" rel="noopener noreferrer" style={S.creditLink}>
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
      });
      if (!blob) throw new Error("postcard unavailable");
      const fileName = `${
        view?.cat.name
          ?.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "mrrp"
      }-postcard.png`;
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
  useEffect(() => {
    if (!view || youArrived.current) return;
    if (view.you === null) return; // spectators are not arrivals
    youArrived.current = true;
    setDoorOpenAt(Date.now());
    const t = setTimeout(() => setDoorOpenAt(null), 4200);
    return () => clearTimeout(t);
  }, [view?.you]);
  useEffect(() => {
    const here = view?.themHereNow ?? false;
    const prev = wasHere.current;
    wasHere.current = here;
    if (prev === null || !here || prev) return;
    play("chirp");
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

  const load = useCallback(
    async (n?: string | null) => {
      try {
        const next = await fetchRoom(id, n ?? myName.get());
        setView(next);
        // Polls return an empty list after the server advances this seat's last-seen marker. Keep the
        // postcard on screen until the person puts it away, rather than flashing it for 15 seconds.
        if (next.arrivals.length > 0) setArrivalCard(next.arrivals);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
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
    try {
      setView(await doAct(id, a));
      // He gets one line back, phrased the way she'll read it, so the button does something visible.
      const said = ACTIONS.find((x) => x.id === a)?.mine;
      if (said) {
        setDid(said);
        setTimeout(() => setDid(null), 2600);
      }
    } catch {
      /* she'll survive */
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

  const saveSetup = async () => {
    if (!draft) return;
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

  if (asking) {
    return (
      <main style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <h1 style={S.h1}>mrrp</h1>
          <p style={{ ...S.lede, margin: "0 auto 20px" }}>Someone made you a cat.</p>
          <input
            style={S.input}
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
            style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 10 }}
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
      <main style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          {/* The cat, even here. The app opens from cache on a bad connection, so this screen is what
              she sees standing on a train with no signal, and an empty page with an error on it is a
              worse thing to be handed than a sleeping cat and a promise to keep trying. */}
          <div style={S.stage}>
            <Cat
              label="A pixel cat asleep in a sunlit room."
              look={DOOR_CAT}
              clock={DOOR_CLOCK}
              mood={null}
              nudge={0}
            />
          </div>
          <p style={{ ...S.small, marginTop: 16 }}>{err ?? "opening the door quietly…"}</p>
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
    <main style={{ ...S.page, ...roomTheme }}>
      <ChromeSync night={nightChrome} />
      <DocTitle name={view.cat.name} />
      {/* The room is the page, and it had no heading at all: the only one was the hidden <h2> over
          the props list, which left a screen reader with an h2 and nothing above it. */}
      <h1 style={S.srOnly}>{`${view.cat.name}'s room`}</h1>
      <SoundToggle />
      <div style={S.card}>
        <div style={S.stage}>
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
            box={view.box}
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
        {roomProps && !setup && (
          <div style={S.srOnly}>
            <h2>things in the room</h2>
            <ul>
              {roomProps.props.map((prop) => (
                <li key={prop.key}>
                  <button type="button" onClick={() => roomProps.poke(prop.key)}>
                    {prop.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Anything the room does in response, spoken once. Polite so it never interrupts a reader. */}
        <p aria-live="polite" style={S.srOnly}>
          {found}
        </p>

        {/* What she's doing about what you told her, in her time, not the server's. During setup she is
            held awake so her eye colour is visible, which makes "deeply asleep" a lie, so it says what
            is actually happening instead. */}
        <p style={S.doing}>
          {setup ? `Picking out ${view.cat.name}.` : `${view.cat.name} is ${scene.doing}.`}
        </p>

        {captureRoom && !setup && (
          <button style={S.quiet} onClick={() => void saveRoomImage()} disabled={imageStatus !== null}>
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
          <p style={S.noticed}>Between you, you have noticed {view.noticed} things in here.</p>
        )}

        {/*
         * The two things the room worked out from having been used for a while. The milestone goes
         * first on the rare day there is one: it is the only line here about a date, and burying it
         * would read as an afterthought. Neither is shown to a spectator, who is not part of the year.
         */}
        {!setup && view.milestone && (iAmHim || view.youAreHer) && (
          <p style={S.remembers}>{milestoneLine(view.milestone, view.cat.name)}</p>
        )}
        {/* Only after a real absence, and never a count of it. See awayLine. */}
        {!setup && (iAmHim || view.youAreHer) && awayLine(view.awayMs, view.cat.name) && (
          <p style={S.remembers}>{awayLine(view.awayMs, view.cat.name)}</p>
        )}
        {!setup && view.personality && (iAmHim || view.youAreHer) && (
          <p style={S.remembers}>{personalityLine(view.personality, view.youAreHer, view.them)}</p>
        )}

        {/* The one gesture that isn't a button was also the one nobody could find. It disappears after
            the first touch rather than nagging, and it is never shown to a spectator, who has nothing
            to touch. */}
        {!setup && nudge === 0 && (iAmHim || view.youAreHer) && (
          <p style={S.hint}>{iAmHim ? `Hold on ${view.cat.name} to pet her` : `Tap ${view.cat.name}`}</p>
        )}

        {iAmHim && setup && draft && (
          <div style={S.panel}>
            <p style={S.panelTitle}>her cat</p>

            <input
              style={S.input}
              value={draft.name}
              maxLength={24}
              placeholder="her cat's name"
              onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
            />

            {/* Functional setDraft throughout: spreading the captured draft drops any change made
                earlier in the same tick, which loses a tap when you pick fur and eyes quickly. */}
            <p style={S.fieldLabel}>fur</p>
            <div style={S.swatchRow}>
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  title={l.label}
                  onClick={() => setDraft((d) => ({ ...d!, look: l.id }))}
                  style={{
                    ...S.swatch,
                    background: l.cat.fur,
                    /*
                     * Selection is drawn with a shadow, never an outline. An inline outline outranks
                     * any stylesheet rule, so the focus ring could never appear on the one row where
                     * you are actually choosing something.
                     */
                    boxShadow:
                      `inset 0 -7px 0 ${l.cat.furDk}, inset 0 7px 0 ${l.cat.belly}` +
                      (draft.look === l.id ? ", 0 0 0 2.5px var(--honey)" : ""),
                  }}
                />
              ))}
            </div>

            <p style={S.fieldLabel}>eyes</p>
            {/* One row, however many there are, so adding an eye colour cannot leave an orphan. */}
            <div style={{ ...S.eyeRow, gridTemplateColumns: `repeat(${EYES.length}, 26px)` }}>
              {EYES.map((e) => (
                <button
                  key={e.id}
                  title={e.label}
                  onClick={() => setDraft((d) => ({ ...d!, eyes: e.id }))}
                  style={{
                    ...S.swatch,
                    width: 26,
                    height: 26,
                    background: e.hex,
                    boxShadow: draft.eyes === e.id ? "0 0 0 2.5px var(--honey)" : "none",
                  }}
                />
              ))}
            </div>

            <p style={S.fieldLabel}>her timezone</p>
            <Select value={draft.tz} onChange={(e) => setDraft((d) => ({ ...d!, tz: e.target.value }))}>
              {timezones().map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </Select>

            <p style={S.fieldLabel}>usually home around</p>
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
            <p style={S.fieldLabel}>her notes, one per line</p>
            <textarea
              /* 16px, not 14: iOS zooms the whole page when you focus an input smaller than that,
                 and this is the longest thing anybody types in here. */
              style={{ ...S.sayInput, minHeight: 150 }}
              value={draft.notes}
              rows={8}
              placeholder="One a day, in your own words."
              onChange={(e) => setDraft((d) => ({ ...d!, notes: e.target.value }))}
            />
            <p style={{ ...S.small, marginTop: 6 }}>
              {draft.notes.split("\n").filter((l) => l.trim()).length} notes. She gets one a day and the last
              one stays. Leave this empty to use the ones it came with.
            </p>

            {/* The advice belongs here, next to the box, not in the notes themselves. A default that
             * sounds specific but is not true for whoever reads it lands as a form letter, so the
             * shipped ones stay safely general and the register gets taught in the editor instead.
             * Collapsed, because it is needed once. */}
            <details style={{ marginTop: 8 }}>
              <summary style={S.summary}>What makes a good one</summary>
              <div style={{ ...S.small, marginTop: 8, display: "grid", gap: 7 }}>
                <p style={S.small}>
                  One small ordinary thing beats one big kind thing.{" "}
                  <i>You fell asleep before the film ended again</i> lands harder than{" "}
                  <i>you are wonderful</i>, because only you could have written the first one.
                </p>
                <p style={S.small}>Shapes that work:</p>
                <p style={{ ...S.small, paddingLeft: 12 }}>
                  Something you noticed. <i>You hum when you are concentrating and you have no idea.</i>
                </p>
                <p style={{ ...S.small, paddingLeft: 12 }}>
                  Something you have not said out loud. <i>I was nervous the whole first month.</i>
                </p>
                <p style={{ ...S.small, paddingLeft: 12 }}>
                  Something with no point to it.{" "}
                  <i>The bakery on the corner has moved. I am upset about it and I know you will be too.</i>
                </p>
                <p style={S.small}>
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
                  <p style={{ ...S.fieldLabel, marginTop: 14 }}>day one, as she'll get it</p>
                  <div style={{ ...S.note, margin: 0 }}>
                    <p style={S.noteFrom}>{view.you ?? "You"} left you something</p>
                    <p style={S.noteText}>{first}</p>
                    <p style={S.noteDay}>day 1</p>
                  </div>
                </>
              );
            })()}

            {/* Errors belong next to the button that failed. This used to surface at the very bottom of
                the card, below everything, which on a panel this tall is off screen. */}
            {view.recoveryCode && (
              <>
                <p style={{ ...S.fieldLabel, marginTop: 14 }}>recovery code</p>
                <p style={{ ...S.small, marginBottom: 6 }}>
                  Save this somewhere that is not this phone. It is the only way to get your side of the room
                  back if you lose it.
                </p>
                <RecoveryCode code={view.recoveryCode} />
              </>
            )}

            {setupErr && <p style={{ ...S.small, color: "var(--error)", marginTop: 12 }}>{setupErr}</p>}

            <div style={{ ...S.row, marginTop: 12 }}>
              <button style={S.btn} onClick={() => setSetup(false)}>
                Cancel
              </button>
              <button
                style={{ ...S.btn, ...S.btnGo }}
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
          <div style={S.together}>
            <p style={S.togetherMain}>You're both in here right now.</p>
            {/* The card is honey in every light, so this takes the same ink as the line above it.
                No opacity: dimming it to 0.78 drops it to 3.7:1, and the size already separates them. */}
            <p style={{ ...S.small, color: "var(--on-honey)", marginTop: 4 }}>
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
            <p style={S.newsMain}>Nobody else is here yet.</p>
            <p style={{ ...S.small, textAlign: "center" }}>
              Send this link to the one person it's for. Whoever opens it second is the one the cat is.
            </p>
            {!setup && (
              <button style={{ ...S.btn, width: "100%", marginTop: 12 }} onClick={openSetup}>
                Set up her cat first
              </button>
            )}
            <button
              style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 8 }}
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
              <div style={S.note}>
                <p style={S.noteFrom}>
                  {view.note.final ? `${view.them} left this out for you` : `${view.them} left you something`}
                </p>
                <p style={S.noteText}>{view.note.text}</p>
                {/* Just the day, not "day 1 of 30". The total is however many notes are in notes.ts,
                    which is an implementation detail, and printing it turned a gift into a countdown
                    she could watch run out. */}
                {!view.note.final && <p style={S.noteDay}>day {view.note.day}</p>}
              </div>
            )}

            {/* The banner above already says you're both in here, in bigger type. Saying it twice
                on the same screen reads as a bug rather than as warmth. */}
            {view.bothHereNow ? null : view.themHereNow ? (
              <p style={S.came}>
                <b>{view.them}</b> is in here right now.
              </p>
            ) : last ? (
              <p style={S.came}>
                <b>{view.them}</b> {pastTense(last.action)}, {whenish(last.at)}.
              </p>
            ) : view.themLastAt ? (
              <p style={S.came}>
                <b>{view.them}</b> looked in {whenish(view.themLastAt)}.
              </p>
            ) : null}

            {view.theyCameAfter && !view.themHereNow && <p style={S.came}>He came in after you said that.</p>}

            {/* Her sentence. Before this the app was one-directional: he wrote thirty notes and she
                had six words to answer with. */}
            {lineOpen ? (
              <div style={S.sayBox}>
                <textarea
                  autoFocus
                  value={line}
                  maxLength={140}
                  rows={2}
                  placeholder={`Something for ${view.them ?? "him"} to find`}
                  onChange={(e) => setLine(e.target.value)}
                  style={S.sayInput}
                />
                <div style={{ ...S.row, marginTop: 8 }}>
                  <button style={S.btn} onClick={() => setLineOpen(false)}>
                    Never mind
                  </button>
                  <button style={{ ...S.btn, ...S.btnGo }} disabled={saving} onClick={() => void say()}>
                    {saving ? "Leaving it..." : "Leave it"}
                  </button>
                </div>
              </div>
            ) : view.herLine ? (
              <button
                style={S.yourLine}
                onClick={() => {
                  setLine(view.herLine!.text);
                  setLineOpen(true);
                }}
              >
                <span style={S.yourLineLabel}>you left him this</span>
                <span style={S.yourLineText}>{view.herLine.text}</span>
              </button>
            ) : (
              <button
                style={S.quiet}
                onClick={() => {
                  setLine("");
                  setLineOpen(true);
                }}
              >
                Leave {view.them ?? "him"} a line
              </button>
            )}

            <p style={S.tellLabel}>
              {view.catMood
                ? `still ${MOODS.find((m) => m.id === view.catMood)?.label}?`
                : "How are you today?"}
            </p>
            <div style={S.moodRow}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  style={{
                    ...S.mood,
                    justifyContent: "center",
                    padding: "9px 8px",
                    ...(view.catMood === m.id
                      ? S.moodOn
                      : {
                          background: moodTint(m.id, nightChrome, chrome["--panel"]!),
                          borderColor: "transparent",
                        }),
                  }}
                  onClick={() => void tell(m.id)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
              <div style={S.theirs}>
                <p style={S.theirsMain}>
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
                <p style={{ ...S.small, marginTop: 4 }}>Go and be in there. That's all it takes.</p>
              </div>
            )}

            {/* Above the buttons, deliberately. She wrote him a sentence; the buttons are things he
                can do any time. Having her words sit underneath four controls got the priority exactly
                backwards on the one screen where she has actually said something. */}
            {iAmHim && view.herLine && (
              <div style={S.note}>
                <p style={S.noteFrom}>{view.them} left you this</p>
                <p style={S.noteText}>{view.herLine.text}</p>
                <p style={S.noteDay}>{whenish(view.herLine.at)}</p>
              </div>
            )}

            {iAmHim && (
              <div style={{ ...S.row, marginTop: 14 }}>
                {ACTIONS.map((a) => (
                  <button key={a.id} style={S.btn} onClick={() => void act(a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {iAmHim && (
              <p style={{ ...S.did, opacity: did ? 1 : 0 }} aria-live="polite">
                {did ? `She'll see that you ${did}.` : "\u00a0"}
              </p>
            )}

            {iAmHim && view.noteDay && (
              <p style={{ ...S.small, textAlign: "center" }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
            {iAmHim && !setup && (
              <button style={S.quiet} onClick={openSetup}>
                Change how {view.cat.name} looks, or her hours
              </button>
            )}

            {/*
             * Somebody who only has the link. They get none of his side: not her mood, not the
             * action buttons, not the link to the setup panel. Gate every one of them, not just the
             * panel, or they are offered controls that 403.
             */}
            {!iAmHim && (
              <>
                <p style={{ ...S.small, textAlign: "center", marginTop: 16 }}>
                  This room belongs to two people, and you are not one of them. You can watch the cat.
                </p>
                {/* A new phone lands on exactly this screen, so this is where the way back belongs.
                    Nothing here leaks: redeeming needs the code, and the code only ever goes to him. */}
                <div style={{ ...S.panel, marginTop: 14 }}>
                  <p style={S.panelTitle}>is this your room?</p>
                  <p style={{ ...S.small, marginBottom: 9 }}>
                    If you made it and lost the device you made it on, put the recovery code in here.
                  </p>
                  <input
                    style={S.input}
                    value={claimCode}
                    placeholder="xxxx-xxxx-xxxx"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setClaimCode(e.target.value)}
                  />
                  {claimErr && <p style={{ ...S.small, color: "var(--error)", marginTop: 8 }}>{claimErr}</p>}
                  <button
                    style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 10 }}
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
                <div style={{ ...S.panel, marginTop: 14 }}>
                  <p style={{ ...S.small, color: "var(--ink)" }}>
                    This frees her seat, and whoever opens the link next becomes the cat. Send it to her again
                    afterwards. She keeps her place in the notes and the line she left you.
                  </p>
                  <div style={{ ...S.row, marginTop: 12 }}>
                    <button style={S.btn} onClick={() => setReleasing(false)}>
                      Never mind
                    </button>
                    <button
                      style={{ ...S.btn, ...S.btnGo }}
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
                <button style={S.quiet} onClick={() => setReleasing(true)}>
                  {view.them ?? "She"} got a new phone
                </button>
              ))}
          </>
        )}

        {err && (
          <p style={{ ...S.small, textAlign: "center", marginTop: 12, color: "var(--error)" }}>
            {err} Trying again in a moment.
          </p>
        )}

        {/*
            The recovery code, on his side, outside the setup panel.
            It was only ever rendered inside "change how she looks", so the one string that can get
            his seat back lived behind a button labelled as a cosmetic editor. A code you cannot
            find is not a recovery mechanism.
          */}
        {iAmHim && !setup && view.recoveryCode && (
          <details style={S.recovery}>
            <summary style={S.recoverySummary}>show my recovery code</summary>
            <p style={{ ...S.small, marginTop: 8 }}>
              The only way to get your side of the room back on a new phone. Keep it somewhere that is not
              this phone.
            </p>
            <RecoveryCode code={view.recoveryCode} />
          </details>
        )}

        <footer style={S.footer}>
          <p style={{ ...S.small, textAlign: "center" }}>
            Nothing in here needs keeping up with. No streaks, no history, and nothing kept except how you are
            right now.
          </p>
          <p style={S.credit}>made by aiden jang</p>
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
 * The browser's own chrome, following the room.
 *
 * The page can go dark now, and without this the phone keeps a cream status bar above it while the
 * scrollbars and any native control stay light. Its own component so the effect sits above no early
 * return, and so unmounting restores the daylight palette the door and recovery screens expect.
 */
/*
 * The tab's name, which was "mrrp" for every room forever.
 *
 * This app lives on a home screen and gets opened next to other things, and its whole subject is one
 * specific cat. Naming her is what makes the tab, the history entry and the app switcher say whose
 * room this is. Reset on unmount so the door is not titled after the last room you looked at.
 */
function DocTitle({ name }: { name: string }) {
  useEffect(() => {
    document.title = `${name} \u00b7 mrrp`;
    return () => {
      document.title = "mrrp";
    };
  }, [name]);
  return null;
}

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
    <span style={S.selectWrap}>
      <select style={S.select} value={value} onChange={onChange}>
        {children}
      </select>
      <svg style={S.selectCaret} viewBox="0 0 10 6" aria-hidden focusable="false">
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

const RADIUS = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

/*
 * How long things take. `settle` is everything that arrives; `crossfade` is the room's own light
 * changing, which is slow on purpose and belongs to nothing else.
 */
const MOTION = {
  settle: "0.42s var(--ease-spring)",
  arrive: "0.42s var(--ease-bounce)",
  crossfade: "0.9s ease",
} as const;

/** One brown, three heights. The tint was two different browns before. */
const SHADOW = {
  low: "0 6px 18px -12px rgba(120,84,44,.35)",
  mid: "0 8px 22px -14px rgba(120,84,44,.4)",
  high: "0 10px 24px -17px rgba(120,84,44,.55)",
} as const;

const S: Record<string, React.CSSProperties> = {
  page: {
    // `color` is set here, not left to body. A custom property resolves where it is written, so
    // body's `color: var(--ink)` computes once against the root token and every child inherits that
    // literal value: overriding --ink further down would never reach anything that did not name it.
    color: "var(--ink)",
    minHeight: "100%",
    display: "grid",
    placeItems: "center",
    // vmin, not vw: on a wide short laptop a vw-based pad is at its maximum exactly where there is
    // least room for it, which is what pushed the landing page's button under the fold.
    padding: "clamp(14px, 3vmin, 28px) 18px clamp(24px, 5vmin, 48px)",
    background: "radial-gradient(120% 90% at 78% 6%, var(--air-warm) 0%, var(--air) 62%)",
    transition: `background ${MOTION.crossfade}`,
  },
  /*
   * minWidth 0 + overflowWrap: a grid item defaults to min-width:auto, which is its min-content
   * width, and that silently outranks both width:100% and maxWidth. One unbroken 90-character line
   * she left him (a pasted link fits inside the 140-char limit) set that floor to ~900px, so the
   * card ignored its own max width and the whole room scrolled sideways on a phone.
   *
   * `anywhere` rather than `break-word` because break-word does not lower min-content, so the floor
   * would stay put. overflow-wrap inherits, so this covers every line of prose in the card.
   */
  card: { width: "100%", maxWidth: 600, minWidth: 0, overflowWrap: "anywhere" },
  h1: {
    fontSize: "clamp(30px, 8vw, 44px)",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  /*
   * Available to a screen reader and to Tab, invisible on screen.
   *
   * Not display:none and not visibility:hidden, either of which would take it out of the accessibility
   * tree and the focus order along with it, which is the exact opposite of the point.
   */
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
  /*
   * Pinned to the column, not to the window.
   *
   * At `right: 12` it sat against the edge of the screen, which on a laptop left it about 430px away
   * from the room it belongs to, floating in empty page. `left: 50%` plus half the column's max width
   * keeps it beside the content at every size, and it falls back to the old corner on anything too
   * narrow for the offset to fit.
   */
  soundToggle: {
    position: "fixed",
    top: 12,
    left: "min(calc(50% + 300px - 48px), calc(100vw - 48px))",
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontSize: FS.body,
    lineHeight: 1,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    color: "var(--soft)",
  },
  lede: { fontSize: FS.body, color: "var(--soft)", maxWidth: "38ch", lineHeight: 1.55 },
  small: { fontSize: FS.small, color: "var(--soft)", margin: 0, lineHeight: 1.5 },
  /**
   * The footer, as one block instead of two grey paragraphs and a floating byline.
   *
   * No rule above it. What read as awkward was the credit sitting 22px below a three-line grey
   * paragraph at almost the same weight: two separate quiet things competing to be last, so neither
   * looked deliberate. Grouped, with the space outside the group rather than inside it, and the credit
   * pulled right up under the line it belongs to.
   */
  footer: { marginTop: 28 },
  /* No opacity. At 0.55 this sat at 1.66:1 on the page, which is not "quiet", it is unreadable.
     11px against the lede's 15.5 is the whole hierarchy it needs. */
  credit: { fontSize: FS.micro, color: "var(--soft)", textAlign: "center", margin: "8px 0 0" },
  creditLink: { color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 },
  /** The recovery-code disclosure, on his side. Closed by default: it is reassurance, not a task. */
  recovery: {
    marginTop: 18,
    padding: "10px 14px",
    borderRadius: RADIUS.md,
    background: "var(--air)",
    border: "1px solid var(--line)",
  },
  recoverySummary: {
    cursor: "pointer",
    fontSize: FS.small,
    color: "var(--soft)",
  },
  code: {
    font: "inherit",
    fontSize: FS.lead,
    letterSpacing: ".08em",
    textAlign: "center",
    margin: 0,
    padding: "11px 13px",
    borderRadius: RADIUS.md,
    background: "var(--air)",
    border: "1px dashed var(--line)",
    userSelect: "all",
  },
  /** Shown once, until the first touch. Small, centred, and never in the way. */
  hint: {
    fontSize: FS.micro,
    color: "var(--soft)",
    textAlign: "center",
    margin: "6px 0 0",
  },
  /*
   * A centring box, and nothing else to look at.
   *
   * The canvas sizes itself to a whole number of device pixels per logical pixel, so it is usually a
   * little narrower than the column. The frame moved onto the canvas with it: anything drawn here
   * would show as a band down either side of the room.
   */
  stage: { position: "relative", width: "100%", display: "grid", placeItems: "center" },
  doing: {
    fontSize: FS.small,
    color: "var(--soft)",
    textAlign: "center",
    margin: "14px 0 0",
    fontStyle: "italic",
  },
  // Quieter than `doing` and not italic: a fact about the two of them, not something the cat is doing.
  // A shade warmer and a touch larger than the discovery count: this is the room saying something, not
  // a footnote about it.
  remembers: {
    fontSize: FS.small,
    color: "var(--soft)",
    textAlign: "center",
    margin: "12px auto 0",
    maxWidth: 340,
    lineHeight: 1.5,
    textWrap: "pretty",
  },
  noticed: { fontSize: FS.micro, color: "var(--soft)", textAlign: "center", margin: "10px 0 0" },
  // A quiet panel, not a gold block. How she is appears on his side every single day, whereas the
  // two of you being in the room at the same moment happens rarely — and when it did, two identical
  // gold cards stacked on top of each other and the rare one lost. Only one of these should shout.
  theirs: {
    animation: `rise ${MOTION.settle} both`,
    margin: "14px 0 2px",
    padding: "13px 16px",
    borderRadius: RADIUS.lg,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    color: "var(--ink)",
  },
  theirsMain: { fontSize: FS.lead, lineHeight: 1.5, margin: 0 },
  did: {
    fontSize: FS.small,
    textAlign: "center",
    color: "var(--soft)",
    margin: "12px 0 4px",
    transition: "opacity .25s ease",
    minHeight: "1.2em",
  },
  together: {
    animation: `arrive ${MOTION.arrive} both`,
    margin: "14px 0 6px",
    padding: "13px 16px",
    borderRadius: RADIUS.lg,
    background: "var(--honey)",
    color: "var(--on-honey)",
  },
  togetherMain: { fontSize: FS.lead, fontWeight: 700, margin: 0, lineHeight: 1.45 },
  arrival: {
    animation: `arrive ${MOTION.arrive} both`,
    margin: "14px 0 4px",
    padding: "14px 15px",
    borderRadius: RADIUS.lg,
    background: "linear-gradient(145deg, var(--air-warm), var(--panel))",
    border: "1px solid var(--line)",
    boxShadow: SHADOW.high,
  },
  arrivalTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  arrivalTitle: { fontSize: FS.body, fontWeight: 700, margin: 0, color: "var(--ink)" },
  arrivalClose: {
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: RADIUS.pill,
    cursor: "pointer",
    border: "1px solid var(--line)",
    background: "var(--air)",
    color: "var(--soft)",
    font: "inherit",
    fontSize: FS.lead,
  },
  arrivalList: {
    display: "grid",
    gap: 9,
    listStyle: "none",
    padding: "11px 0 0",
    margin: "10px 0 0",
    borderTop: "1px solid var(--line)",
  },
  arrivalItem: {
    display: "grid",
    gridTemplateColumns: "18px minmax(0, 1fr)",
    gap: 7,
    fontSize: FS.body,
    lineHeight: 1.45,
  },
  arrivalPaw: { color: "var(--honey)", display: "flex", justifyContent: "center", paddingTop: 4 },
  arrivalWhen: { display: "block", marginTop: 1, color: "var(--soft)", fontSize: FS.micro },
  sayBox: { margin: "16px 0 4px" },
  sayInput: {
    font: "inherit",
    // 16 is a floor, not a preference: iOS zooms the page when you focus anything smaller, and both
    // things anybody types in this app are textareas carrying this style.
    fontSize: FS.field,
    lineHeight: 1.5,
    width: "100%",
    resize: "none",
    padding: "11px 13px",
    borderRadius: RADIUS.md,
    border: "1px solid var(--line)",
    background: "var(--panel)",
    color: "var(--ink)",
  },
  yourLine: {
    font: "inherit",
    textAlign: "left",
    width: "100%",
    cursor: "pointer",
    margin: "16px 0 4px",
    padding: "12px 15px",
    borderRadius: RADIUS.lg,
    background: "var(--panel)",
    border: "1px dashed var(--line)",
    color: "var(--ink)",
  },
  yourLineLabel: {
    display: "block",
    fontSize: FS.small,
    color: "var(--soft)",
    fontWeight: 500,
    marginBottom: 5,
  },
  yourLineText: { display: "block", fontSize: FS.body, lineHeight: 1.5 },
  came: {
    fontSize: FS.small,
    textAlign: "center",
    color: "var(--soft)",
    margin: "12px 0 0",
  },
  // Sentence case, not letterspaced caps. Caps are the house style of dashboards and settings
  // screens: they read as a field label on a form you have to fill in. This is somebody asking how
  // your day was, and it should sound like it.
  tellLabel: {
    fontSize: FS.body,
    fontWeight: 500,
    color: "var(--soft)",
    textAlign: "center",
    margin: "18px 0 8px",
  },
  // A 3x3 grid rather than a wrapping flex row. With nine chips, wrap left a single orphan on the last
  // line, and an odd one out at the bottom of a mood picker reads as an afterthought.
  moodRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 7,
    marginBottom: 14,
  },
  mood: {
    font: "inherit",
    fontSize: FS.body,
    color: "var(--ink)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: RADIUS.pill,
    padding: "8px 15px",
    cursor: "pointer",
  },
  moodOn: {
    background: "var(--honey)",
    borderColor: "var(--honey)",
    color: "var(--on-honey)",
    fontWeight: 600,
  },
  panel: {
    margin: "16px 0 4px",
    padding: "15px 16px",
    borderRadius: RADIUS.lg,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    boxShadow: SHADOW.low,
  },
  // The panel's heading, against its field labels below. Both were --soft a point apart, so the whole
  // panel read as one flat list with nothing saying which line was the title.
  panelTitle: {
    fontSize: FS.body,
    fontWeight: 600,
    color: "var(--ink)",
    margin: "0 0 11px",
  },
  fieldLabel: { fontSize: FS.micro, color: "var(--soft)", margin: "14px 0 6px" },
  /*
   * Grids with a fixed column count, not a wrapping row.
   *
   * Eight fur swatches wrapping at whatever fits put seven on one line and one alone underneath, on
   * a phone. Four and four is two deliberate rows at every width. Same reasoning as the mood chips,
   * which stopped wrapping for the same reason.
   */
  swatchRow: { display: "grid", gridTemplateColumns: "repeat(4, 34px)", gap: 9, justifyContent: "start" },
  eyeRow: { display: "grid", gap: 9, justifyContent: "start" },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    border: "1px solid var(--line)",
    cursor: "pointer",
    padding: 0,
  },
  quiet: {
    font: "inherit",
    fontSize: FS.micro,
    color: "var(--soft)",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "block",
    margin: "14px auto 0",
    textDecoration: "underline",
  },
  note: {
    animation: `arrive ${MOTION.arrive} both`,
    margin: "14px 0 2px",
    padding: "15px 17px",
    borderRadius: RADIUS.lg,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    boxShadow: SHADOW.mid,
  },
  noteFrom: {
    fontSize: FS.small,
    color: "var(--soft)",
    margin: "0 0 8px",
    fontWeight: 500,
  },
  noteText: { fontSize: FS.lead, lineHeight: 1.55, margin: 0 },
  noteDay: { fontSize: FS.micro, color: "var(--soft)", margin: "9px 0 0", textAlign: "right" },
  news: { margin: "16px 2px 16px", textAlign: "center" },
  newsMain: { fontSize: FS.lead, margin: "12px 0 5px", lineHeight: 1.45, textAlign: "center" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  btn: {
    font: "inherit",
    fontSize: FS.body,
    fontWeight: 600,
    color: "var(--ink)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: RADIUS.md,
    padding: "11px 12px",
    cursor: "pointer",
  },
  btnGo: { background: "var(--honey)", borderColor: "var(--honey)", color: "var(--on-honey)" },
  /** A disclosure is a control, so it gets a control's target size rather than a line of text's. */
  summary: {
    fontSize: FS.small,
    color: "var(--soft)",
    lineHeight: 1.5,
    cursor: "pointer",
    minHeight: 24,
    display: "flex",
    alignItems: "center",
  },
  selectWrap: { position: "relative", display: "block" },
  select: {
    font: "inherit",
    fontSize: FS.field,
    width: "100%",
    // The browser's caret is replaced by the drawn one, so leave it room and take the OS styling off.
    padding: "11px 34px 11px 13px",
    appearance: "none",
    border: "1px solid var(--line)",
    borderRadius: RADIUS.md,
    background: "var(--panel)",
    color: "var(--ink)",
    cursor: "pointer",
  },
  selectCaret: {
    position: "absolute",
    right: 13,
    top: "50%",
    marginTop: -3,
    width: 10,
    height: 6,
    color: "var(--soft)",
    pointerEvents: "none",
  },
  input: {
    font: "inherit",
    fontSize: FS.field,
    width: "100%",
    padding: "11px 13px",
    border: "1px solid var(--line)",
    borderRadius: RADIUS.md,
    background: "var(--panel)",
    color: "var(--ink)",
  },
};

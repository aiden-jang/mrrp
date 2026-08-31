import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Action, CatAct, Arrival, Cat as CatLook, Gift, Mood, RoomView, Treat } from "./types.js";
import { ACTIONS, CAT_ACTS, MOODS, TREATS } from "./types.js";
import {
  doAct,
  doClock,
  doDress,
  adoptSeat,
  doDelete,
  doBlanket,
  doDraw,
  doLeave,
  doLink,
  doNotes,
  doOurDay,
  doRecover,
  doRelease,
  doCatAct,
  doLeaveGift,
  doLeaveOut,
  doSay,
  doTell,
  doTidy,
  doWindowLight,
  fetchRoom,
  doUndelete,
  doUnleave,
  beenHere,
  forgetMe,
  forgetRoom,
  GONE,
  GoneError,
  lastCat,
  lastRoom,
  markMine,
  myName,
  newRoomId,
  roomFromPath,
  whoAmI,
  type SignedInAs,
} from "./api.js";
import { Cat } from "./Cat.js";
import { dayApart, HER_SPOT, mixHex, sceneFor, type Scene } from "./hours.js";
import { moonLine } from "./moon.js";
import { EYES, LOOKS, timezones } from "./looks.js";
import { MoodFace } from "./faces.js";
import type { Cue } from "./sound.js";
import { buzz, isMuted, play, setVoice, toggleMuted } from "./sound.js";
import s from "./App.module.css";
import { makeKeepsake } from "./keepsake.js";
import {
  BLANK,
  cellAt,
  DOODLE_CELLS,
  DOODLE_H,
  DOODLE_INK,
  DOODLE_NAMES,
  DOODLE_W,
  isBlank,
  withCell,
} from "./doodle.js";
import { faviconFor } from "./favicon.js";
import { loginUrl, logoutUrl, siteFooterLinks } from "@aidenjang/auth-client";
import { AUTH_URL } from "./config.js";
import { foundKeys, noticed } from "./discoveries.js";
import { awayLine, homingLine, milestoneLine, personalityLine } from "./remembers.js";
import { myToken } from "./api.js";
import { GoneCard, LeftCard, TheyLeftNotice } from "./screens.js";
import { BLANKETS, BLANKET_KEYS, type BlanketKey } from "./blanket.js";

const ACTION_SOUND: Record<Action, Cue> = {
  pet: "purr",
  brush: "brush",
  bring: "thump",
  sit: "settle",
  photo: "shutter",
};

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
      ) : kind === "drawn" ? (
        <rect
          x="1.4"
          y="2"
          width="7.2"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
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
  belly: "she has rolled all the way over.",
};

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

const pastTense = (a: Action | CatAct) =>
  ACTIONS.find((x) => x.id === a)?.past ?? CAT_ACTS.find((x) => x.id === a)?.past ?? "was here";

const GIFT_NAMES: Record<string, string> = {
  leaf: "leaf",
  cap: "bottle cap",
  moth: "moth",
};

/** The same three, as something to pick rather than something the room rolls. */
const GIFT_CHOICES: { id: Gift; label: string }[] = [
  { id: "leaf", label: "a leaf" },
  { id: "cap", label: "a bottle cap" },
  { id: "moth", label: "a moth" },
];

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
  belly: "that she will roll over for the two of you",
};

const FIRSTS: Record<string, string> = {
  snow: "it has snowed on this room, for the first time.",
  rain: "it has rained on this room, for the first time.",
  storm: "the first storm this room has been through.",
};

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
                  <>
                    <b>{name}</b> found something in here you haven&apos;t seen yet.
                  </>
                )
              ) : item.kind === "drawn" ? (
                <>
                  <b>{name}</b> put something in the frame. <Sheet cells={item.cells} />
                </>
              ) : item.kind === "kept" ? (
                <>
                  <b>{name}</b> took the {GIFT_NAMES[item.gift] ?? "thing"} you left.
                </>
              ) : item.kind === "first" ? (
                <>{FIRSTS[item.what] ?? "something happened here for the first time."}</>
              ) : item.kind === "took" ? (
                <>
                  <b>{name}</b> {TREATS.find((t) => t.id === item.treat)?.found ?? "found what you left out"}.
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

const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const STAY_MS = 180_000;

const SIGNED_OUT = "Sign in first.";
const pad = (n: number) => String(n).padStart(2, "0");

const MUG_AGAIN_MS = 1400;
const FINISH_LINK = "mrrp:finish-link";

const LINE_MAX = 140;

const DOOR_CAT = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
const DOOR_CLOCK = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  homeHour: 19,
};

function useDoorScene(): Scene {
  const [at, setAt] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAt(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return sceneFor(DOOR_CLOCK, at, null, false);
}

function Landing() {
  const back = lastRoom.get();
  const wantsNew = new URLSearchParams(location.search).has("new");

  useEffect(() => {
    if (back && installed() && !wantsNew) location.replace(`/r/${back}`);
  }, [back, wantsNew]);

  const [name, setName] = useState(myName.get() ?? "");
  const door = useDoorScene();
  const make = () => {
    if (!name.trim()) return;
    myName.set(name.trim());
    const id = newRoomId();
    markMine(id);
    location.href = `/r/${id}`;
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
            reserveBelow={340}
          />
        </div>
        <h1 className={s.h1}>mrrp</h1>
        <p className={s.lede} style={{ margin: "0 auto 14px" }}>
          One of you is the cat. You make the room; whoever you send the link to becomes her. They tap how
          their day is going and she becomes that, so you know without having to ask.
        </p>
        <p className={s.lede} style={{ margin: "0 auto 18px", fontSize: FS.body }}>
          Then you turn up and sit with her. No account needed, no notifications, nothing to keep up with.
        </p>
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
        <p className={s.credit}>
          <PawMark />
          {siteFooterLinks(AUTH_URL).map((item, i) => (
            <Fragment key={item.href}>
              {i > 0 && " · "}
              <a
                href={item.href}
                className={s.creditLink}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </a>
            </Fragment>
          ))}
        </p>
      </div>
    </main>
  );
}

function RoomPage({ id }: { id: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [captureRoom, setCaptureRoom] = useState<(() => Promise<Blob | null>) | null>(null);
  const [roomProps, setRoomProps] = useState<{
    props: { key: string; label: string }[];
    poke: (key: string) => void;
  } | null>(null);
  const [found, setFound] = useState("");
  const [imageStatus, setImageStatus] = useState<"saving" | "shared" | "saved" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gone, setGone] = useState<{ undoUntil: number | null } | null>(null);
  const handleCaptureReady = useCallback((capture: () => Promise<Blob | null>) => {
    setCaptureRoom(() => capture);
  }, []);
  // Memoized, and it has to be. An inline arrow is a new function every render, which is in the
  // canvas effect's deps, which remounts the canvas, which calls this again: an infinite loop.
  const handleRoomProps = useCallback(
    (props: { key: string; label: string }[], poke: (key: string) => void) => {
      setRoomProps({ props, poke });
    },
    [],
  );
  const tidy = useCallback(async () => {
    const r = roomFromPath();
    if (!r) return;
    try {
      const { again } = await doTidy(r);
      if (!again) {
        setView(await fetchRoom(r));
        return;
      }
      setView((v) => (v ? { ...v, shelfDown: false } : v));
      window.setTimeout(() => {
        play("thump");
        setMugFell(Date.now());
        void fetchRoom(r).then(setView);
      }, MUG_AGAIN_MS);
    } catch {
      // Nothing to say. The thing you tapped is still there to tap again.
    }
  }, []);
  const [bedding, setBedding] = useState(false);
  const pickBlanket = async (key: BlanketKey, stripe: boolean) => {
    setBedding(true);
    setView((v) => (v ? { ...v, blanket: { key, stripe } } : v));
    try {
      setView(await doBlanket(id, key, stripe));
    } catch {
      // Nothing to say. The thing you tapped is still there to tap again.
    }
    setBedding(false);
  };

  const [leaveArmed, setLeaveArmed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [ending, setEnding] = useState(false);
  const endRoom = async () => {
    setEnding(true);
    try {
      const undoUntil = await doDelete(id, typedName);
      forgetRoom(id);
      setGone({ undoUntil });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete the room.");
      setEnding(false);
    }
  };
  const [undoing, setUndoing] = useState(false);
  const putBackMySide = async () => {
    setUndoing(true);
    try {
      await doUnleave(id);
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't put your side back.");
      setUndoing(false);
    }
  };
  const putBackRoom = async () => {
    setUndoing(true);
    try {
      await doUndelete(id);
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't put it back.");
      setUndoing(false);
    }
  };
  const leave = async () => {
    setEnding(true);
    try {
      await doLeave(id);
      forgetRoom(id);
      window.location.href = "/";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't leave the room.");
      setEnding(false);
    }
  };

  const windowLightPending = useRef(false);
  const touchWindowLight = useCallback(async () => {
    if (windowLightPending.current) return;
    windowLightPending.current = true;
    try {
      setView(await doWindowLight(id));
    } catch {
      // An easter egg. A failed glint leaves the ordinary window untouched.
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
      const currentScene = view
        ? sceneFor(
            view.clock,
            Date.now(),
            view.catMood,
            view.bothHereNow,
            view.personality ? HER_SPOT : null,
            view.sky,
            view.expectAt,
          )
        : null;
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
      const fileName = `${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const share = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
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

  const yourSeat = view?.you ?? null;
  useEffect(() => {
    if (yourSeat === null || youArrived.current) return;
    youArrived.current = true;
    setDoorOpenAt(Date.now());
    const t = setTimeout(() => setDoorOpenAt(null), 4200);
    return () => clearTimeout(t);
  }, [yourSeat]);
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

  const wasTogether = useRef<boolean | null>(null);
  useEffect(() => {
    const now = view?.bothHereNow ?? false;
    const prev = wasTogether.current;
    wasTogether.current = now;
    if (prev === null || !now || prev) return;
    play("mrrp");
    setNudge((v) => v + 1);
  }, [view?.bothHereNow]);

  /*
   * Only ever the door, never a form.
   *
   * This used to say "someone made you a cat" and then ask her to type her own name, on the same
   * screen. She is the cat: he named her when he made the room, and a second name for the same
   * person is what made the app feel like it could not decide what she was. The gate is now whether
   * she has been in this room, not whether the browser is holding a name for her.
   */
  const [asking, setAsking] = useState(() => !beenHere(id));
  const [shareResult, setShareResult] = useState<"copied" | "shared" | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [me, setMe] = useState<SignedInAs>({ signedIn: false, name: null });
  useEffect(() => {
    void whoAmI().then(setMe);
  }, []);
  const [linking, setLinking] = useState(false);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const link = async (on: boolean) => {
    setLinking(true);
    setLinkErr(null);
    try {
      await doLink(id, on);
      await load();
    } catch (e) {
      if (on && e instanceof Error && e.message === SIGNED_OUT) {
        sessionStorage.setItem(FINISH_LINK, id);
        window.location.href = loginUrl(AUTH_URL, window.location.href);
        return;
      }
      setLinkErr(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setLinking(false);
    }
  };

  const wantsLink = view?.you !== undefined && view?.you !== null && !view?.linked;
  useEffect(() => {
    if (!wantsLink || sessionStorage.getItem(FINISH_LINK) !== id) return;
    sessionStorage.removeItem(FINISH_LINK);
    void link(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsLink, id]);

  const [mugFell, setMugFell] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const hangUp = async (cells: string) => {
    setDrawing(true);
    try {
      setView(await doDraw(id, cells));
      play("settle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't hang that up.");
    } finally {
      setDrawing(false);
    }
  };

  const [line, setLine] = useState("");
  const [lineOpen, setLineOpen] = useState(false);

  const lineBox = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = lineBox.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [line, lineOpen]);
  const [awayNote, setAwayNote] = useState<string | null>(null);
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
    ourDate: string;
    ourLabel: string;
  } | null>(null);

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
        adoptSeat(next.seat);
        setView(next);
        lastCat.set(id, next.cat);
        /* Him only, for the reason homingLine already gives: to her this is the room reporting
           her own arrival back to her, in her own name. She is the one looking up. */
        const back = next.youAreHer ? null : awayLine(next.awayMs, next.cat.name);
        if (back) setAwayNote((prev) => prev ?? back);
        if (next.arrivals.length > 0) setArrivalCard(next.arrivals);
        setErr(null);
      } catch (e) {
        // The one failure that must not be retried into. Everything else here is "the train went into
        // a tunnel"; this one is an answer.
        if (e instanceof Error && e.message === GONE) {
          forgetRoom(id);
          setGone({ undoUntil: e instanceof GoneError ? e.undoUntil : null });
          return;
        }
        setErr(`${e instanceof Error ? e.message : "Something went wrong."} Trying again in a moment.`);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!asking) void load();
  }, [asking, load]);

  useEffect(() => {
    if (asking || view || !err || gone) return;
    const t = setTimeout(() => void load(), 2500);
    return () => clearTimeout(t);
  }, [asking, view, err, gone, load]);

  useEffect(() => {
    if (asking || gone) return;
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
  }, [asking, gone, load]);

  const act = async (a: Action) => {
    setNudge((v) => v + 1);
    play(ACTION_SOUND[a]);
    if (a === "pet" || a === "brush") buzz(a);
    try {
      setView(await doAct(id, a));
      const said = ACTIONS.find((x) => x.id === a)?.mine;
      if (said) {
        setDid(said);
        setTimeout(() => setDid(null), 2600);
      }
    } catch {
      setErr("That didn't reach her. Try it again.");
      setTimeout(() => setErr(null), 4000);
    }
  };

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
      notes: (view.yourNotes ?? []).join("\n"),
      ourDate: view.ourDay ? `2000-${pad(view.ourDay.month)}-${pad(view.ourDay.day)}` : "",
      ourLabel: view.ourDay?.label ?? "",
    });
    setSetup(true);
  };

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
    play("settle");
    const look = LOOKS.find((l) => l.id === draft.look)!;
    const eyes = EYES.find((e) => e.id === draft.eyes)!;
    setSavingSetup(true);
    setSetupErr(null);
    try {
      await doDress(id, { name: draft.name.trim() || "Bean", ...look.cat, eyes: eyes.hex });
      await doClock(id, { tz: draft.tz, homeHour: draft.homeHour });
      await doNotes(id, draft.notes.split("\n"));
      const [, mm, dd] = draft.ourDate.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];
      const label = draft.ourLabel.trim();
      await doOurDay(id, mm && dd && label ? { month: Number(mm), day: Number(dd), label } : null);
      setSetup(false);
      await load();
    } catch (e) {
      setSetupErr(e instanceof Error ? e.message : "Couldn't save that.");
    }
    setSavingSetup(false);
  };

  const catAct = async (act: CatAct) => {
    play("mrrp");
    try {
      setView(await doCatAct(id, act));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't do that.");
    }
  };

  const leaveOut = async (treat: Treat) => {
    play("settle");
    try {
      setView(await doLeaveOut(id, treat));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't leave that out.");
    }
  };

  const leaveGift = async (gift: Gift) => {
    play("settle");
    try {
      setView(await doLeaveGift(id, gift));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't leave that.");
    }
  };

  const say = async () => {
    setSaving(true);
    try {
      setView(await doSay(id, line));
      setLineOpen(false);
    } catch {
      // Nothing to say. The thing you tapped is still there to tap again.
    }
    setSaving(false);
  };

  const tell = async (m: Mood) => {
    play("chirp");
    setNudge((v) => v + 1);
    setNudge((v) => v + 1);
    setView((v) => (v ? { ...v, catMood: m, catMoodAt: Date.now() } : v));
    try {
      setView(await doTell(id, m));
    } catch {
      void load();
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
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    if (await copyText(location.href)) resetResult("copied");
  };

  const door = useDoorScene();
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
          <button
            className={`${s.btn} ${s.btnGo}`}
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => {
              markMine(id);
              setAsking(false);
            }}
          >
            Go in
          </button>
        </div>
      </main>
    );
  }

  if (gone) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        <GoneCard
          undoUntil={gone.undoUntil}
          undoing={undoing}
          err={err}
          onPutBack={() => void putBackRoom()}
          onHome={() => {
            window.location.href = "/";
          }}
        />
      </main>
    );
  }

  if (!view) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        {remembered && (
          <>
            <DocTitle name={remembered.name} />
            <FaviconSync cat={remembered} />
          </>
        )}
        <div className={s.card} style={{ textAlign: "center" }}>
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

  if (view.youLeft) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        <LeftCard
          catName={view.cat.name}
          undoUntil={view.undoLeaveUntil}
          theyWereTold={view.theyWereTold}
          seatFree={view.waitingForThem}
          undoing={undoing}
          err={err}
          onPutBack={() => void putBackMySide()}
          onStartFresh={() => {
            forgetMe();
            window.location.reload();
          }}
        />
      </main>
    );
  }

  const last = view.theirRecent[0];
  const herSpot = view.personality ? HER_SPOT : null;
  const scene = sceneFor(
    view.clock,
    Date.now(),
    view.catMood,
    view.bothHereNow,
    herSpot,
    view.sky,
    view.expectAt,
  );

  const chrome = chromeFor(scene);
  const roomTheme = chrome as React.CSSProperties;

  const nightChrome = isNightChrome(scene.sun);

  const iAmHim = view.you !== null && !view.youAreHer;

  const herDay = iAmHim ? dayApart(view.clock) : null;
  const moon = nightChrome ? moonLine(new Date(), view.cat.name, view.youAreHer) : null;

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
      <VoiceSync fur={view.cat.fur} monthsOld={view.monthsOld} />
      <DocTitle name={view.cat.name} />
      <FaviconSync cat={view.cat} />
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
            doodle={view.doodle?.cells ?? null}
            blanket={view.blanket}
            sky={view.sky}
            spot={herSpot}
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
            leftOut={view.forHer}
            windowLight={view.windowLight}
            onWindowLight={() => void touchWindowLight()}
            shelfDown={view.shelfDown}
            onTidy={() => void tidy()}
            mugFell={mugFell}
            role={iAmHim ? "him" : view.youAreHer ? "her" : null}
            together={view.bothHereNow}
            onPet={() => void act("pet")}
            onPoke={() => {
              play("mrrp");
              setNudge((v) => v + 1);
            }}
            onFound={(key) => {
              noticed(id, myToken(), key);
              setFound(FOUND_ANNOUNCEMENTS[key] ?? "something in the room answered.");
            }}
            onProps={handleRoomProps}
            dreamContext={{
              found: foundKeys(),
              // What she dreams about is what he does for her. Her own doings are in this log now
              // and are not dream material: she is the one who did them.
              recent: view.theirRecent
                .map((visit) => visit.action)
                .filter((a): a is Action => ACTIONS.some((x) => x.id === a)),
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
        <p aria-live="polite" className={s.srOnly}>
          {found}
        </p>
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
        {!setup && view.noticed >= 2 && (iAmHim || view.youAreHer) && (
          <p className={s.noticed}>Between you, you have noticed {view.noticed} things in here.</p>
        )}
        {!setup &&
          (iAmHim || view.youAreHer) &&
          [
            view.milestone && milestoneLine(view.milestone, view.cat.name, view.youAreHer),
            awayNote,
            moon,
            view.personality && personalityLine(view.personality, view.youAreHer, view.them),
            iAmHim && homingLine(view.expectAt, view.clock.homeHour, view.cat.name),
            herDay &&
              (herDay === "ahead"
                ? "it is already tomorrow where she is."
                : "it is still yesterday where she is."),
          ]
            .filter((line): line is string => !!line)
            .slice(0, 2)
            .map((line) => (
              <p key={line} className={s.remembers}>
                {line}
              </p>
            ))}
        {!setup && nudge === 0 && (iAmHim || view.youAreHer) && (
          /* "Tap {her own name}" is not something to say to her. His first move is on her; hers is
             telling him how she is, which is the only thing in here that leaves her side. */
          <p className={s.hint}>{iAmHim ? `Hold on ${view.cat.name} to pet her` : "Tell him how you are"}</p>
        )}
        {iAmHim && setup && draft && (
          <div
            className={s.panel}
            id="setup-panel"
            ref={setupPanel}
            tabIndex={-1}
            aria-label="Write her notes, name her and choose how she looks"
          >
            <p className={s.panelTitle}>her</p>

            <input
              className={s.input}
              value={draft.name}
              maxLength={24}
              placeholder="her name"
              onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
            />

            <p className={s.fieldLabel}>fur</p>
            <div className={s.swatchRow}>
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  title={l.label}
                  aria-label={l.label}
                  aria-pressed={draft.look === l.id}
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
            <div className={s.eyeRow} style={{ gridTemplateColumns: `repeat(${EYES.length}, 26px)` }}>
              {EYES.map((e) => (
                <button
                  key={e.id}
                  title={e.label}
                  aria-label={e.label}
                  aria-pressed={draft.eyes === e.id}
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

            <p className={s.fieldLabel}>a day worth remembering</p>
            <input
              className={`${s.input} ${s.dateInput}`}
              type="date"
              value={draft.ourDate}
              min="1900-01-01"
              max="2100-12-31"
              onChange={(e) => setDraft((d) => ({ ...d!, ourDate: e.target.value }))}
            />
            <input
              className={s.input}
              style={{ marginTop: 8 }}
              value={draft.ourLabel}
              maxLength={32}
              placeholder="what it is, in a few words"
              onChange={(e) => setDraft((d) => ({ ...d!, ourLabel: e.target.value }))}
            />
            <p className={s.small} style={{ marginTop: 6 }}>
              She will mention it every year on the day, in exactly those words. Leave either blank for no day
              at all.
            </p>

            <p className={s.fieldLabel}>her notes, one per line</p>
            <textarea
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

            {view.recoveryCode && (
              <>
                <p className={s.fieldLabel} style={{ marginTop: 14 }}>
                  recovery code
                </p>
                <p className={s.small} style={{ marginBottom: 6 }}>
                  Save this somewhere that is not this phone. It gets your side of the room back if you lose
                  it, and so does signing in.
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
        {view.bothHereNow && (
          <div className={s.together}>
            <p className={s.togetherMain}>You're both in here right now.</p>
            <p className={s.small} style={{ color: "var(--on-honey)", marginTop: 4 }}>
              {/*
                Her half used to read "hold on {her own name} and he'll see it happen", which told
                her to hold herself and promised something that does not happen: his touch is
                act("pet") and reaches her, hers is a local sound and reaches nobody. She is the cat.
                She is not holding it.
              */}
              {view.youAreHer
                ? `${view.them ?? "He"} is right there. He can reach you.`
                : `Hold on ${view.cat.name}. She's right there.`}
            </p>
          </div>
        )}
        {arrivalCard && arrivalCard.length > 0 && view.them && (
          <ArrivalCard name={view.them} items={arrivalCard} onClose={() => setArrivalCard(null)} />
        )}
        {view.waitingForThem ? (
          <>
            {view.theyLeft ? (
              <TheyLeftNotice name={view.theyLeft.name} until={view.theyLeft.until} />
            ) : (
              <>
                <p className={s.newsMain}>Nobody else is here yet.</p>
                <p className={s.small} style={{ textAlign: "center" }}>
                  Send this link to the one person it's for. Whoever opens it second is the one the cat is.
                </p>
              </>
            )}
            {!setup && (
              <button
                ref={setupTrigger}
                className={s.btn}
                style={{ width: "100%", marginTop: 12 }}
                onClick={openSetup}
                aria-expanded={setup}
              >
                Write her notes, name her, choose how she looks
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
                  : view.theyLeft
                    ? "Send the link to somebody else"
                    : "Send her the link"}
            </button>
          </>
        ) : view.youAreHer ? (
          <>
            {view.note && (
              <div className={s.note}>
                <p className={s.noteFrom}>
                  {view.note.final ? `${view.them} left this out for you` : `${view.them} left you something`}
                </p>
                <p className={s.noteText}>{view.note.text}</p>
                {!view.note.final && <p className={s.noteDay}>day {view.note.day}</p>}
              </div>
            )}

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

            {lineOpen ? (
              <div className={s.sayBox}>
                <textarea
                  autoFocus
                  ref={lineBox}
                  value={line}
                  maxLength={LINE_MAX}
                  placeholder={`Something for ${view.them ?? "him"} to find`}
                  onChange={(e) => setLine(e.target.value)}
                  className={s.sayInput}
                />
                {LINE_MAX - line.length <= 20 && (
                  <p className={s.small} style={{ textAlign: "right", margin: "6px 2px 0" }}>
                    {LINE_MAX - line.length} left
                  </p>
                )}
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

            <FrameSheet current={view.doodle} saving={drawing} onSave={(c) => void hangUp(c)} />

            <BlanketRow current={view.blanket} busy={bedding} onPick={(k, st) => void pickBlanket(k, st)} />

            {/* The cat's own doings, hers to choose. The room used to roll these: the shelf on an
                18% chance when she looked in, the box once a day on its own. */}
            <p className={s.tellLabel}>Be a cat about it</p>
            <div className={s.moodRow}>
              {CAT_ACTS.map((a) => (
                <button
                  key={a.id}
                  className={s.mood}
                  style={{ justifyContent: "center", padding: "9px 8px" }}
                  onClick={() => void catAct(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <p className={s.tellLabel}>Leave him something</p>
            <div className={s.moodRow}>
              {GIFT_CHOICES.map((g) => (
                <button
                  key={g.id}
                  aria-pressed={view.gift === g.id}
                  className={`${s.mood} ${view.gift === g.id ? s.moodOn : ""}`}
                  style={{ justifyContent: "center", padding: "9px 8px" }}
                  onClick={() => void leaveGift(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <p className={s.tellLabel}>
              {view.catMood
                ? `still ${MOODS.find((m) => m.id === view.catMood)?.label}?`
                : "How are you today?"}
            </p>
            <div className={s.moodRow}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  aria-pressed={view.catMood === m.id}
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
                {/* The other half of the gift she leaves him: something out for her to find. */}
<p className={s.small} style={{ marginTop: 8 }}>
                  {view.forHer
                    ? `${TREATS.find((t) => t.id === view.forHer)?.label ?? "Something"} is out, waiting for her.`
                    : "Leave something out for her"}
                </p>
                <div className={s.moodRow}>
                  {TREATS.map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={view.forHer === t.id}
                      className={`${s.mood} ${view.forHer === t.id ? s.moodOn : ""}`}
                      style={{ justifyContent: "center", padding: "9px 8px" }}
                      onClick={() => void leaveOut(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* What she has been doing in there, the way she is told what he did. */}
                {last && (
                  <p className={s.small} style={{ marginTop: 4 }}>
                    She {pastTense(last.action)}, {whenish(last.at)}.
                  </p>
                )}
                <p className={s.small} style={{ marginTop: 4 }}>
                  Go and be in there. That's all it takes.
                </p>
              </div>
            )}

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

            {iAmHim && <FrameSheet current={view.doodle} saving={drawing} onSave={(c) => void hangUp(c)} />}

            {iAmHim && view.noteDay && (
              <p className={s.small} style={{ textAlign: "center" }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
            {iAmHim && !setup && (
              <button className={s.quiet} onClick={openSetup}>
                Write her notes, or change how {view.cat.name} looks
              </button>
            )}
            {!iAmHim && (
              <>
                <p className={s.small} style={{ textAlign: "center", marginTop: 16 }}>
                  This room belongs to two people, and both seats are taken. You can watch the cat.
                </p>
                <p className={s.small} style={{ textAlign: "center", marginTop: 10 }}>
                  If you have been in here before, your recovery code will get you back in. If a seat is being
                  held by a browser that is not yours, ask whoever sent you the link to free it.
                </p>
                <div className={s.panel} style={{ marginTop: 14 }}>
                  <p className={s.panelTitle}>is one of these seats yours?</p>
                  <p className={s.small} style={{ marginBottom: 9 }}>
                    Either of you can come back on a new phone. Put your recovery code in and the room works
                    out which seat is yours.
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
          </>
        )}
        {/* Keep this pinned. One `err` serves a room twice a phone screen tall, so unpinned it
            lands below the fold and a failure looks like nothing happening. */}
        {err && (
          <p className={s.errorBar} role="status">
            {err}
          </p>
        )}
        {!setup && (iAmHim || view.youAreHer) && (
          // Everything about the room rather than about her, under one heading. These arrived one at a
          // time as quiet links and ended up eight in a column at identical weight, so "draw something"
          // looked exactly as important as "delete this room".
          <section className={s.roomBits} aria-label="This room">
            <p className={s.roomBitsTitle}>this room</p>
            {/* Keep the way back in first and a button: it is what most people open this for. */}
            {!setup && view.recoveryCode && (
              <div className={s.accountInBits}>
                <p className={s.small}>
                  {view.linked
                    ? "This seat is on your account, so signing in on a new phone brings you straight back here."
                    : "Sign in and this seat comes back on any phone you sign in on. No code to keep."}{" "}
                  <a
                    href={`${AUTH_URL}/privacy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.creditLink}
                  >
                    What this keeps
                  </a>
                  .
                </p>
                <button
                  className={`${s.btn} ${s.accountBtn}`}
                  disabled={linking}
                  onClick={() => void link(!view.linked)}
                >
                  {view.linked ? "Take this seat off my account" : "Keep this seat on my account"}
                </button>
                <p className={`${s.small} ${s.whoRow}`}>
                  {me.signedIn ? (
                    <>
                      Signed in{me.name ? ` as ${me.name}` : ""}.{" "}
                      <a className={s.creditLink} href={logoutUrl(AUTH_URL, window.location.href)}>
                        Sign out
                      </a>
                    </>
                  ) : (
                    <>
                      Not signed in.{" "}
                      <a className={s.creditLink} href={loginUrl(AUTH_URL, window.location.href)}>
                        Sign in
                      </a>
                    </>
                  )}
                </p>
                {linkErr && (
                  <p className={s.small} style={{ marginTop: 8, color: "var(--error)" }} role="status">
                    {linkErr}
                  </p>
                )}
              </div>
            )}
            {!setup && view.recoveryCode && (
              <details className={s.recovery}>
                <summary className={s.recoverySummary}>or keep a code instead</summary>
                <p className={s.small} style={{ marginTop: 8 }}>
                  For getting back in without an account. Keep it somewhere that is not this phone.
                </p>
                <RecoveryCode code={view.recoveryCode} />
              </details>
            )}
            {iAmHim && (
              <button className={s.quiet} onClick={() => void shareRoom()}>
                {shareResult === "shared"
                  ? "Sent."
                  : shareResult === "copied"
                    ? "Copied. Go send it."
                    : `Send ${view.them ?? "her"} the link again`}
              </button>
            )}
            {iAmHim &&
              !setup &&
              !view.waitingForThem &&
              (releasing ? (
                <div className={s.panel} style={{ marginTop: 14 }}>
                  <p className={s.small} style={{ color: "var(--ink)" }}>
                    Her seat lives in one browser, so a new phone, a cleared browser or a private window you
                    opened to look at the room can all end up holding it. This frees it, and whoever opens the
                    link next becomes the cat, so send it to her again afterwards. She keeps her place in the
                    notes and the line she left you.
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
                  {view.them ?? "She"} can&apos;t get in
                </button>
              ))}
            {!setup && (iAmHim || view.youAreHer) && (
              <details className={`${s.recovery} ${s.ending}`} onToggle={() => setLeaveArmed(false)}>
                <summary className={s.recoverySummary}>
                  {iAmHim ? "delete this room" : "leave this room"}
                </summary>
                <p className={s.small} style={{ marginTop: 8 }}>
                  <a
                    className={s.creditLink}
                    href={`/api/room/${id}/export?me=${encodeURIComponent(myToken())}`}
                  >
                    Take a copy first
                  </a>
                  , if you want to keep what is in here.
                </p>
                {iAmHim ? (
                  <>
                    <p className={s.small} style={{ marginTop: 8 }}>
                      This deletes the whole room for both of you: {view.cat.name}, the notes, everything
                      either of you left in here. It happens straight away. You have a week to change your
                      mind, and after that it is erased for good.
                    </p>
                    {/* His name, not hers. Asking him to type hers had become "type her name to
                        erase her" the moment she became the cat. */}
                    <p className={s.small} style={{ marginTop: 10 }}>
                      Sign your own name to confirm.
                    </p>
                    <input
                      className={s.input}
                      value={typedName}
                      placeholder={view.you ?? "your name"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={`Type ${view.you ?? "your name"} to confirm deleting this room`}
                      onChange={(e) => setTypedName(e.target.value)}
                    />
                    <button
                      className={s.quiet}
                      disabled={
                        ending ||
                        !view.you ||
                        typedName.trim().toLowerCase() !== view.you.trim().toLowerCase()
                      }
                      onClick={() => void endRoom()}
                    >
                      {ending ? "deleting…" : "Delete this room for both of us"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className={s.small} style={{ marginTop: 8 }}>
                      This takes your side out of the room: your moods, your visits, the days you have been in
                      here. {view.them ?? "The other one"} keeps the room and {view.cat.name} stays, but she
                      will not be you any more. You have a week to change your mind, unless the seat is taken
                      before then.
                    </p>
                    <button
                      className={s.quiet}
                      disabled={ending}
                      onClick={() => (leaveArmed ? void leave() : setLeaveArmed(true))}
                    >
                      {ending ? "leaving…" : leaveArmed ? "Yes, take my side out of it" : "Leave this room"}
                    </button>
                  </>
                )}
              </details>
            )}
          </section>
        )}
        <footer className={s.footer}>
          <p className={s.small} style={{ textAlign: "center" }}>
            Nothing in here needs keeping up with. No streaks, no unread, and nothing that goes wrong if you
            stay away.
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

const DEEP = { air: "#221d2e", warm: "#2b2439", panel: "#2f2940", line: "#463d5c", honey: "#e8ad55" };
const DUSK = { air: "#332c42", warm: "#3d3350", panel: "#413851", line: "#584d6e", honey: "#e2a349" };
const DAWN = { air: "#f4e9db", warm: "#fbf1e4", panel: "#fbf5ea", line: "#ded0b8", honey: "#d9963a" };
const FULL = { air: "#f7ecdc", warm: "#fdf6ea", panel: "#fffaf0", line: "#e6d5bb", honey: "#e0a03f" };

const NIGHT_BELOW = 0.45;

const INK_ON_DARK = "#f6f1e6";
const SOFT_ON_DARK = "#c9bccb";
const ERROR_ON_DARK = "#d39a88";

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

function BlanketRow({
  current,
  busy,
  onPick,
}: {
  current: RoomView["blanket"];
  busy: boolean;
  onPick: (key: BlanketKey, stripe: boolean) => void;
}) {
  const key = current?.key ?? "rose";
  const stripe = current?.stripe ?? false;
  return (
    <div className={s.blanketRow}>
      <p className={s.blanketLabel}>her blanket</p>
      <div className={s.blanketSwatches}>
        {BLANKET_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={s.blanketSwatch}
            aria-label={k}
            aria-pressed={k === key}
            disabled={busy}
            style={{
              background: BLANKETS[k].b,
              borderColor: k === key ? "var(--ink)" : BLANKETS[k].d,
            }}
            onClick={() => onPick(k, stripe)}
          />
        ))}
        <button
          type="button"
          className={s.blanketStripe}
          aria-label="stripes"
          aria-pressed={stripe}
          disabled={busy}
          style={{ borderColor: stripe ? "var(--ink)" : "var(--line)" }}
          onClick={() => onPick(key, !stripe)}
        >
          <span style={{ background: BLANKETS[key].d }} />
          <span style={{ background: BLANKETS[key].d }} />
        </button>
      </div>
    </div>
  );
}

function FrameSheet({
  current,
  saving,
  onSave,
}: {
  current: { cells: string; mine: boolean } | null;
  saving: boolean;
  onSave: (cells: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(BLANK);
  const [ink, setInk] = useState(1);
  const painting = useRef(false);
  useEffect(() => {
    const up = () => (painting.current = false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  if (!open) {
    return (
      <button
        className={current ? s.sheetPeek : s.quiet}
        onClick={() => {
          setSheet(current?.cells ?? BLANK);
          setInk(1);
          setOpen(true);
        }}
      >
        {current ? (
          <>
            <span className={s.sheetPeekLabel}>{current.mine ? "you put this up" : "on the wall"}</span>
            <Sheet cells={current.cells} />
          </>
        ) : (
          "Draw something for the frame"
        )}
      </button>
    );
  }

  const paint = (x: number, y: number) => setSheet((c) => withCell(c, x, y, ink));

  return (
    <div className={s.panel}>
      <p className={s.panelTitle}>for the frame</p>
      <div
        className={s.sheetGrid}
        role="group"
        aria-label={`Drawing, ${DOODLE_W} by ${DOODLE_H}`}
        style={{ gridTemplateColumns: `repeat(${DOODLE_W}, 1fr)` }}
      >
        {Array.from({ length: DOODLE_CELLS }, (_, i) => {
          const x = i % DOODLE_W;
          const y = Math.floor(i / DOODLE_W);
          const at = cellAt(sheet, x, y);
          return (
            <button
              key={i}
              className={s.sheetCell}
              style={{ background: DOODLE_INK[at] || "transparent" }}
              aria-label={`Row ${y + 1}, column ${x + 1}: ${DOODLE_NAMES[at]}`}
              onPointerDown={(e) => {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                painting.current = true;
                paint(x, y);
              }}
              onPointerEnter={() => painting.current && paint(x, y)}
              onClick={() => paint(x, y)}
            />
          );
        })}
      </div>

      <div className={s.inkRow}>
        {DOODLE_INK.map((hex, i) => (
          <button
            key={i}
            className={s.inkDot}
            aria-label={DOODLE_NAMES[i]}
            aria-pressed={ink === i}
            title={DOODLE_NAMES[i]}
            style={{
              background: hex || "var(--panel)",
              boxShadow: ink === i ? "0 0 0 2.5px var(--honey)" : "inset 0 0 0 1px var(--line)",
            }}
            onClick={() => setInk(i)}
          />
        ))}
      </div>

      <div className={s.row} style={{ marginTop: 12 }}>
        <button className={s.btn} disabled={isBlank(sheet)} onClick={() => setSheet(BLANK)}>
          Start over
        </button>
        <button className={s.btn} onClick={() => setOpen(false)}>
          Never mind
        </button>
        <button
          className={`${s.btn} ${s.btnGo}`}
          disabled={saving}
          onClick={() => {
            onSave(sheet);
            setOpen(false);
          }}
        >
          {isBlank(sheet) && current ? "Take it down" : "Hang it up"}
        </button>
      </div>
    </div>
  );
}

function Sheet({ cells }: { cells: string }) {
  return (
    <span className={s.sheetMini} style={{ gridTemplateColumns: `repeat(${DOODLE_W}, 1fr)` }} aria-hidden>
      {Array.from({ length: DOODLE_CELLS }, (_, i) => (
        <span
          key={i}
          style={{
            background: DOODLE_INK[cellAt(cells, i % DOODLE_W, Math.floor(i / DOODLE_W))] || "transparent",
          }}
        />
      ))}
    </span>
  );
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

function VoiceSync({ fur, monthsOld }: { fur: string; monthsOld: number }) {
  const coat = LOOKS.find((l) => l.cat.fur.toLowerCase() === fur.toLowerCase())?.voice ?? 1;
  const settled = Math.min(1, Math.max(0, monthsOld) / 12);
  const voice = Math.round(coat * (1 - settled * 0.04) * 100) / 100;
  useEffect(() => {
    setVoice({ pitch: voice });
  }, [voice]);
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

function moodTint(id: string, night: boolean, panel: string): string {
  const day = MOOD_TINT[id];
  if (!day) return "var(--panel)";
  return night ? mixHex(day, panel, 0.8) : day;
}

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

const FS = {
  micro: 12,
  small: 13.5,
  body: 15,
  field: 16,
  lead: 17.5,
} as const;

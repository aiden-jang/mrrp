import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Action, Arrival, Cat as CatLook, Mood, RoomView } from "./types.js";
import { ACTIONS, MOODS } from "./types.js";
import {
  doAct,
  doClock,
  doDress,
  adoptSeat,
  doDelete,
  doDraw,
  doLeave,
  doLink,
  doNotes,
  doOurDay,
  doRecover,
  doRelease,
  doSay,
  doTell,
  doTidy,
  doWindowLight,
  fetchRoom,
  doUndelete,
  doUnleave,
  forgetMe,
  forgetRoom,
  GONE,
  GoneError,
  lastCat,
  lastRoom,
  myName,
  newRoomId,
  roomFromPath,
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
import { loginUrl, siteFooterLinks } from "@aidenjang/auth-client";
import { AUTH_URL } from "./config.js";
import { foundKeys, noticed } from "./discoveries.js";
import { awayLine, milestoneLine, personalityLine } from "./remembers.js";
import { myToken } from "./api.js";
import { GoneCard, LeftCard, TheyLeftNotice } from "./screens.js";

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

const GIFT_NAMES: Record<string, string> = {
  leaf: "leaf",
  cap: "bottle cap",
  moth: "moth",
};

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
            {/* Drawn, not dingbats. ✦ ✧ ❧ are whatever the device's font decides they are, and ❧ is
                missing from plenty of them, so the list changes character between phones. */}
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
            reserveBelow={340}
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
          Then you turn up and sit with her. No account needed, no notifications, nothing to keep up with.
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
        {/* Links here, plain text inside a room. This page is the one strangers see, so a credit that
            goes somewhere belongs, and it is the right place for the legal pages now that a seat can be
            tied to an account. In the room a link pointing away from a note she is reading turns a
            signature into a byline with a call to action, which this app has refused to be all along.

            The list comes from the shared client so it stays in step with the other apps; the paw and
            the type are mrrp's own so the footer still looks like this room. */}
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
  // Memoized, and it has to be. An inline arrow here is a new function every render, which is in the
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
      // Back on the shelf first, always. Showing her knock it off instantly reads as the tap failing
      // rather than as her doing it.
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
      // The mug is still on the floor. Tap it again.
    }
  }, []);
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
      // A full reload rather than setGone(null). Everything this page holds was thrown away when the
      // room went, and the room it comes back to is the one on the server, not the one in memory.
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
      // Her seat is free and this browser is a stranger here now, so the room she would load is not
      // hers to see. Home rather than the gone screen: the room is still standing, just not for her.
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
        ? sceneFor(view.clock, Date.now(), view.catMood, view.bothHereNow, view.personality ? HER_SPOT : null)
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

  const [asking, setAsking] = useState(!myName.get());
  const [name, setName] = useState("");
  const [shareResult, setShareResult] = useState<"copied" | "shared" | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const link = async (on: boolean) => {
    setLinking(true);
    try {
      await doLink(id, on);
      await load();
    } catch (e) {
      // Redirect only when the room says they are signed out. Redirecting on any failure sends people
      // who are already signed in on a round trip through a login page, back to where they started.
      if (on && e instanceof Error && e.message === SIGNED_OUT) {
        sessionStorage.setItem(FINISH_LINK, id);
        window.location.href = loginUrl(AUTH_URL, window.location.href);
        return;
      }
      setErr(e instanceof Error ? e.message : "Couldn't do that.");
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
    // Grows to fit rather than scrolling. Two fixed rows hid most of her 140 characters and cut the
    // last visible line through the middle of the letters.
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
    // Debounced, not per keystroke: reacting to every letter makes her twitchy and turns her into a
    // progress bar. The beat of stillness before she answers is the point.
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
        // Coming back is spent by the read that reports it, so latch it. Anything that reads the room
        // twice before it paints loses the line: a retried first request, or React's double effect in
        // development, which is why this was never once visible while building.
        const back = awayLine(next.awayMs, next.cat.name);
        if (back) setAwayNote((prev) => prev ?? back);
        if (next.arrivals.length > 0) setArrivalCard(next.arrivals);
        setErr(null);
      } catch (e) {
        // A gone room is the one failure that must not be retried into. Everything else here is
        // "the train went into a tunnel"; this one is an answer.
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
    // Stop once the room is gone. Nothing about a deleted room changes, so a tab left open on the
    // gone screen would sit there asking for it every fifteen seconds forever.
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
      // Say so. The bounce and the sound fire before the request, so without this a failed action
      // looked exactly like a successful one: you would believe you had petted her, and she never knew.
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

  const say = async () => {
    setSaving(true);
    try {
      setView(await doSay(id, line));
      setLineOpen(false);
    } catch {
      // Her words are still in the box. The button is still there.
    }
    setSaving(false);
  };

  // Optimistic on purpose. Waiting for the round trip makes tapping a mood feel like it did not
  // register on anything slower than a desk connection, and the server never refuses hers.
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

  // No cat on this screen, on purpose. Every other empty state in the app draws her asleep and
  // promises to keep trying, because every other empty state is a bad connection. This one is an
  // answer, and drawing the cat here would be telling somebody she is still in there.
  //
  // Two versions of it. Whoever deleted the room can still put it back, so he gets the date it stops
  // being possible. She is not offered a way back because she does not have one, and dangling one in
  // front of her would be worse than the plain fact.
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

  // She used the leave button, so the room will not seat this browser again on its own. Saying so
  // beats the alternative, which is the stranger screen telling her a room she was in for a year
  // belongs to two people she is not one of.
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
  const scene = sceneFor(view.clock, Date.now(), view.catMood, view.bothHereNow, herSpot);

  const chrome = chromeFor(scene);
  const roomTheme = chrome as React.CSSProperties;

  const nightChrome = isNightChrome(scene.sun);

  // Never gate on `!view.youAreHer`. That is also true for a third person holding the link, and it
  // hands a spectator his whole side of the app.
  const iAmHim = view.you !== null && !view.youAreHer;

  const herDay = iAmHim ? dayApart(view.clock) : null;
  const moon = nightChrome ? moonLine(new Date(), view.cat.name) : null;

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
            doodle={view.doodle?.cells ?? null}
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
         * The quiet lines under the room, and at most two of them.
         *
         * They were written one at a time, each rare enough on its own to be an aside. Together they
         * are not: a long-distance couple has the date line every single day, the personality line is
         * permanent once earned, and on a full-moon anniversary all four land at once and turn the
         * space under the room into eight lines of grey. That is the same mistake the milestones
         * already avoid, where the comment reads "a room that celebrates every fortnight is not
         * celebrating".
         *
         * Ordered rarest first and cut to two, so a once-a-year line is never crowded out by a daily
         * one, and an ordinary evening still has something to say. Not shown to a spectator, who is
         * not part of any of it.
         */}
        {!setup &&
          (iAmHim || view.youAreHer) &&
          [
            view.milestone && milestoneLine(view.milestone, view.cat.name),
            awayNote,
            moon,
            view.personality && personalityLine(view.personality, view.youAreHer, view.them),
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

        {/* The one gesture that isn't a button was also the one nobody could find. It disappears after
            the first touch rather than nagging, and it is never shown to a spectator, who has nothing
            to touch. */}
        {!setup && nudge === 0 && (iAmHim || view.youAreHer) && (
          <p className={s.hint}>{iAmHim ? `Hold on ${view.cat.name} to pet her` : `Tap ${view.cat.name}`}</p>
        )}

        {iAmHim && setup && draft && (
          <div
            className={s.panel}
            id="setup-panel"
            ref={setupPanel}
            tabIndex={-1}
            aria-label="Write her notes and set up her cat"
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
            {/* One row, however many there are, so adding an eye colour cannot leave an orphan. */}
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

            {/*
             * Her notes, one per line. A textarea rather than add/remove fields: this gets written
             * once and probably pasted in, and thirty inputs would be thirty things to tab through.
             * Blank lines are dropped server-side, so pasting messy text is fine.
             */}
            {/*
             * A day the room should notice, in his words.
             *
             * Both fields or neither: a date with no name gives the room nothing to say, and a name
             * with no date never arrives. The year is discarded, so this never becomes a count of
             * how long it has been.
             */}
            <p className={s.fieldLabel}>a day worth remembering</p>
            <input
              className={s.input}
              type="date"
              value={draft.ourDate}
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

            {/* Errors belong next to the button that failed. At the bottom of a panel this tall, they
                are off screen. */}
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
                Write her notes and set up her cat
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
                  ref={lineBox}
                  value={line}
                  maxLength={LINE_MAX}
                  placeholder={`Something for ${view.them ?? "him"} to find`}
                  onChange={(e) => setLine(e.target.value)}
                  className={s.sayInput}
                />
                {/* Silent until it is nearly over. A counter sitting there from the first character
                    turns a note to somebody into a form with a budget. */}
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

            {iAmHim && <FrameSheet current={view.doodle} saving={drawing} onSave={(c) => void hangUp(c)} />}

            {iAmHim && view.noteDay && (
              <p className={s.small} style={{ textAlign: "center" }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
            {/* Names the notes, because the notes are what is behind it. This said "change how she
                looks, or her hours" while the one-a-day gift, the whole point of the room, sat inside
                it unmentioned. Same bug as the sign-in buried under "show my recovery code": a label
                that lists some of what is inside hides the rest of it completely. */}
            {iAmHim && !setup && (
              <button className={s.quiet} onClick={openSetup}>
                Write her notes, or change how {view.cat.name} looks
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
                  This room belongs to two people, and both seats are taken. You can watch the cat.
                </p>
                {/*
                 * The likelier of the two reasons somebody is standing here, so it needs words.
                 *
                 * A seat is a token in one browser. The second one gets spent by a private window, or
                 * by whoever the link was forwarded to opening it once. The person the room was for
                 * then arrives to a recovery box addressed to its maker, which reads as the app telling
                 * her it is somebody else's room. Nothing frees a seat on its own, so say what to do.
                 */}
                <p className={s.small} style={{ textAlign: "center", marginTop: 10 }}>
                  If you have been in here before, your recovery code will get you back in. If a seat is being
                  held by a browser that is not yours, ask whoever sent you the link to free it.
                </p>
                {/* A new phone lands on exactly this screen, so this is where the way back belongs.
                    Nothing here leaks: redeeming needs the code, and the code only ever goes to him. */}
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

            {/* The only recovery this app has, so it has to be findable, and it evicts her current
                device, so it asks first. Kept quiet and last: it matters on one day out of a year. */}
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
          </>
        )}

        {/* The whole sentence comes from whoever set it. Do not append "trying again in a moment"
            here: most of these errors have nothing retrying behind them. */}
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
            Both ways back in, behind a summary that names the job rather than one of the answers.

            This block has now made the same mistake twice. The code used to live inside "change how
            she looks", so the one string that recovers a seat sat behind a button labelled as a
            cosmetic editor. Moving it here fixed that and then buried signing in under "show my
            recovery code", where nobody looking for an account would think to open it. A way back you
            cannot find is not a way back, and the label has to name the question, not the first
            answer somebody happened to write.
          */}
        {!setup && view.recoveryCode && (
          <details className={s.recovery}>
            <summary className={s.recoverySummary}>getting back in on a new phone</summary>
            <p className={s.small} style={{ marginTop: 8 }}>
              Two ways, and you only need one. Either keep this code somewhere that is not this phone, or sign
              in and let the room remember for you.
            </p>
            <RecoveryCode code={view.recoveryCode} />

            {/* Here and nowhere near the front door, which is the point: she taps a link and she is in.
                Signing in is something you can decide to do afterwards, or never. */}
            <p className={s.small} style={{ marginTop: 14 }}>
              {view.linked
                ? "This seat is on your account, so signing in on a new phone brings you straight back here."
                : "Or sign in, and this seat comes back on any phone you sign in on. No code to keep."}{" "}
              {/* Beside the control rather than in the footer. This is where somebody decides to
                  attach a room to an identity, so it is where the question comes up. */}
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
            <button className={s.quiet} disabled={linking} onClick={() => void link(!view.linked)}>
              {view.linked ? "Take this seat off my account" : "Keep this seat on my account"}
            </button>
          </details>
        )}

        {/*
         * The way out, and it is two different doors.
         *
         * His ends the room for both of them, because he made it and it is his notes in it. Hers takes
         * her side and leaves his standing, so she has a way to remove herself that does not cost him a
         * year. Both are here rather than buried in a settings page: an app that can hold something
         * this personal has to show you how to end it, in the room, where you are.
         */}
        {!setup && (iAmHim || view.youAreHer) && (
          <details className={s.recovery} onToggle={() => setLeaveArmed(false)}>
            <summary className={s.recoverySummary}>{iAmHim ? "delete this room" : "leave this room"}</summary>
            {iAmHim ? (
              <>
                <p className={s.small} style={{ marginTop: 8 }}>
                  This deletes the whole room for both of you: {view.cat.name}, the notes, everything either
                  of you left in here. It happens straight away. You have a week to change your mind, and
                  after that it is erased for good.
                </p>
                <p className={s.small} style={{ marginTop: 10 }}>
                  Type her name to confirm.
                </p>
                <input
                  className={s.input}
                  value={typedName}
                  placeholder={view.cat.name}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Type ${view.cat.name} to confirm deleting this room`}
                  onChange={(e) => setTypedName(e.target.value)}
                />
                <button
                  className={s.quiet}
                  disabled={ending || typedName.trim().toLowerCase() !== view.cat.name.trim().toLowerCase()}
                  onClick={() => void endRoom()}
                >
                  {ending ? "deleting…" : "Delete this room for both of us"}
                </button>
              </>
            ) : (
              <>
                <p className={s.small} style={{ marginTop: 8 }}>
                  This takes your side out of the room: your moods, your visits, the days you have been in
                  here. {view.them ?? "The other one"} keeps the room and {view.cat.name} stays, but she will
                  not be you any more. You have a week to change your mind, unless the seat is taken before
                  then.
                </p>
                {/* Two taps, because it costs her the same as deleting costs him and she has no name to
                    type. Closing the panel disarms it, so a stray tap does not sit there armed. */}
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

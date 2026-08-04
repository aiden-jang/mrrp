import { useCallback, useEffect, useState } from "react";
import type { Action, Mood, RoomView } from "./types.js";
import { ACTIONS, MOODS } from "./types.js";
import { doAct, doTell, fetchRoom, myName, newRoomId, roomFromPath } from "./api.js";
import { Cat } from "./Cat.js";
import { sceneFor } from "./hours.js";

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

export function App() {
  const id = roomFromPath();
  return id ? <RoomPage id={id} /> : <Landing />;
}

/* ─────────────── landing: make a room, send the link ─────────────── */
function Landing() {
  const [name, setName] = useState(myName.get() ?? "");
  const make = () => {
    if (!name.trim()) return;
    myName.set(name.trim());
    location.href = `/r/${newRoomId()}`;
  };
  return (
    <main style={S.page}>
      <div style={{ ...S.card, textAlign: "center" }}>
        <h1 style={S.h1}>mrrp</h1>
        <p style={{ ...S.lede, margin: "0 auto 22px" }}>
          A cat that is her. She tells it how she's doing, and that's how it is. You get the link,
          you turn up, and you sit with her.
        </p>
        <input
          style={S.input}
          value={name}
          maxLength={24}
          placeholder="your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && make()}
        />
        <button style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 10 }} onClick={make} disabled={!name.trim()}>
          Make her a room
        </button>
        <p style={{ ...S.small, marginTop: 14 }}>
          You'll get a link. Send it to one person. That's the whole thing.
        </p>
      </div>
    </main>
  );
}

/* ─────────────── the room ─────────────── */
function RoomPage({ id }: { id: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [petting, setPetting] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [asking, setAsking] = useState(!myName.get());
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (n?: string | null) => {
    try { setView(await fetchRoom(id, n ?? myName.get())); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
  }, [id]);

  useEffect(() => { if (!asking) void load(); }, [asking, load]);

  // No socket: the room is asynchronous by design. A quiet poll is enough to turn "was here" into
  // "is here" while she has the tab open, and to roll the note over at her midnight.
  useEffect(() => {
    if (asking) return;
    const id = setInterval(() => void load(), 45_000);
    const onShow = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, [asking, load]);

  const act = async (a: Action) => {
    setNudge((v) => v + 1);
    try { setView(await doAct(id, a)); } catch { /* she'll survive */ }
  };

  const tell = async (m: Mood) => {
    setNudge((v) => v + 1);
    try { setView(await doTell(id, m)); } catch { /* she'll survive */ }
  };

  if (asking) {
    return (
      <main style={S.page}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <h1 style={S.h1}>mrrp</h1>
          <p style={{ ...S.lede, margin: "0 auto 20px" }}>Someone made you a cat.</p>
          <input
            style={S.input} value={name} maxLength={24} placeholder="your name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { myName.set(name.trim()); setAsking(false); } }}
          />
          <button
            style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 10 }}
            disabled={!name.trim()}
            onClick={() => { myName.set(name.trim()); setAsking(false); }}
          >
            Go in
          </button>
        </div>
      </main>
    );
  }

  if (err) return <main style={S.page}><p style={S.lede}>{err}</p></main>;
  if (!view) return <main style={S.page}><p style={S.small}>opening the door quietly…</p></main>;

  const last = view.theirRecent[0];
  const scene = sceneFor(view.clock, Date.now(), view.catMood);

  return (
    <main style={S.page}>
      <div style={S.card}>
        <div style={S.stage}>
          <Cat look={view.cat} clock={view.clock} mood={view.catMood} petting={petting} nudge={nudge} />
          {/* holding on her is petting; it is the one gesture that isn't a button */}
          {!view.youAreHer && (
            <div
              style={S.petLayer}
              onPointerDown={() => { setPetting(true); void act("pet"); }}
              onPointerUp={() => setPetting(false)}
              onPointerLeave={() => setPetting(false)}
            />
          )}
        </div>

        {/* What she's doing about what you told her, in her time, not the server's. */}
        <p style={S.doing}>{view.cat.name} is {scene.doing}.</p>

        {view.waitingForThem ? (
          <>
            <p style={S.newsMain}>{view.cat.name} is asleep. Nobody else is here yet.</p>
            <p style={{ ...S.small, textAlign: "center" }}>
              Send this link to the one person it's for. Whoever opens it second is the one the cat is.
            </p>
            <button
              style={{ ...S.btn, ...S.btnGo, width: "100%", marginTop: 12 }}
              onClick={() => {
                void navigator.clipboard.writeText(location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              }}
            >
              {copied ? "Copied. Go send it." : "Copy the link"}
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
                {!view.note.final && <p style={S.noteDay}>day {view.note.day} of {view.note.total}</p>}
              </div>
            )}

            {view.themHereNow ? (
              <p style={S.came}><b>{view.them}</b> is in here right now.</p>
            ) : last ? (
              <p style={S.came}>
                <b>{view.them}</b> {pastTense(last.action)}, {whenish(last.at)}.
              </p>
            ) : view.themLastAt ? (
              <p style={S.came}><b>{view.them}</b> looked in {whenish(view.themLastAt)}.</p>
            ) : null}

            {view.theyCameAfter && !view.themHereNow && (
              <p style={S.came}>He came in after you said that.</p>
            )}

            <p style={S.tellLabel}>
              {view.catMood
                ? `still ${MOODS.find((m) => m.id === view.catMood)?.label}?`
                : "how are you today?"}
            </p>
            <div style={S.moodRow}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  style={{ ...S.mood, ...(view.catMood === m.id ? S.moodOn : null) }}
                  onClick={() => void tell(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── his side: he finds out how she is, and does something about it ── */
          <>
            <div style={S.theirs}>
              <p style={S.theirsMain}>
                {view.catMood ? (
                  <>
                    <b>{view.them}</b> is {MOODS.find((m) => m.id === view.catMood)?.said}
                    {view.catMoodAt ? `, ${whenish(view.catMoodAt)}` : ""}.
                  </>
                ) : (
                  <><b>{view.them}</b> hasn't said how she is yet today.</>
                )}
              </p>
              <p style={{ ...S.small, color: "rgba(255,255,255,.82)", marginTop: 4 }}>
                Go and be in there. That's all it takes.
              </p>
            </div>

            <div style={S.row}>
              {ACTIONS.map((a) => (
                <button key={a.id} style={S.btn} onClick={() => void act(a.id)}>{a.label}</button>
              ))}
            </div>

            {view.noteDay && (
              <p style={{ ...S.small, textAlign: "center", marginTop: 12 }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
          </>
        )}

        <p style={{ ...S.small, textAlign: "center", marginTop: 14 }}>
          Nothing in here needs keeping up with. No streaks, no history, and nothing kept except how
          you are right now.
        </p>
      </div>
    </main>
  );
}

/* ─────────────── styles, inline to keep this one small ─────────────── */
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100%", display: "grid", placeItems: "center", padding: "28px 18px 48px" },
  card: { width: "100%", maxWidth: 520 },
  h1: { fontSize: 40, margin: "0 0 8px", letterSpacing: "-0.02em", textAlign: "center" },
  lede: { fontSize: 15.5, color: "var(--soft)", maxWidth: "38ch", lineHeight: 1.55 },
  small: { fontSize: 13, color: "var(--soft)", margin: 0, lineHeight: 1.5 },
  stage: {
    position: "relative", width: "100%", aspectRatio: "5 / 4", borderRadius: 26, overflow: "hidden",
    background: "#efdcc2", boxShadow: "0 18px 44px -22px rgba(120,84,44,.45)",
  },
  petLayer: { position: "absolute", inset: 0, cursor: "grab", touchAction: "none" },
  doing: { fontSize: 13.5, color: "var(--soft)", textAlign: "center", margin: "14px 0 0", fontStyle: "italic" },
  theirs: {
    margin: "14px 0 2px", padding: "13px 16px", borderRadius: 18,
    background: "var(--honey)", color: "#fff",
  },
  theirsMain: { fontSize: 16.5, lineHeight: 1.5, margin: 0 },
  came: {
    fontSize: 13.5, textAlign: "center", color: "var(--soft)", margin: "12px 0 0",
  },
  tellLabel: {
    fontSize: 11.5, letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 600,
    color: "var(--soft)", textAlign: "center", margin: "18px 0 7px",
  },
  moodRow: { display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 14 },
  mood: {
    font: "inherit", fontSize: 14, color: "var(--ink)", background: "var(--panel)",
    border: "1px solid var(--line)", borderRadius: 999, padding: "8px 15px", cursor: "pointer",
  },
  moodOn: { background: "var(--honey)", borderColor: "var(--honey)", color: "#fff", fontWeight: 600 },
  note: {
    margin: "14px 0 2px", padding: "15px 17px", borderRadius: 18,
    background: "var(--panel)", border: "1px solid var(--line)",
  },
  noteFrom: {
    fontSize: 11.5, letterSpacing: ".07em", textTransform: "uppercase",
    color: "var(--soft)", margin: "0 0 7px", fontWeight: 600,
  },
  noteText: { fontSize: 16.5, lineHeight: 1.55, margin: 0 },
  noteDay: { fontSize: 12, color: "var(--soft)", margin: "9px 0 0", textAlign: "right" },
  news: { margin: "16px 2px 16px", textAlign: "center" },
  newsMain: { fontSize: 17.5, margin: "0 0 5px", lineHeight: 1.45 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  btn: {
    font: "inherit", fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "var(--panel)",
    border: "1px solid var(--line)", borderRadius: 14, padding: "11px 12px", cursor: "pointer",
  },
  btnGo: { background: "var(--honey)", borderColor: "var(--honey)", color: "#fff" },
  input: {
    font: "inherit", fontSize: 16, width: "100%", padding: "11px 13px",
    border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", color: "var(--ink)",
  },
};

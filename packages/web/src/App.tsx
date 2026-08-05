import { useCallback, useEffect, useState } from "react";
import type { Action, Mood, RoomView } from "./types.js";
import { ACTIONS, MOODS } from "./types.js";
import { doAct, doClock, doDress, doRelease, doSay, doTell, fetchRoom, myName, newRoomId, roomFromPath } from "./api.js";
import { Cat } from "./Cat.js";
import { sceneFor } from "./hours.js";
import { EYES, LOOKS, timezones } from "./looks.js";

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

/**
 * A tint per mood, because six identical grey pills was the least cute thing on the page and this
 * is the one control she actually touches.
 *
 * Kept very low saturation and all in the room's family of creams, clays and roses. Six saturated
 * chips would read as a paintbox, and a paintbox next to hand-authored pixel art looks like two
 * different apps. Nothing here is dark or cold: what she taps on a bad day should not look like a
 * bad day, which is the same rule the room follows in moods.ts.
 */
const MOOD_TINT: Record<string, string> = {
  good: "#f8e3b8",
  tired: "#e7ddd0",
  stressed: "#f2dcc9",
  sad: "#e4dfd4",
  lonely: "#f0dcd8",
  bored: "#e6e3d2",
};

export function App() {
  const id = roomFromPath();
  return id ? <RoomPage id={id} /> : <Landing />;
}

/**
 * The cat the front door shows, before anybody has made a room.
 *
 * She is the entire product, and the landing page used to be a heading, an input and a button: the
 * one thing that explains this app in less time than a sentence was the one thing not on the page.
 * Ginger tabby because that is what a new room ships with, so the door is not advertising a cat you
 * then have to go and build.
 *
 * The viewer's own timezone, so she is doing whatever fits the hour where they actually are. Reading
 * "asleep in the best spot" at 2am is a better introduction than any tagline.
 */
const DOOR_CAT = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
const DOOR_CLOCK = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  homeHour: 19,
};

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
        <div style={{ ...S.stage, marginBottom: 18 }}>
          <Cat label="A pixel cat asleep in a sunlit room." look={DOOR_CAT} clock={DOOR_CLOCK} mood={null} nudge={0} />
        </div>
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
        <p style={S.credit}>made by aiden jang</p>
      </div>
    </main>
  );
}

/* ─────────────── the room ─────────────── */
function RoomPage({ id }: { id: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nudge, setNudge] = useState(0);
  const [asking, setAsking] = useState(!myName.get());
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [did, setDid] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupErr, setSetupErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; look: string; eyes: string; tz: string; homeHour: number } | null>(null);

  const load = useCallback(async (n?: string | null) => {
    try {
      setView(await fetchRoom(id, n ?? myName.get()));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [id]);

  useEffect(() => { if (!asking) void load(); }, [asking, load]);

  // No socket: the room is asynchronous by design, so a quiet poll is enough to turn "was here" into
  // "is here" while the tab is open.
  //
  // It skips hidden tabs, which matters more than it looks: a phone left on this page overnight was
  // ~1,900 Durable Object requests rendering a sleeping cat to a screen nobody was looking at. One
  // fetch on becoming visible again covers everything the missed ticks would have.
  useEffect(() => {
    if (asking) return;
    const tick = setInterval(() => { if (!document.hidden) void load(); }, 45_000);
    const onShow = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onShow); };
  }, [asking, load]);

  const act = async (a: Action) => {
    setNudge((v) => v + 1);
    try {
      setView(await doAct(id, a));
      // He gets one line back, phrased the way she'll read it, so the button does something visible.
      const said = ACTIONS.find((x) => x.id === a)?.mine;
      if (said) {
        setDid(said);
        setTimeout(() => setDid(null), 2600);
      }
    } catch { /* she'll survive */ }
  };

  /** Opening the panel seeds the draft from whatever the room already has. */
  const openSetup = () => {
    if (!view) return;
    const look = LOOKS.find((l) => l.cat.fur.toLowerCase() === view.cat.fur.toLowerCase())?.id ?? LOOKS[0]!.id;
    const eyes = EYES.find((e) => e.hex.toLowerCase() === view.cat.eyes.toLowerCase())?.id ?? EYES[0]!.id;
    setDraft({ name: view.cat.name, look, eyes, tz: view.clock.tz, homeHour: view.clock.homeHour });
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
    } catch { /* she'll survive */ }
    setSaving(false);
  };

  /**
   * Optimistic on purpose. The chip used to stay unlit until the round trip came back, so on anything
   * slower than a desk connection tapping a mood felt like it had not registered: no highlight, no
   * label change, and a cat that only started moving once the response landed. The mood is hers and
   * the server never rejects a valid one, so showing it immediately is honest.
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

  // Only a total failure with nothing to show gets the whole page. Once the room has loaded once, a
  // dropped request is a quiet line at the bottom, not the cat vanishing.
  if (!view) {
    return (
      <main style={S.page}>
        <p style={S.small}>{err ?? "opening the door quietly…"}</p>
      </main>
    );
  }

  const last = view.theirRecent[0];
  const scene = sceneFor(view.clock, Date.now(), view.catMood);

  /**
   * Whether the viewer actually holds his seat, rather than merely not being her.
   *
   * `!view.youAreHer` is true for a third person with the link, so gating on it handed spectators his
   * entire control surface: the four action buttons, and a setup panel that previewed a recoloured cat
   * live and then failed on Save with a 403 reported in small text at the bottom of a long panel. It
   * looked exactly like "changing the colour does nothing". The Worker was right to refuse; the UI was
   * wrong to offer.
   */
  const iAmHim = view.you !== null && !view.youAreHer;

  // While the panel is open the canvas shows the draft, so choosing a cat is a thing you watch
  // happen rather than a form you submit and hope about.
  const previewLook = setup && draft
    ? {
        ...view.cat,
        name: draft.name.trim() || "Bean",
        ...LOOKS.find((l) => l.id === draft.look)!.cat,
        eyes: EYES.find((e) => e.id === draft.eyes)!.hex,
      }
    : view.cat;

  return (
    <main style={S.page}>
      <div style={S.card}>
        <div style={S.stage}>
          <Cat
            label={`${previewLook.name} is ${scene.doing}.`}
            look={previewLook}
            clock={setup && draft ? { ...view.clock, tz: draft.tz, homeHour: draft.homeHour } : view.clock}
            mood={view.catMood}
            nudge={nudge}
            eyesOpen={setup}
            /* Holding on her is petting, the one gesture that isn't a button. She gets a poke instead:
               she IS the cat, so petting herself would be nonsense and telling him she did it would be
               worse, but a tap that gets a mrrp back costs nothing. Local only, nobody told. A spectator
               gets neither, though the furniture is tappable for everyone. */
            role={iAmHim ? "him" : view.youAreHer ? "her" : null}
            onPet={() => void act("pet")}
            onPoke={() => setNudge((v) => v + 1)}
          />

        </div>

        {/* What she's doing about what you told her, in her time, not the server's. During setup she is
            held awake so her eye colour is visible, which makes "deeply asleep" a lie, so it says what
            is actually happening instead. */}
        <p style={S.doing}>
          {setup ? `Picking out ${view.cat.name}.` : `${view.cat.name} is ${scene.doing}.`}
        </p>

        {/* The one gesture that isn't a button was also the one nobody could find. It disappears after
            the first touch rather than nagging, and it is never shown to a spectator, who has nothing
            to touch. */}
        {!setup && nudge === 0 && (iAmHim || view.youAreHer) && (
          <p style={S.hint}>
            {iAmHim ? `Hold on ${view.cat.name} to pet her` : `Tap ${view.cat.name}`}
          </p>
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
                    boxShadow: `inset 0 -7px 0 ${l.cat.furDk}, inset 0 7px 0 ${l.cat.belly}`,
                    outline: draft.look === l.id ? "2.5px solid var(--honey)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            <p style={S.fieldLabel}>eyes</p>
            <div style={S.swatchRow}>
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
                    outline: draft.eyes === e.id ? "2.5px solid var(--honey)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            <p style={S.fieldLabel}>her timezone</p>
            <select
              style={S.input}
              value={draft.tz}
              onChange={(e) => setDraft((d) => ({ ...d!, tz: e.target.value }))}
            >
              {timezones().map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
              ))}
            </select>

            <p style={S.fieldLabel}>usually home around</p>
            <select
              style={S.input}
              value={draft.homeHour}
              onChange={(e) => setDraft((d) => ({ ...d!, homeHour: Number(e.target.value) }))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h === 0 ? "midnight" : h < 12 ? `${h}am` : h === 12 ? "noon" : `${h - 12}pm`}
                </option>
              ))}
            </select>

            {/* Errors belong next to the button that failed. This used to surface at the very bottom of
                the card, below everything, which on a panel this tall is off screen. */}
            {setupErr && <p style={{ ...S.small, color: "#a4563d", marginTop: 12 }}>{setupErr}</p>}

            <div style={{ ...S.row, marginTop: 12 }}>
              <button style={S.btn} onClick={() => setSetup(false)}>Cancel</button>
              <button style={{ ...S.btn, ...S.btnGo }} disabled={savingSetup} onClick={() => void saveSetup()}>
                {savingSetup ? "Saving..." : "Save her"}
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
            <p style={{ ...S.small, color: "rgba(255,255,255,.85)", marginTop: 4 }}>
              {view.youAreHer
                ? `Hold on ${view.cat.name} and he'll see it happen.`
                : `Hold on ${view.cat.name}. She's right there.`}
            </p>
          </div>
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
                {/* Just the day, not "day 1 of 30". The total is however many notes are in notes.ts,
                    which is an implementation detail, and printing it turned a gift into a countdown
                    she could watch run out. */}
                {!view.note.final && <p style={S.noteDay}>day {view.note.day}</p>}
              </div>
            )}

            {/* The banner above already says you're both in here, in bigger type. Saying it twice
                on the same screen reads as a bug rather than as warmth. */}
            {view.bothHereNow ? null : view.themHereNow ? (
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
                  <button style={S.btn} onClick={() => setLineOpen(false)}>Never mind</button>
                  <button style={{ ...S.btn, ...S.btnGo }} disabled={saving} onClick={() => void say()}>
                    {saving ? "Leaving it..." : "Leave it"}
                  </button>
                </div>
              </div>
            ) : view.herLine ? (
              <button style={S.yourLine} onClick={() => { setLine(view.herLine!.text); setLineOpen(true); }}>
                <span style={S.yourLineLabel}>you left him this</span>
                <span style={S.yourLineText}>{view.herLine.text}</span>
              </button>
            ) : (
              <button style={S.quiet} onClick={() => { setLine(""); setLineOpen(true); }}>
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
                    ...(view.catMood === m.id
                      ? S.moodOn
                      : { background: MOOD_TINT[m.id] ?? "var(--panel)", borderColor: "transparent" }),
                  }}
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
              <p style={{ ...S.small, marginTop: 4 }}>Go and be in there. That's all it takes.</p>
            </div>

            {/* Above the buttons, deliberately. She wrote him a sentence; the buttons are things he
                can do any time. Having her words sit underneath four controls got the priority exactly
                backwards on the one screen where she has actually said something. */}
            {view.herLine && (
              <div style={S.note}>
                <p style={S.noteFrom}>{view.them} left you this</p>
                <p style={S.noteText}>{view.herLine.text}</p>
                <p style={S.noteDay}>{whenish(view.herLine.at)}</p>
              </div>
            )}

            <div style={{ ...S.row, marginTop: 14 }}>
              {ACTIONS.map((a) => (
                <button key={a.id} style={S.btn} onClick={() => void act(a.id)}>{a.label}</button>
              ))}
            </div>

            <p style={{ ...S.did, opacity: did ? 1 : 0 }} aria-live="polite">
              {did ? `She'll see that you ${did}.` : "\u00a0"}
            </p>

            {view.noteDay && (
              <p style={{ ...S.small, textAlign: "center" }}>
                She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
              </p>
            )}
            {!setup && (
              <button style={S.quiet} onClick={openSetup}>
                Change how {view.cat.name} looks, or her hours
              </button>
            )}

            {/* The only recovery this app has, so it has to be findable, and it evicts her current
                device, so it asks first. Kept quiet and last: it matters on one day out of a year. */}
            {!setup && !view.waitingForThem && (
              releasing ? (
                <div style={{ ...S.panel, marginTop: 14 }}>
                  <p style={{ ...S.small, color: "var(--ink)" }}>
                    This frees her seat, and whoever opens the link next becomes the cat. Send it to her
                    again afterwards. She keeps her place in the notes and the line she left you.
                  </p>
                  <div style={{ ...S.row, marginTop: 12 }}>
                    <button style={S.btn} onClick={() => setReleasing(false)}>Never mind</button>
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
              )
            )}
          </>
        )}

        {err && (
          <p style={{ ...S.small, textAlign: "center", marginTop: 12, color: "#a4563d" }}>
            {err} Trying again in a moment.
          </p>
        )}

        <div style={S.footer}>
          <p style={{ ...S.small, textAlign: "center" }}>
            Nothing in here needs keeping up with. No streaks, no history, and nothing kept except how
            you are right now.
          </p>
          <p style={S.credit}>made by aiden jang</p>
        </div>
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
  /**
   * The footer, as one block instead of two grey paragraphs and a floating byline.
   *
   * No rule above it. What read as awkward was the credit sitting 22px below a three-line grey
   * paragraph at almost the same weight: two separate quiet things competing to be last, so neither
   * looked deliberate. Grouped, with the space outside the group rather than inside it, and the credit
   * pulled right up under the line it belongs to.
   */
  footer: { marginTop: 28 },
  credit: { fontSize: 11, color: "var(--soft)", opacity: 0.55, textAlign: "center", margin: "8px 0 0" },
  /** Shown once, until the first touch. Small, centred, and never in the way. */
  hint: {
    fontSize: 12.5, color: "var(--soft)", opacity: 0.8, textAlign: "center", margin: "6px 0 0",
  },
  stage: {
    position: "relative", width: "100%", aspectRatio: "5 / 4", borderRadius: 26, overflow: "hidden",
    background: "#efdcc2", boxShadow: "0 18px 44px -22px rgba(120,84,44,.45)",
  },
  doing: { fontSize: 13.5, color: "var(--soft)", textAlign: "center", margin: "14px 0 0", fontStyle: "italic" },
  // A quiet panel, not a gold block. How she is appears on his side every single day, whereas the
  // two of you being in the room at the same moment happens rarely — and when it did, two identical
  // gold cards stacked on top of each other and the rare one lost. Only one of these should shout.
  theirs: {
    margin: "14px 0 2px", padding: "13px 16px", borderRadius: 18,
    background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
  },
  theirsMain: { fontSize: 16.5, lineHeight: 1.5, margin: 0 },
  did: {
    fontSize: 13, textAlign: "center", color: "var(--soft)", margin: "12px 0 4px",
    transition: "opacity .25s ease", minHeight: "1.2em",
  },
  together: {
    margin: "14px 0 6px", padding: "13px 16px", borderRadius: 18,
    background: "var(--honey)", color: "#fff",
  },
  togetherMain: { fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.45 },
  sayBox: { margin: "16px 0 4px" },
  sayInput: {
    font: "inherit", fontSize: 15.5, lineHeight: 1.5, width: "100%", resize: "none",
    padding: "11px 13px", borderRadius: 14, border: "1px solid var(--line)",
    background: "var(--panel)", color: "var(--ink)",
  },
  yourLine: {
    font: "inherit", textAlign: "left", width: "100%", cursor: "pointer",
    margin: "16px 0 4px", padding: "12px 15px", borderRadius: 16,
    background: "var(--panel)", border: "1px dashed var(--line)", color: "var(--ink)",
  },
  yourLineLabel: {
    display: "block", fontSize: 13.5, color: "var(--soft)", fontWeight: 500, marginBottom: 5,
  },
  yourLineText: { display: "block", fontSize: 15.5, lineHeight: 1.5 },
  came: {
    fontSize: 13.5, textAlign: "center", color: "var(--soft)", margin: "12px 0 0",
  },
  // Sentence case, not letterspaced caps. Caps are the house style of dashboards and settings
  // screens: they read as a field label on a form you have to fill in. This is somebody asking how
  // your day was, and it should sound like it.
  tellLabel: {
    fontSize: 14, fontWeight: 500,
    color: "var(--soft)", textAlign: "center", margin: "18px 0 8px",
  },
  moodRow: { display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 14 },
  mood: {
    font: "inherit", fontSize: 14, color: "var(--ink)", background: "var(--panel)",
    border: "1px solid var(--line)", borderRadius: 999, padding: "8px 15px", cursor: "pointer",
  },
  moodOn: { background: "var(--honey)", borderColor: "var(--honey)", color: "#fff", fontWeight: 600 },
  panel: {
    margin: "16px 0 4px", padding: "15px 16px", borderRadius: 18,
    background: "var(--panel)", border: "1px solid var(--line)",
    boxShadow: "0 6px 18px -12px rgba(120,84,44,.35)",
  },
  panelTitle: {
    fontSize: 13.5, fontWeight: 500, color: "var(--soft)", margin: "0 0 9px",
  },
  fieldLabel: { fontSize: 12.5, color: "var(--soft)", margin: "12px 0 6px" },
  swatchRow: { display: "flex", flexWrap: "wrap", gap: 9 },
  swatch: {
    width: 34, height: 34, borderRadius: 10, border: "1px solid var(--line)",
    cursor: "pointer", padding: 0,
  },
  quiet: {
    font: "inherit", fontSize: 12.5, color: "var(--soft)", background: "none", border: "none",
    cursor: "pointer", display: "block", margin: "14px auto 0", textDecoration: "underline",
  },
  note: {
    margin: "14px 0 2px", padding: "15px 17px", borderRadius: 18,
    background: "var(--panel)", border: "1px solid var(--line)",
    boxShadow: "0 8px 22px -14px rgba(120,84,44,.4)",
  },
  noteFrom: {
    fontSize: 13.5, color: "var(--soft)", margin: "0 0 8px", fontWeight: 500,
  },
  noteText: { fontSize: 16.5, lineHeight: 1.55, margin: 0 },
  noteDay: { fontSize: 12, color: "var(--soft)", margin: "9px 0 0", textAlign: "right" },
  news: { margin: "16px 2px 16px", textAlign: "center" },
  newsMain: { fontSize: 17.5, margin: "12px 0 5px", lineHeight: 1.45, textAlign: "center" },
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

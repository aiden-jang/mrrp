import { usePageAnalytics } from "./usePageAnalytics.js";
import { pageForPath } from "../../../analytics/schema.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { doHold, lastRoom, markMine, myToken, roomFromPath } from "./api.js";
import s from "./App.module.css";
import { Cat } from "./Cat.js";
import { CatRoom } from "./CatRoom.js";
import { CatSetupPanel } from "./CatSetupPanel.js";
import { RoomNotesPanel } from "./RoomNotesPanel.js";
import { RoomUpdate } from "./RoomUpdate.js";
import { CompanionRoom } from "./CompanionRoom.js";
import { foundKeys, noticed } from "./discoveries.js";
import { DOOR_X, HER_SPOT, sceneFor } from "./hours.js";
import { liveOnly } from "./recent.js";
import { RoomAnnotations } from "./RoomAnnotations.js";
import { RoomActionDock } from "./RoomActionDock.js";
import { ArrivalCard, FOUND_ANNOUNCEMENTS, FOUND_AS_HER } from "./RoomArrival.js";
import { RoomHeader } from "./RoomChrome.js";
import { RoomThings, SoundToggle } from "./RoomControls.js";
import { ChromeSync, DocTitle, FaviconSync, VoiceSync } from "./RoomEffects.js";
import { InvalidRoomLink, RoomFallback } from "./RoomFallback.js";
import { RoomFooter } from "./RoomFooter.js";
import { Landing } from "./RoomLanding.js";
import { RoomSettings, RoomSettingsLink } from "./RoomSettings.js";
import { chromeFor, isNightChrome } from "./roomTheme.js";
import { RoomWaiting } from "./RoomWaiting.js";
import { SeatRecovery } from "./SeatRecovery.js";
import { play } from "./sound.js";
import type { Action } from "./types.js";
import { ACTIONS } from "./types.js";
import { useCatSetup } from "./useCatSetup.js";
import { useRoomNotes } from "./useRoomNotes.js";
import { useDoorway, useStaying } from "./useDoorway.js";
import { useOurDay } from "./useOurDay.js";
import { useRoomActions } from "./useRoomActions.js";
import { useRoomEnding } from "./useRoomEnding.js";
import { useRoomFeedback } from "./useRoomFeedback.js";
import { useRoomHistory } from "./useRoomHistory.js";
import { useRoomSession } from "./useRoomSession.js";
import { RoomStatus } from "./RoomStatus.js";
import { useRoomSharing } from "./useRoomSharing.js";
import { useSayBox } from "./useSayBox.js";
import { useSeatAccount } from "./useSeatAccount.js";
import { seatStorageAvailable, StorageUnavailable } from "./StorageUnavailable.js";

export function App() {
  usePageAnalytics(pageForPath(window.location.pathname));
  const [storageReady, setStorageReady] = useState(seatStorageAvailable);
  if (!storageReady) return <StorageUnavailable onRetry={() => setStorageReady(seatStorageAvailable())} />;
  const id = roomFromPath();
  if (id) {
    lastRoom.set(id);
    return <RoomPage key={id} id={id} />;
  }
  return /^\/r(?:\/|$)/.test(window.location.pathname) ? <InvalidRoomLink /> : <Landing />;
}

function RoomPage({ id }: { id: string }) {
  const {
    view,
    setView,
    err,
    setErr,
    gone,
    setGone,
    asking,
    setAsking,
    awayNote,
    arrivalCard,
    setArrivalCard,
    covered,
    now,
    load,
    live,
  } = useRoomSession(id);
  const sharing = useRoomSharing(view, setErr);
  const { handleCaptureReady, shareRoom, shareResult } = sharing;
  const [roomProps, setRoomProps] = useState<{
    props: { key: string; label: string }[];
    poke: (key: string) => void;
  } | null>(null);
  const [found, setFound] = useState("");
  // Keep this stable to avoid remounting the canvas.
  const handleRoomProps = useCallback(
    (props: { key: string; label: string }[], poke: (key: string) => void) => {
      setRoomProps({ props, poke });
    },
    [],
  );
  const cat = useCatSetup(id, view, load);
  const { open: setup, draft } = cat;
  const notes = useRoomNotes(id, load);
  const editing = setup || notes.open;
  const { nudge, setNudge, shelfAt, setShelfAt, arriving, stage } = useRoomFeedback(view, setup, draft?.name);
  const [did, setDid] = useState<string | null>(null);
  useEffect(() => {
    if (did !== "saved") return;
    const timer = setTimeout(() => setDid(null), 2600);
    return () => clearTimeout(timer);
  }, [did]);
  const actions = useRoomActions({ id, setView, onError: setErr, onDid: setDid, load, setNudge, setShelfAt });
  const { tidy, touchWindowLight, mugFell, petAt, strokes, sharePoke, stroke, act } = actions;

  const history = useRoomHistory(id, view, setView, setErr);
  const account = useSeatAccount(id, load, view?.you != null && !view.linked);

  const exit = useRoomEnding(
    id,
    (undoUntil) => setGone({ undoUntil }),
    (message) => setErr(message),
  );

  const ourDay = useOurDay(id, view, load, setErr);

  const doorway = useDoorway(view);
  const staying = useStaying();

  const sayBox = useSayBox(
    id,
    setView,
    () => setNudge((v) => v + 1),
    (message) => setErr(message),
  );

  const setupTrigger = useRef<HTMLButtonElement>(null);
  const setupPanel = useRef<HTMLDivElement>(null);
  const notesTrigger = useRef<HTMLButtonElement>(null);
  const notesPanel = useRef<HTMLDivElement>(null);
  const activeEditor = useRef<"cat" | "notes" | null>(null);
  useEffect(() => {
    const opened = setup ? "cat" : notes.open ? "notes" : null;
    if (opened && opened !== activeEditor.current)
      (opened === "cat" ? setupPanel : notesPanel).current?.focus();
    if (!opened && activeEditor.current)
      (activeEditor.current === "cat" ? setupTrigger : notesTrigger).current?.focus();
    activeEditor.current = opened;
  }, [setup, notes.open]);

  if (gone || asking || !view || view.youLeft) {
    return (
      <RoomFallback
        id={id}
        view={view}
        asking={asking}
        gone={gone}
        err={err}
        exit={exit}
        onRetry={load}
        onEnter={() => {
          markMine(id);
          setAsking(false);
        }}
      />
    );
  }

  const herSpot = view.personality ? HER_SPOT : null;
  const mood = actions.pendingMood ?? view.catMood;
  const hourly = sceneFor(view.clock, Date.now(), mood, view.bothHereNow, herSpot, view.sky, view.expectAt);

  // Keep the caption aligned with the cat when she waits at the door.
  const scene = view.waitingAtDoor ? { ...hourly, catX: DOOR_X, atDoor: true } : hourly;

  const chrome = chromeFor(scene);
  const nightChrome = isNightChrome(scene.sun);

  const iAmHim = view.you !== null && !view.youAreHer;

  const theirLive = liveOnly(view.theirRecent, covered.current);

  const previewLook = cat.preview ?? view.cat;

  return (
    <main className={s.page} style={chrome as React.CSSProperties}>
      <ChromeSync night={nightChrome} />
      <VoiceSync fur={view.cat.fur} monthsOld={view.monthsOld} />
      <DocTitle name={view.cat.name} replyAt={view.youAreHer ? null : (view.herLine?.at ?? null)} />
      <FaviconSync cat={view.cat} />
      <div className={`${s.card} ${s.roomCard}`}>
        <RoomHeader
          name={view.cat.name}
          together={view.themHereNow}
          presence={
            view.themHereNow
              ? "Both here. Excellent use of time."
              : view.youAreHer
                ? `${view.them ?? "Your person"} isn’t here right now. The room is.`
                : "Just you for now. Make yourself comfortable."
          }
        >
          <SoundToggle />
          {!editing && (iAmHim || view.youAreHer) && <RoomSettingsLink />}
        </RoomHeader>
        {did === "saved" && (
          <p className={s.saveFeedback} role="status">
            Saved.
          </p>
        )}
        <div className={s.roomGrid} data-editing={editing || view.waitingForThem || undefined}>
          <div className={s.sceneColumn}>
            <div ref={stage} className={`${s.stage} ${arriving ? s.stageArrival : ""}`}>
              <Cat
                compact={!setup && !view.waitingForThem && (iAmHim || view.youAreHer)}
                collectionKey={id}
                label={`${previewLook.name} is ${scene.doing}.`}
                look={previewLook}
                decor={setup && draft ? draft.decor : view.decor}
                clock={
                  setup && draft ? { ...view.clock, tz: draft.tz, homeHour: draft.homeHour } : view.clock
                }
                mood={mood}
                nudge={nudge}
                eyesOpen={setup}
                framed={view.framed}
                doodle={view.doodle?.cells ?? null}
                blanket={view.blanket}
                sky={view.sky}
                spot={herSpot}
                doorOpenAt={doorway.openAt}
                watchDoorAt={doorway.watchAt}
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
                shelfAt={shelfAt}
                petAt={petAt}
                boxOut={view.boxOut}
                onTidy={() => void tidy()}
                mugFell={mugFell}
                role={iAmHim ? "him" : view.youAreHer ? "her" : null}
                together={view.bothHereNow}
                onPet={() => void act("pet")}
                onHold={(on) => doHold(id, on)}
                onTouch={sharePoke}
                heldByThem={view.heldByThem}
                sitting={view.sittingWith || view.sittingWithYou}
                settled={view.settled}
                waiting={view.waitingAtDoor}
                brushing={strokes !== null}
                onStroke={stroke}
                pokedByThem={view.pokedByThem}
                reachedTogether={view.reachedTogether}
                onPoke={() => {
                  play("mrrp");
                  setNudge((v) => v + 1);
                }}
                onFound={(key) => {
                  noticed(id, myToken(id), key);
                  setFound(
                    (view.youAreHer ? FOUND_AS_HER[key] : undefined) ??
                      FOUND_ANNOUNCEMENTS[key] ??
                      "something in the room answered.",
                  );
                }}
                onProps={handleRoomProps}
                dreamContext={{
                  found: foundKeys(),
                  recent: view.theirRecent
                    .map((visit) => visit.action)
                    .filter(
                      (a): a is Action | "leaveout" => a === "leaveout" || ACTIONS.some((x) => x.id === a),
                    ),
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
            {roomProps && !editing && (
              <a href="#room-actions" data-skip="">
                Skip to what you can do
              </a>
            )}

            <p aria-live="polite" className={s.srOnly}>
              {found}
            </p>
            <RoomAnnotations
              view={view}
              scene={scene}
              name={previewLook.name}
              setup={editing}
              postcard={sharing}
              nudge={nudge}
              awayNote={awayNote}
              nightChrome={nightChrome}
            />
            {!editing && !view.waitingForThem && (iAmHim || view.youAreHer) && (
              <RoomActionDock view={view} actions={actions} did={did} />
            )}
            {roomProps && !editing && <RoomThings items={roomProps.props} onPoke={roomProps.poke} />}
          </div>
          <div className={s.actionColumn} id="room-actions" tabIndex={-1}>
            {iAmHim && setup && (
              <CatSetupPanel
                cat={cat}
                panelRef={setupPanel}
                onSaved={() => {
                  setDid("saved");
                }}
              />
            )}
            {iAmHim && notes.open && (
              <RoomNotesPanel
                notes={notes}
                view={view}
                panelRef={notesPanel}
                onSaved={() => setDid("saved")}
              />
            )}
            {arrivalCard && arrivalCard.length > 0 && view.them && (
              <ArrivalCard
                name={view.them}
                items={arrivalCard}
                youAreHer={view.youAreHer}
                onClose={() => setArrivalCard(null)}
              />
            )}
            {editing ? null : view.waitingForThem ? (
              <RoomWaiting
                view={view}
                cat={cat}
                setupTrigger={setupTrigger}
                notes={notes}
                notesTrigger={notesTrigger}
                shareResult={shareResult}
                onShare={() => void shareRoom()}
              />
            ) : view.youAreHer ? (
              <CatRoom
                view={actions.pendingMood ? { ...view, catMood: mood } : view}
                actions={actions}
                history={history}
                sayBox={sayBox}
                theirLive={theirLive}
                now={now}
                nightChrome={nightChrome}
                panel={chrome["--panel"]!}
              />
            ) : iAmHim ? (
              <CompanionRoom
                view={view}
                actions={actions}
                history={history}
                cat={cat}
                setupTrigger={setupTrigger}
                notes={notes}
                notesTrigger={notesTrigger}
                theirLive={theirLive}
                now={now}
              />
            ) : (
              <SeatRecovery account={account} />
            )}
            {!editing && (iAmHim || view.youAreHer) && (
              <RoomSettings
                id={id}
                view={view}
                account={account}
                exit={exit}
                ourDay={ourDay}
                shareResult={shareResult}
                onShare={() => void shareRoom()}
                reload={load}
                onError={setErr}
              />
            )}
          </div>
        </div>
        <RoomStatus
          live={view.seat != null ? live : null}
          message={err ?? (iAmHim && !editing ? (notes.error ?? cat.error) : null)}
        />
        <RoomFooter youAreHer={view.youAreHer} catName={view.cat.name} />
        <RoomUpdate
          editing={editing || notes.loading}
          reply={sayBox}
          actions={actions}
          day={ourDay}
          exit={exit}
          account={account}
          postcard={sharing}
        />
      </div>
    </main>
  );
}

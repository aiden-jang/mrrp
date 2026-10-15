import { useCallback, useEffect, useRef, useState } from "react";
import { doHold, lastRoom, markMine, myToken, roomFromPath } from "./api.js";
import s from "./App.module.css";
import { Cat } from "./Cat.js";
import { CatRoom } from "./CatRoom.js";
import { CatSetupPanel } from "./CatSetupPanel.js";
import { CompanionRoom } from "./CompanionRoom.js";
import { foundKeys, noticed } from "./discoveries.js";
import { DOOR_X, HER_SPOT, sceneFor } from "./hours.js";
import { liveOnly } from "./recent.js";
import { RoomAnnotations } from "./RoomAnnotations.js";
import { ArrivalCard, FOUND_ANNOUNCEMENTS, FOUND_AS_HER } from "./RoomArrival.js";
import { RoomHeader } from "./RoomChrome.js";
import { SoundToggle } from "./RoomControls.js";
import { ChromeSync, DocTitle, FaviconSync, VoiceSync } from "./RoomEffects.js";
import { RoomFallback } from "./RoomFallback.js";
import { RoomFooter } from "./RoomFooter.js";
import { Landing } from "./RoomLanding.js";
import { RoomSettings } from "./RoomSettings.js";
import { chromeFor, isNightChrome } from "./roomTheme.js";
import { RoomWaiting } from "./RoomWaiting.js";
import { SeatRecovery } from "./SeatRecovery.js";
import { play } from "./sound.js";
import type { Action } from "./types.js";
import { ACTIONS } from "./types.js";
import { useCatSetup } from "./useCatSetup.js";
import { useDoorway, useStaying } from "./useDoorway.js";
import { useOurDay } from "./useOurDay.js";
import { useRoomActions } from "./useRoomActions.js";
import { useRoomEnding } from "./useRoomEnding.js";
import { useRoomFeedback } from "./useRoomFeedback.js";
import { useRoomHistory } from "./useRoomHistory.js";
import { useRoomSession } from "./useRoomSession.js";
import { ConnectionNotice } from "./ConnectionNotice.js";
import { useRoomSharing } from "./useRoomSharing.js";
import { useSayBox } from "./useSayBox.js";
import { FINISH_LINK, useSeatAccount } from "./useSeatAccount.js";

export function App() {
  const id = roomFromPath();
  if (id) lastRoom.set(id);
  return id ? <RoomPage id={id} /> : <Landing />;
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
  const { captureRoom, imageStatus, handleCaptureReady, saveRoomImage, shareRoom, shareResult } =
    useRoomSharing(view, setErr);
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
  const { nudge, setNudge, shelfAt, setShelfAt, arriving, stage } = useRoomFeedback(view, setup, draft?.name);
  const [did, setDid] = useState<string | null>(null);
  useEffect(() => {
    if (did !== "saved") return;
    const timer = setTimeout(() => setDid(null), 2600);
    return () => clearTimeout(timer);
  }, [did]);
  const actions = useRoomActions({ id, setView, onError: setErr, onDid: setDid, load, setNudge, setShelfAt });
  const { tidy, touchWindowLight, mugFell, petAt, strokes, sharePoke, stroke, act } = actions;
  const wantsLink = view?.you !== undefined && view?.you !== null && !view?.linked;
  useEffect(() => {
    if (!wantsLink || sessionStorage.getItem(FINISH_LINK) !== id) return;
    sessionStorage.removeItem(FINISH_LINK);
    void link(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsLink, id]);

  const history = useRoomHistory(id, view, setView, setErr);
  const account = useSeatAccount(id, load);
  const { link } = account;

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
  const wasSetup = useRef(false);
  useEffect(() => {
    if (setup && !wasSetup.current) setupPanel.current?.focus();
    if (!setup && wasSetup.current) setupTrigger.current?.focus();
    wasSetup.current = setup;
  }, [setup]);

  if (gone || asking || !view || view.youLeft) {
    return (
      <RoomFallback
        id={id}
        view={view}
        asking={asking}
        gone={gone}
        err={err}
        exit={exit}
        onEnter={() => {
          markMine(id);
          setAsking(false);
        }}
      />
    );
  }

  const herSpot = view.personality ? HER_SPOT : null;
  const hourly = sceneFor(
    view.clock,
    Date.now(),
    view.catMood,
    view.bothHereNow,
    herSpot,
    view.sky,
    view.expectAt,
  );

  // Keep the caption aligned with the cat when she waits at the door.
  const scene = view.waitingAtDoor ? { ...hourly, catX: DOOR_X, atDoor: true } : hourly;

  const chrome = chromeFor(scene);
  const roomTheme = chrome as React.CSSProperties;

  const nightChrome = isNightChrome(scene.sun);

  const iAmHim = view.you !== null && !view.youAreHer;

  const theirLive = liveOnly(view.theirRecent, covered.current);

  const previewLook = cat.preview ?? view.cat;

  return (
    <main className={s.page} style={{ ...roomTheme }}>
      <ChromeSync night={nightChrome} />
      <VoiceSync fur={view.cat.fur} monthsOld={view.monthsOld} />
      <DocTitle name={view.cat.name} />
      <FaviconSync cat={view.cat} />
      <div className={s.card}>
        <RoomHeader
          name={view.cat.name}
          presence={
            view.themHereNow
              ? "Both here. Excellent use of time."
              : view.youAreHer
                ? `${view.them ?? "Your person"} isn’t here right now. The room is.`
                : "Just you for now. Make yourself comfortable."
          }
        >
          <SoundToggle />
        </RoomHeader>
        {did === "saved" && (
          <p className={s.saveFeedback} role="status">
            Saved. A very considered look.
          </p>
        )}
        <div ref={stage} className={`${s.stage} ${arriving ? s.stageArrival : ""}`}>
          <Cat
            collectionKey={id}
            label={`${previewLook.name} is ${scene.doing}.`}
            look={previewLook}
            decor={setup && draft ? draft.decor : view.decor}
            clock={setup && draft ? { ...view.clock, tz: draft.tz, homeHour: draft.homeHour } : view.clock}
            mood={view.catMood}
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
              noticed(id, myToken(), key);
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
                .filter((a): a is Action | "leaveout" => a === "leaveout" || ACTIONS.some((x) => x.id === a)),
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
        <RoomAnnotations
          view={view}
          scene={scene}
          name={previewLook.name}
          setup={setup}
          captureAvailable={!!captureRoom}
          imageStatus={imageStatus}
          onSave={() => void saveRoomImage()}
          nudge={nudge}
          awayNote={awayNote}
          nightChrome={nightChrome}
        />
        {iAmHim && setup && (
          <CatSetupPanel
            cat={cat}
            view={view}
            panelRef={setupPanel}
            onSaved={() => {
              setDid("saved");
            }}
          />
        )}
        {iAmHim && !setup && cat.error && (
          <p className={s.errorBar} role="status">
            {cat.error}
          </p>
        )}
        {view.bothHereNow && (
          <div className={s.together}>
            <p className={s.togetherMain}>
              {view.sittingWithYou
                ? `${view.them ?? "He"} is sitting with you.`
                : view.sittingWith
                  ? `You are sitting with ${view.cat.name}.`
                  : view.youAreHer
                    ? `${view.them ?? "He"} is right there. He can reach you.`
                    : `Hold on ${view.cat.name}. She's right there.`}
            </p>
          </div>
        )}
        {arrivalCard && arrivalCard.length > 0 && view.them && (
          <ArrivalCard
            name={view.them}
            items={arrivalCard}
            youAreHer={view.youAreHer}
            onClose={() => setArrivalCard(null)}
          />
        )}
        {view.waitingForThem ? (
          <RoomWaiting
            view={view}
            cat={cat}
            setupTrigger={setupTrigger}
            shareResult={shareResult}
            onShare={() => void shareRoom()}
          />
        ) : view.youAreHer ? (
          <CatRoom
            view={view}
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
            theirLive={theirLive}
            now={now}
            did={did}
          />
        ) : (
          <SeatRecovery account={account} />
        )}
        {/* Keep errors visible while the room or settings scroll beneath them. */}
        {!asking && view.seat != null && <ConnectionNotice live={live} />}
        {err && (
          <p className={s.errorBar} role="status">
            {err}
          </p>
        )}
        {!setup && (iAmHim || view.youAreHer) && (
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
        <RoomFooter youAreHer={view.youAreHer} catName={view.cat.name} />
      </div>
    </main>
  );
}

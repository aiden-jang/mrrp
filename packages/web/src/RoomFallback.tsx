import { useState } from "react";
import { forgetMe, lastCat } from "./api.js";
import s from "./App.module.css";
import { Cat } from "./Cat.js";
import { Invitation, RoomWordmark } from "./RoomChrome.js";
import { ChromeSync, DocTitle, FaviconSync } from "./RoomEffects.js";
import { DOOR_CAT, DOOR_CLOCK, useDoorScene } from "./RoomLanding.js";
import { chromeFor, isNightChrome } from "./roomTheme.js";
import { GoneCard, LeftCard } from "./screens.js";
import type { RoomView } from "./types.js";
import type { useRoomEnding } from "./useRoomEnding.js";

export function InvalidRoomLink() {
  const door = useDoorScene();
  return (
    <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
      <ChromeSync night={isNightChrome(door.sun)} />
      <div className={`${s.card} ${s.doorNotice}`}>
        <RoomWordmark />
        <h1 className={s.h1}>This room link is incomplete.</h1>
        <p className={s.small}>Ask the person who invited you to send the full link again.</p>
        <a className={s.quiet} href="/">
          Back to mrrp
        </a>
      </div>
    </main>
  );
}

export function RoomFallback({
  id,
  view,
  asking,
  gone,
  err,
  exit,
  onEnter,
  onRetry,
}: {
  id: string;
  view: RoomView | null;
  asking: boolean;
  gone: { undoUntil: number | null } | null;
  err: string | null;
  exit: ReturnType<typeof useRoomEnding>;
  onEnter: () => void;
  onRetry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const { undoing } = exit;
  const door = useDoorScene();
  const remembered = lastCat.get(id);
  const knownCat = remembered ?? DOOR_CAT;

  if (gone) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        <GoneCard
          undoUntil={gone.undoUntil}
          undoing={undoing}
          err={err}
          onPutBack={() => void exit.putBackRoom()}
          onHome={() => {
            window.location.href = "/";
          }}
        />
      </main>
    );
  }

  if (asking) {
    return (
      <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
        <ChromeSync night={isNightChrome(door.sun)} />
        <Invitation
          onEnter={() => {
            onEnter();
          }}
        >
          <Cat
            label="A pixel cat in a quiet room, waiting."
            look={DOOR_CAT}
            clock={DOOR_CLOCK}
            mood={null}
            nudge={0}
            reserveBelow={0}
          />
        </Invitation>
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
        <div className={`${s.card} ${s.doorNotice}`}>
          <RoomWordmark />
          <p className={s.small} role={err ? "alert" : "status"}>
            {err ?? "opening the door quietly…"}
          </p>
          {err && (
            <div className={s.doorActions}>
              <button
                type="button"
                className={`${s.btn} ${s.btnGo}`}
                aria-disabled={retrying}
                onClick={async () => {
                  if (retrying) return;
                  setRetrying(true);
                  try {
                    await onRetry();
                  } finally {
                    setRetrying(false);
                  }
                }}
              >
                {retrying ? "Trying again…" : "Try again"}
              </button>
              <a className={s.quiet} href="/">
                Back to mrrp
              </a>
            </div>
          )}
          <div className={s.stage}>
            <Cat
              label={`${knownCat.name} asleep in a sunlit room.`}
              look={knownCat}
              clock={DOOR_CLOCK}
              mood={null}
              nudge={0}
            />
          </div>
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
          onPutBack={() => void exit.putBackMySide()}
          onStartFresh={() => {
            forgetMe(id);
            window.location.reload();
          }}
        />
      </main>
    );
  }

  return null;
}

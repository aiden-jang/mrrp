import { forgetMe, lastCat } from "./api.js";
import s from "./App.module.css";
import { Cat } from "./Cat.js";
import { Invitation } from "./RoomChrome.js";
import { ChromeSync, DocTitle, FaviconSync } from "./RoomEffects.js";
import { DOOR_CAT, DOOR_CLOCK, useDoorScene } from "./RoomLanding.js";
import { chromeFor, isNightChrome } from "./roomTheme.js";
import { GoneCard, LeftCard } from "./screens.js";
import type { RoomView } from "./types.js";
import type { useRoomEnding } from "./useRoomEnding.js";

export function RoomFallback({
  id,
  view,
  asking,
  gone,
  err,
  exit,
  onEnter,
}: {
  id: string;
  view: RoomView | null;
  asking: boolean;
  gone: { undoUntil: number | null } | null;
  err: string | null;
  exit: ReturnType<typeof useRoomEnding>;
  onEnter: () => void;
}) {
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
            reserveBelow={300}
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
          onPutBack={() => void exit.putBackMySide()}
          onStartFresh={() => {
            forgetMe();
            window.location.reload();
          }}
        />
      </main>
    );
  }

  return null;
}

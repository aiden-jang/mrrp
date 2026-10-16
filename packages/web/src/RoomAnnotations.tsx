import s from "./App.module.css";
import { dayApart, type Scene } from "./hours.js";
import { moonLine } from "./moon.js";
import { homingLine, milestoneLine, personalityLine } from "./remembers.js";
import type { RoomView } from "./types.js";
import type { useRoomSharing } from "./useRoomSharing.js";

export function RoomAnnotations({
  view,
  scene,
  name,
  setup,
  captureAvailable,
  imageStatus,
  onSave,
  nudge,
  awayNote,
  nightChrome,
}: {
  view: RoomView;
  scene: Scene;
  name: string;
  setup: boolean;
  captureAvailable: boolean;
  imageStatus: ReturnType<typeof useRoomSharing>["imageStatus"];
  onSave: () => void;
  nudge: number;
  awayNote: string | null;
  nightChrome: boolean;
}) {
  const iAmHim = view.you !== null && !view.youAreHer;
  const herDay = iAmHim ? dayApart(view.clock) : null;
  const moon = nightChrome ? moonLine(new Date(), view.cat.name, view.youAreHer) : null;
  return (
    <>
      <p className={s.doing}>
        {setup
          ? "A few small adjustments."
          : view.waitingAtDoor
            ? view.youAreHer
              ? "You are by the door, waiting for him."
              : `${name} is by the door, waiting for you.`
            : view.settled
              ? view.youAreHer
                ? "You are settled against him, not moving for anybody."
                : `${name} has settled against you.`
              : view.sittingWith || view.sittingWithYou
                ? view.youAreHer
                  ? "You are curled up while he sits with you."
                  : `${name} is curled up beside you.`
                : view.youAreHer
                  ? `You are ${scene.doingHers ?? scene.doing}.`
                  : `${name} is ${scene.doing}.`}
      </p>
      <span id="room-actions" tabIndex={-1} />
      {captureAvailable && !setup && (
        <button className={s.quiet} onClick={onSave} disabled={imageStatus !== null}>
          {imageStatus === "saving"
            ? "Making postcard…"
            : imageStatus === "shared"
              ? "Postcard shared"
              : imageStatus === "saved"
                ? "Download started"
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
        <p className={s.hint}>{iAmHim ? `Hold on ${view.cat.name} to pet her` : "Tell him how you are"}</p>
      )}
    </>
  );
}

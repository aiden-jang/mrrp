import { useRef } from "react";
import { HIDE_SPOTS, type RoomView } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";
import s from "./App.module.css";
import d from "./RoomActionDock.module.css";

export function HideSeekControls({
  view,
  actions,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
}) {
  const game = view.hideSeek;
  // Keep the native disclosure open through live updates and the end of a round.
  const initiallyOpen = useRef(!!game || !view.youAreHer);
  if (!view.youAreHer && !game) return null;
  const hidden = game?.phase === "hiding";
  const place = HIDE_SPOTS.find((spot) => spot.id === game?.spot)?.place;
  const last = HIDE_SPOTS.find((spot) => spot.id === game?.checked.at(-1));
  const busy = actions.hideSeekPending;
  const blocked =
    busy || view.heldByThem || !!actions.affection || !!actions.reaction || actions.affectionPending;
  const controls = (
    <>
      <p className={s.hint} role="status">
        {game?.phase === "found"
          ? `Found ${place}! There you are.`
          : hidden
            ? view.youAreHer
              ? `You’re hiding ${place}. He can look for you.`
              : last
                ? `Not ${last.place}. Try another place.`
                : `${view.cat.name} is hiding. Where could she be?`
            : blocked
              ? "You can hide once you’re done with pets or reacting."
              : "Pick a hiding spot. He’ll have to find you."}
      </p>
      <div role="group" aria-label={view.youAreHer ? "Choose a hiding spot" : "Look for her"}>
        {HIDE_SPOTS.map((spot) => {
          const checked = !!game?.checked.includes(spot.id);
          const disabled = blocked || (view.youAreHer ? hidden : checked || !hidden);
          return (
            <button
              key={spot.id}
              type="button"
              className={s.btn}
              aria-disabled={!!disabled}
              aria-pressed={view.youAreHer ? game?.spot === spot.id : checked}
              onClick={() => {
                if (!disabled) void actions.seek(view.youAreHer ? "hide" : "search", spot.id);
              }}
            >
              {view.youAreHer ? "Hide " : "Look "}
              {spot.place}
              {!view.youAreHer && checked ? " · checked" : ""}
            </button>
          );
        })}
        {game && (
          <button
            type="button"
            className={s.btn}
            aria-disabled={busy}
            onClick={() => {
              if (!busy) void actions.seek("end");
            }}
          >
            {view.youAreHer && hidden ? "Come out" : "End hide-and-seek"}
          </button>
        )}
      </div>
      {busy && (
        <p className={s.hint} role="status">
          Sharing…
        </p>
      )}
      {actions.hideSeekError && (
        <p className={d.seekError} role="alert">
          {actions.hideSeekError}
        </p>
      )}
    </>
  );
  return (
    <details className={d.reactions} open={initiallyOpen.current}>
      <summary>Hide-and-seek</summary>
      {controls}
    </details>
  );
}

import s from "./App.module.css";
import d from "./RoomActionDock.module.css";
import { CAT_REACTIONS, type RoomView } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";

export function CatReactionControls({
  view,
  actions,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
}) {
  const current = CAT_REACTIONS.find((reaction) => reaction.id === actions.reaction?.kind);
  if (!view.youAreHer)
    return current ? (
      <p className={s.hint} role="status">
        {view.cat.name} {current.theirs}
      </p>
    ) : null;
  const disabled = actions.affectionPending || !!current || view.heldByThem;
  return (
    <details className={d.reactions}>
      <summary>React</summary>
      <div role="group" aria-label="React as the cat">
        {CAT_REACTIONS.map((reaction) => (
          <button
            key={reaction.id}
            type="button"
            className={s.btn}
            aria-disabled={disabled}
            aria-pressed={current?.id === reaction.id}
            onClick={() => {
              if (!disabled) void actions.catGesture(reaction.id);
            }}
          >
            {actions.reactionPending === reaction.id ? "Sharing…" : reaction.label}
          </button>
        ))}
      </div>
      {(current || view.heldByThem) && (
        <p className={s.hint} role="status">
          {current?.mine ?? "You can react once he lets go."}
        </p>
      )}
    </details>
  );
}

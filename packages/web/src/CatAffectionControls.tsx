import s from "./App.module.css";
import d from "./RoomActionDock.module.css";
import type { RoomView } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";

export function CatAffectionControls({
  view,
  actions,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
}) {
  const asking = actions.affection?.kind === "ask";
  const nuzzling = actions.affection?.kind === "nuzzle";
  if (!view.youAreHer)
    return actions.affection ? (
      <p className={s.hint} role="status">
        {view.cat.name}
        {asking ? " is asking for pets." : " nuzzles into your hand."}
      </p>
    ) : null;
  return (
    <div className={d.affection}>
      <button
        type="button"
        className={s.btn}
        aria-pressed={asking ? true : undefined}
        disabled={actions.affectionPending || nuzzling || (!asking && !view.heldByThem && !view.bothHereNow)}
        onClick={() =>
          void actions.catAffection(asking ? "cancel-pets" : view.heldByThem ? "nuzzle" : "ask-pets")
        }
      >
        {actions.affectionPending
          ? "Sharing…"
          : asking
            ? "Never mind"
            : nuzzling
              ? "Nuzzling"
              : view.heldByThem
                ? "Nuzzle"
                : "Ask for pets"}
      </button>
      <p className={s.hint} role="status">
        {asking
          ? "Paw up. He can pet you."
          : nuzzling
            ? "You lean into his hand."
            : view.heldByThem
              ? "He’s petting you."
              : !view.bothHereNow
                ? "You can ask when you’re both here."
                : "A little attention?"}
      </p>
    </div>
  );
}

import s from "./App.module.css";
import { GIFTS, type RoomView } from "./types.js";

export function GiftExchange({
  view,
  pending,
  onKeep,
  error = null,
}: {
  view: RoomView;
  pending: boolean;
  onKeep: (id: string) => Promise<void>;
  error?: string | null;
}) {
  const gift = GIFTS.find((g) => g.id === view.gift);
  const kept = GIFTS.find((g) => g.id === view.keptGift?.gift);
  if (view.youAreHer)
    return kept && !gift ? (
      <p className={s.small} role="status">
        {view.them ?? "He"} kept your {kept.name}.
      </p>
    ) : null;
  if (!gift && !kept)
    return error ? (
      <p className={s.fieldError} role="alert">
        {error}
      </p>
    ) : null;
  const disabled = pending || !gift || !view.giftId;
  return (
    <section className={s.actionSection} aria-label="Something she left you">
      <p className={s.small} role="status">
        {gift ? `${view.them ?? view.cat.name} left you ${gift.label}.` : `You kept her ${kept!.name}.`}
      </p>
      <button
        className={s.btn}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) void onKeep(view.giftId!);
        }}
      >
        {pending ? "Keeping…" : gift ? `Keep the ${gift.name}` : "Kept"}
      </button>
      {error && (
        <p className={s.fieldError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

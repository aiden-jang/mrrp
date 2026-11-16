import { useEffect, useId, useRef } from "react";
import { roomFromPath } from "./api.js";
import { useKeepsakes } from "./useKeepsakes.js";
import { GIFTS, type Gift, type RoomView } from "./types.js";
import { GIFT_LEAF, GIFT_CAP, GIFT_MOTH } from "./sprites.js";
import s from "./App.module.css";
import k from "./KeptGifts.module.css";

function GiftMark({ gift }: { gift: Gift }) {
  const sprite = gift === "leaf" ? GIFT_LEAF : gift === "cap" ? GIFT_CAP : GIFT_MOTH;
  const palette: Record<string, string> = {
    w: "#4a3520",
    g: "#7d9e63",
    r: "#5d7a46",
    m: "#b9b3a4",
    n: "#cbbfa6",
  };
  return (
    <svg
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      aria-hidden="true"
      className={k.mark}
      shapeRendering="crispEdges"
    >
      {sprite.rows.flatMap((row, y) =>
        [...row].flatMap((cell, x) =>
          cell === "."
            ? []
            : [<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={palette[cell]} />],
        ),
      )}
    </svg>
  );
}

export function KeptGifts({ view }: { view: RoomView }) {
  const saved = useKeepsakes(roomFromPath(), view.keptGift?.at);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const panelId = useId();
  useEffect(() => {
    if (saved.open) panel.current?.focus();
    else if (wasOpen.current) trigger.current?.focus();
    wasOpen.current = saved.open;
  }, [saved.open]);
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: view.clock.tz });
  return (
    <>
      <button
        ref={trigger}
        className={s.quiet}
        aria-expanded={saved.open}
        aria-controls={panelId}
        onClick={saved.show}
      >
        Kept gifts
      </button>
      {saved.open && (
        <section
          ref={panel}
          id={panelId}
          className={k.panel}
          role="region"
          aria-label="Kept gifts"
          tabIndex={-1}
        >
          <div className={k.heading}>
            <h2>Kept gifts</h2>
            <button className={s.btn} onClick={saved.close} aria-label="Close kept gifts">
              Close
            </button>
          </div>
          {saved.loading && (
            <p className={s.small} role="status">
              Opening kept gifts…
            </p>
          )}
          {saved.error && (
            <div>
              <p className={s.fieldError} role="alert">
                {saved.error}
              </p>
              <button className={s.btn} onClick={saved.retry}>
                Try again
              </button>
            </div>
          )}
          {saved.page && (
            <>
              {saved.page.items.length ? (
                <ol className={k.list}>
                  {saved.page.items.map((item) => (
                    <li key={item.id}>
                      <GiftMark gift={item.gift} />
                      <div>
                        <h3>{GIFTS.find((g) => g.id === item.gift)?.name}</h3>
                        {item.text && <p className={k.words}>{item.text}</p>}
                        <time className={k.date} dateTime={new Date(item.at).toISOString()}>
                          Kept {date.format(item.at)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={s.small}>
                  {view.youAreHer
                    ? "Gifts he keeps will be here."
                    : "Gifts will be here after you keep them."}
                </p>
              )}
              {saved.page.items.length > 0 && (
                <button
                  className={s.btn}
                  aria-disabled={saved.loading || !saved.page.next}
                  onClick={saved.earlier}
                >
                  {saved.page.next ? "Earlier gifts" : "No earlier gifts"}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

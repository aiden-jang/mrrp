import s from "./App.module.css";

// Check before rendering a room: an ephemeral seat would be lost on its next navigation.
export function seatStorageAvailable(): boolean {
  try {
    const key = `mrrp:storage-check:${crypto.randomUUID()}`;
    localStorage.getItem("mrrp:me");
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function StorageUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={s.page}>
      <section className={s.card}>
        <p className={s.roomKicker}>mrrp / a room for two</p>
        <h1 className={s.h1}>This browser can’t keep your seat yet.</h1>
        <p className={s.lede} role="alert">
          Browser storage is unavailable. Allow site storage or try another browser, then try again. Your room
          needs it to remember which seat is yours.
        </p>
        <button className={`${s.btn} ${s.btnGo}`} onClick={onRetry}>
          Try again
        </button>
      </section>
    </main>
  );
}

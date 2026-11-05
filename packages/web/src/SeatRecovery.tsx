import s from "./App.module.css";
import type { SeatAccount } from "./useSeatAccount.js";

export function SeatRecovery({ account }: { account: SeatAccount }) {
  const { code: claimCode, setCode: setClaimCode, claiming, claimError: claimErr } = account;
  return (
    <>
      <h2 className={s.newsMain}>Both seats are taken.</h2>
      <p className={s.small}>This room belongs to two people. You can watch the cat.</p>
      <p className={s.small} style={{ marginTop: 10 }}>
        If you have been in here before, your recovery code will get you back in. If a seat is being held by a
        browser that is not yours, ask whoever sent you the link to free it.
      </p>
      <form
        className={s.panel}
        style={{ marginTop: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!claiming && claimCode.trim().length >= 8) void account.claim();
        }}
      >
        <h3 className={s.panelTitle}>Is one of these seats yours?</h3>
        <p className={s.small} style={{ marginBottom: 9 }}>
          Either of you can come back on a new phone. Put your recovery code in and the room works out which
          seat is yours.
        </p>
        <input
          className={s.input}
          aria-label="Recovery code"
          name="recovery-code"
          autoComplete="off"
          aria-invalid={!!claimErr}
          value={claimCode}
          placeholder="xxxx-xxxx-xxxx"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setClaimCode(e.target.value)}
        />
        {claimErr && (
          <p role="alert" className={s.small} style={{ color: "var(--error)", marginTop: 8 }}>
            {claimErr}
          </p>
        )}
        <button
          className={`${s.btn} ${s.btnGo}`}
          style={{ width: "100%", marginTop: 10 }}
          disabled={claiming || claimCode.trim().length < 8}
          type="submit"
        >
          {claiming ? "Checking…" : "This is my room"}
        </button>
      </form>
    </>
  );
}

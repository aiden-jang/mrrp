import s from "./App.module.css";
import { useId } from "react";
import type { SeatAccount } from "./useSeatAccount.js";

export function SeatRecovery({ account }: { account: SeatAccount }) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const { code: claimCode, setCode: setClaimCode, claiming, claimError: claimErr } = account;
  return (
    <>
      <h2 className={s.newsMain}>Both seats are taken.</h2>
      <p className={s.small}>This room belongs to two people. You can watch the cat.</p>
      <p className={s.small} style={{ marginTop: 10 }}>
        If you have been here before, use your recovery code below. Without a code, ask whoever sent you the
        link to free your seat.
      </p>
      <form
        aria-label="Recover your seat"
        className={s.panel}
        style={{ marginTop: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!claiming && claimCode.trim().length >= 8) void account.claim();
        }}
      >
        <h3 className={s.panelTitle}>Is one of these seats yours?</h3>
        <p className={s.small} style={{ marginBottom: 9 }}>
          Your code brings back your seat, even on a new phone.
        </p>
        <label className={s.fieldLabel} htmlFor={fieldId}>
          Recovery code
        </label>
        <input
          id={fieldId}
          className={s.input}
          aria-label="Recovery code"
          name="recovery-code"
          autoComplete="off"
          aria-invalid={!!claimErr}
          aria-describedby={claimErr ? errorId : undefined}
          value={claimCode}
          placeholder="xxxx-xxxx-xxxx"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setClaimCode(e.target.value)}
        />
        {claimErr && (
          <p id={errorId} role="alert" className={`${s.small} ${s.fieldError}`}>
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

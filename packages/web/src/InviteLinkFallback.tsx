import s from "./App.module.css";

export function InviteLinkFallback() {
  return (
    <div className={s.panel} style={{ marginTop: 10 }}>
      <p className={s.small} role="alert">
        Couldn’t share or copy. Select the link below, or try sharing again.
      </p>
      <textarea
        className={s.input}
        aria-label="Room link to copy"
        value={location.href}
        readOnly
        rows={2}
        onFocus={(event) => event.currentTarget.select()}
        style={{ marginTop: 8, resize: "vertical" }}
      />
    </div>
  );
}

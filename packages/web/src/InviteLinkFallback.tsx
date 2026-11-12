import s from "./App.module.css";
import { useId } from "react";

export function InviteLinkFallback() {
  const messageId = useId();
  return (
    <div className={s.recovery}>
      <p id={messageId} className={s.small} role="alert">
        Couldn’t share or copy. Select the link below, or try sharing again.
      </p>
      <textarea
        className={s.input}
        aria-label="Room link to copy"
        aria-describedby={messageId}
        value={location.href}
        readOnly
        rows={2}
        onFocus={(event) => event.currentTarget.select()}
        style={{ marginTop: 8, resize: "vertical" }}
      />
    </div>
  );
}

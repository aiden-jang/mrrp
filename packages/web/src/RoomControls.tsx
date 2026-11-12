import { useEffect, useId, useRef, useState } from "react";
import s from "./App.module.css";
import { copyText } from "./clipboard.js";
import { isMuted, toggleMuted } from "./sound.js";

export function SoundToggle() {
  const [off, setOff] = useState(isMuted);
  return (
    <button
      type="button"
      onClick={() => setOff(toggleMuted())}
      aria-pressed={off}
      aria-label={off ? "Turn sound on" : "Turn sound off"}
      className={s.soundToggle}
    >
      <SpeakerMark off={off} />
    </button>
  );
}

function SpeakerMark({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden
      focusable="false"
      style={{ display: "block" }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6.2h2.3L8.4 3.6v8.8L5.3 9.8H3z" fill="currentColor" stroke="currentColor" />
        {off ? (
          <path d="M11 6.2l3.2 3.6M14.2 6.2L11 9.8" />
        ) : (
          <>
            <path d="M10.8 6.1a2.6 2.6 0 0 1 0 3.8" />
            <path d="M12.7 4.4a5 5 0 0 1 0 7.2" />
          </>
        )}
      </g>
    </svg>
  );
}

export function RecoveryCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const codeField = useRef<HTMLInputElement>(null);
  const copyError = useRef<HTMLParagraphElement>(null);
  const copyErrorId = useId();
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    setFailed(false);
    if (await copyText(code)) {
      setCopied(true);
    } else {
      setFailed(true);
      codeField.current?.focus();
      codeField.current?.select();
      requestAnimationFrame(() => copyError.current?.scrollIntoView({ block: "nearest" }));
    }
  };
  return (
    <>
      <div className={s.codeRow}>
        <input
          ref={codeField}
          className={s.code}
          aria-label="Your recovery code"
          aria-describedby={failed ? copyErrorId : undefined}
          readOnly
          value={code}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className={`${s.btn} ${s.copyButton}`}
          onClick={() => void copy()}
          aria-label={copied ? "Recovery code copied" : "Copy the recovery code"}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {failed && (
        <p ref={copyError} id={copyErrorId} className={`${s.small} ${s.fieldError}`} role="alert">
          Couldn’t copy automatically. Your code is selected above; use your browser’s Copy command, or try
          again.
        </p>
      )}
    </>
  );
}

export function Select({
  id,
  value,
  onChange,
  children,
}: {
  id?: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <span className={s.selectWrap}>
      <select id={id} className={s.select} value={value} onChange={onChange}>
        {children}
      </select>
      <svg className={s.selectCaret} viewBox="0 0 10 6" aria-hidden focusable="false">
        <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

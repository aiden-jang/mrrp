import { Fragment, type ReactNode } from "react";
import { siteFooterLinks } from "@aidenjang/auth-client";
import { AUTH_URL } from "./config.js";
import { PawMark } from "./screens.js";
import s from "./App.module.css";
import w from "./Welcome.module.css";

export function Welcome({
  name,
  onName,
  onMake,
  back,
  children,
}: {
  name: string;
  onName: (name: string) => void;
  onMake: () => void;
  back: string | null;
  children: ReactNode;
}) {
  return (
    <div className={w.welcome}>
      <header className={w.header}>
        <span className={w.wordmark}>
          <PawMark />
          mrrp
        </span>
        <span className={w.badge}>a room for two</span>
      </header>
      <div className={w.layout}>
        <section className={w.copy}>
          <p className={w.eyebrow}>A little closer. Even from here.</p>
          <h1 className={w.title}>
            A little room.
            <br />
            For your person.
          </h1>
          <p className={w.intro}>
            Make a room and send the link to one person. They become the cat. You get to look after her.
          </p>
          <p className={w.aside}>Some days need fewer words. And more naps.</p>
        </section>
        <section className={w.preview} aria-label="Room preview">
          <div className={w.previewTop}>
            <span>THE ROOM</span>
            <span aria-hidden>✦</span>
          </div>
          <div className={w.scene}>{children}</div>
          <p className={w.caption}>A place to do very little. Together.</p>
        </section>
        <section className={w.start} aria-label="Make your room">
          {back && (
            <>
              <button className={`${s.btn} ${s.btnGo}`} onClick={() => location.assign(`/r/${back}`)}>
                Back to the room
              </button>
              <p className={s.small}>Or make another room for somebody else.</p>
            </>
          )}
          <label className={w.label} htmlFor="welcome-name">
            Your name
          </label>
          <input
            id="welcome-name"
            className={s.input}
            value={name}
            maxLength={24}
            placeholder="your name"
            autoComplete="given-name"
            onChange={(event) => onName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onMake()}
          />
          <button className={`${s.btn} ${back ? "" : s.btnGo}`} onClick={onMake} disabled={!name.trim()}>
            Make a room <span aria-hidden>↗</span>
          </button>
          <p className={w.fine}>No account needed. Send the link to one person.</p>
        </section>
      </div>
      <ol className={w.steps} aria-label="How Mrrp works">
        <li>
          <span>01</span>
          <div>
            Make a room.<small>You set the scene.</small>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            Invite your person.<small>They tap how they feel.</small>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            Just be here.<small>A note. A little company. A nap.</small>
          </div>
        </li>
      </ol>
      <footer className={w.footer}>
        <span>No notifications. Nothing to keep up with.</span>
        <p className={s.credit}>
          {siteFooterLinks(AUTH_URL).map((item, index) => (
            <Fragment key={item.href}>
              {index > 0 && " · "}
              <a
                href={item.href}
                className={s.creditLink}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </a>
            </Fragment>
          ))}
        </p>
      </footer>
    </div>
  );
}

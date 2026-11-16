import { Fragment, type ReactNode } from "react";
import { siteFooterLinks } from "@aidenjang/auth-client";
import { AUTH_URL } from "./config.js";
import { RoomWordmark } from "./RoomChrome.js";
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
      <RoomWordmark />
      <div className={w.layout}>
        <section className={w.copy}>
          <h1 className={w.title}>
            A room for two.
            <br />
            One of you is the cat.
          </h1>
          <p className={w.intro}>
            Make a room for someone you like. Send them the link. They’re the cat; you keep them company.
          </p>
        </section>
        <form
          className={w.start}
          aria-label="Make your room"
          onSubmit={(event) => {
            event.preventDefault();
            onMake();
          }}
        >
          {back && (
            <>
              <button
                type="button"
                className={`${s.btn} ${s.btnGo}`}
                onClick={() => location.assign(`/r/${back}`)}
              >
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
            name="name"
            className={s.input}
            value={name}
            maxLength={24}
            placeholder="your name"
            autoComplete="given-name"
            onChange={(event) => onName(event.target.value)}
          />
          <button type="submit" className={`${s.btn} ${back ? "" : s.btnGo}`} disabled={!name.trim()}>
            Make a room
          </button>
          <p className={w.fine}>No account needed. Send the link to one person.</p>
        </form>
        <figure className={w.preview} aria-label="Room preview">
          <div className={w.scene}>{children}</div>
          <figcaption className={w.caption}>Very little to do. Good company for it.</figcaption>
        </figure>
      </div>
      <ol className={w.steps} aria-label="How Mrrp works">
        <li>
          <div>
            Make a room.<small>You handle the furnishings.</small>
          </div>
        </li>
        <li>
          <div>
            Invite your person.<small>They get to be the cat.</small>
          </div>
        </li>
        <li>
          <div>
            Settle in.<small>A note. Some company. Probably a nap.</small>
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

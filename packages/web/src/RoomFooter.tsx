import { Fragment } from "react";
import { siteFooterLinks } from "@aidenjang/auth-client";
import { AUTH_URL } from "./config.js";
import s from "./App.module.css";

export function RoomFooter({ youAreHer, catName }: { youAreHer: boolean; catName: string }) {
  return (
    <footer className={s.footer}>
      <details className={s.roomGuide}>
        <summary>How this room works</summary>
        <p>
          One of you is the cat. The other writes notes and leaves little things. The cat chooses how she
          feels and what to do about it. Both of you can draw for the frame.
        </p>
        <p>
          {youAreHer ? "Your mood is yours. No explanation required." : `Hold on ${catName} to pet her.`} The
          labeled room details work with a keyboard too. Nothing needs daily attendance. The cat has declined
          a schedule.
        </p>
      </details>
      <nav className={s.credit} aria-label="Help and information">
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
        {" · "}
        <a className={s.creditLink} href="mailto:me@aidenjang.com">
          Help / feedback
        </a>
      </nav>
    </footer>
  );
}

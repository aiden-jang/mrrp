import { useState } from "react";
import { loginUrl } from "@aidenjang/auth-client";
import { doLink, doRecover } from "./api.js";

/* What the worker says when the seat is not signed in, which is the one failure that is not an
   error: it means finish signing in and come back. */
const SIGNED_OUT = "Sign in first.";
import { AUTH_URL } from "./config.js";

/** Survives the round trip to the auth service, which is a full page load away and back. */
export const FINISH_LINK = "mrrp:finish-link";

/*
 * The two things a seat can do with an account: tie itself to one, or be taken back by one using a
 * recovery code. Both are a round trip that can fail and has to say so, which is five pieces of
 * state that belong together and nothing else in the room needs.
 *
 * Signing in is a full-page redirect, so `link` remembers the room first: coming back from the auth
 * service is a fresh page load with no memory of what it was in the middle of.
 */
export interface SeatAccount {
  linking: boolean;
  linkError: string | null;
  link: (on: boolean) => Promise<void>;

  code: string;
  setCode: (value: string) => void;
  claiming: boolean;
  claimError: string | null;
  claim: () => Promise<void>;
}

export function useSeatAccount(id: string, reload: () => Promise<void>): SeatAccount {
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  return {
    linking,
    linkError,
    link: async (on) => {
      setLinking(true);
      setLinkError(null);
      try {
        await doLink(id, on);
        await reload();
      } catch (e) {
        if (on && e instanceof Error && e.message === SIGNED_OUT) {
          sessionStorage.setItem(FINISH_LINK, id);
          window.location.href = loginUrl(AUTH_URL, window.location.href);
          return;
        }
        setLinkError(e instanceof Error ? e.message : "Couldn't do that.");
      } finally {
        setLinking(false);
      }
    },

    code,
    setCode,
    claiming,
    claimError,
    claim: async () => {
      setClaiming(true);
      setClaimError(null);
      try {
        await doRecover(id, code);
        await reload();
      } catch (e) {
        setClaimError(e instanceof Error ? e.message : "That didn't work.");
      }
      setClaiming(false);
    },
  };
}

import { useCallback, useEffect, useState } from "react";
import { loginUrl } from "@aidenjang/auth-client";
import { doLink, doRecover } from "./api.js";

/* The one failure that is not an error: it means finish signing in and come back. */
const SIGNED_OUT = "Sign in first.";
import { AUTH_URL } from "./config.js";

/** Survives the round trip to the auth service, which is a full page load away and back. */
const FINISH_LINK = "mrrp:finish-link";

/*
 * Tying a seat to an account, or taking it back with a recovery code.
 *
 * `link` stores the room before redirecting. Signing in is a full page load away, so nothing in
 * memory survives to tell the app where to come back to.
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

export function useSeatAccount(id: string, reload: () => Promise<void>, wantsLink = false): SeatAccount {
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const link = useCallback(
    async (on: boolean) => {
      setLinking(true);
      setLinkError(null);
      try {
        await doLink(id, on);
        await reload();
      } catch (e) {
        if (on && e instanceof Error && e.message === SIGNED_OUT) {
          try {
            sessionStorage.setItem(FINISH_LINK, id);
          } catch {
            setLinkError("Browser storage is unavailable. Allow site storage before linking your seat.");
            return;
          }
          window.location.href = loginUrl(AUTH_URL, window.location.href);
          return;
        }
        setLinkError(e instanceof Error ? e.message : "Couldn't do that.");
      } finally {
        setLinking(false);
      }
    },
    [id, reload],
  );

  useEffect(() => {
    if (!wantsLink) return;
    try {
      if (sessionStorage.getItem(FINISH_LINK) !== id) return;
      sessionStorage.removeItem(FINISH_LINK);
    } catch {
      return;
    }
    void link(true);
  }, [wantsLink, id, link]);

  return {
    linking,
    linkError,
    link,

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

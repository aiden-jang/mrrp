import { useEffect, useRef } from "react";
import { faviconFor } from "./favicon.js";
import { LOOKS } from "./looks.js";
import { setVoice } from "./sound.js";
import type { Cat as CatLook } from "./types.js";

export function FaviconSync({ cat }: { cat: CatLook }) {
  const { fur, furDk, belly, eyes, tabby } = cat;
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const drawn = faviconFor({ fur, furDk, belly, eyes, tabby });
    if (!drawn) return;
    const shipped = { href: link.href, type: link.type };
    link.type = "image/svg+xml";
    link.href = drawn;
    return () => {
      link.type = shipped.type;
      link.href = shipped.href;
    };
  }, [fur, furDk, belly, eyes, tabby]);
  return null;
}

export function DocTitle({ name, replyAt = null }: { name: string; replyAt?: number | null }) {
  const latest = useRef<number | undefined>(undefined);
  const unread = useRef(false);
  useEffect(() => {
    if (latest.current !== undefined && replyAt !== null && replyAt > latest.current && document.hidden) {
      unread.current = true;
    }
    latest.current = Math.max(latest.current ?? 0, replyAt ?? 0);
    const sync = () => {
      if (!document.hidden) unread.current = false;
      document.title = `${unread.current ? "• " : ""}${name} \u00b7 mrrp`;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      document.title = "mrrp";
    };
  }, [name, replyAt]);
  return null;
}

export function VoiceSync({ fur, monthsOld }: { fur: string; monthsOld: number }) {
  const coat = LOOKS.find((l) => l.cat.fur.toLowerCase() === fur.toLowerCase())?.voice ?? 1;
  const settled = Math.min(1, Math.max(0, monthsOld) / 12);
  const voice = Math.round(coat * (1 - settled * 0.04) * 100) / 100;
  useEffect(() => {
    setVoice({ pitch: voice });
  }, [voice]);
  return null;
}

export function ChromeSync({ night }: { night: boolean }) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    document.documentElement.style.colorScheme = night ? "dark" : "light";
    meta?.setAttribute("content", night ? "#211e1a" : "#f7ecdc");
    return () => {
      document.documentElement.style.colorScheme = "";
      meta?.setAttribute("content", "#f7ecdc");
    };
  }, [night]);
  return null;
}

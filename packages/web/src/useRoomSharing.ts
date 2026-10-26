import { reportAnalytics } from "../../../analytics/browser.js";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { copyText } from "./clipboard.js";
import { HER_SPOT, sceneFor } from "./hours.js";
import { makeKeepsake } from "./keepsake.js";
import { isNightChrome } from "./roomTheme.js";
import type { RoomView } from "./types.js";

export function useRoomSharing(view: RoomView | null, onError: (message: string) => void) {
  const [captureRoom, setCaptureRoom] = useState<(() => Promise<Blob | null>) | null>(null);
  const [imageStatus, setImageStatus] = useState<"saving" | "sharing" | "shared" | "saved" | null>(null);
  const [postcard, setPostcard] = useState<File | null>(null);
  const imageBusy = useRef(false);
  const linkBusy = useRef(false);
  const lifetime = useRef(0);
  const handleCaptureReady = useCallback((capture: () => Promise<Blob | null>) => {
    setCaptureRoom(() => capture);
  }, []);
  const [shareResult, setShareResult] = useState<"sharing" | "copied" | "shared" | "failed" | null>(null);
  const objectUrls = useRef(new Set<string>());
  useLayoutEffect(() => {
    const urls = objectUrls.current;
    lifetime.current += 1;
    return () => {
      lifetime.current += 1;
      imageBusy.current = false;
      linkBusy.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  useEffect(() => {
    if (!imageStatus || imageStatus === "saving" || imageStatus === "sharing") return;
    const timer = setTimeout(() => {
      setImageStatus(null);
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    }, 2200);
    return () => clearTimeout(timer);
  }, [imageStatus]);
  useEffect(() => {
    if (!shareResult || shareResult === "failed" || shareResult === "sharing") return;
    const timer = setTimeout(() => setShareResult(null), 2200);
    return () => clearTimeout(timer);
  }, [shareResult]);
  const saveRoomImage = async (): Promise<void> => {
    if (!captureRoom || imageBusy.current) return;
    imageBusy.current = true;
    const request = lifetime.current;
    const current = () => request === lifetime.current;
    setImageStatus("saving");
    try {
      const roomBlob = await captureRoom();
      if (!current()) return;
      if (!roomBlob) throw new Error("capture unavailable");
      const currentScene = view
        ? sceneFor(
            view.clock,
            Date.now(),
            view.catMood,
            view.bothHereNow,
            view.personality ? HER_SPOT : null,
            view.sky,
            view.expectAt,
          )
        : null;
      const blob = await makeKeepsake(roomBlob, {
        catName: view?.cat.name ?? "the cat",
        doing: currentScene?.doing ?? "keeping the room warm",
        youAreHer: view?.youAreHer ?? false,
        together: view?.bothHereNow ?? false,
        night: currentScene ? isNightChrome(currentScene.sun) : false,
        day: view?.note?.day ?? view?.noteDay ?? undefined,
      });
      if (!current()) return;
      if (!blob) throw new Error("postcard unavailable");
      const slug =
        view?.cat.name
          ?.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "mrrp";
      const fileName = `${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      setPostcard(file);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      objectUrls.current.add(href);
      reportAnalytics({ name: "room_image_saved" });
      setImageStatus("saved");
    } catch {
      if (!current()) return;
      setImageStatus(null);
      onError("Couldn’t make the postcard. Try again.");
    } finally {
      if (current()) imageBusy.current = false;
    }
  };

  let canSharePostcard = false;
  try {
    canSharePostcard =
      !!postcard && typeof navigator.share === "function" && !!navigator.canShare?.({ files: [postcard] });
  } catch {
    // Some browsers expose file sharing but refuse it under their permissions policy.
  }
  const sharePostcard = async () => {
    if (!postcard || !canSharePostcard || imageBusy.current) return;
    imageBusy.current = true;
    const request = lifetime.current;
    setImageStatus("sharing");
    try {
      // The file is ready before this click, so native sharing keeps its user activation.
      await navigator.share({ title: `${view?.cat.name ?? "mrrp"}'s room`, files: [postcard] });
      if (request === lifetime.current) setImageStatus("shared");
    } catch (error) {
      if (request !== lifetime.current) return;
      setImageStatus(null);
      if (!(error && typeof error === "object" && "name" in error && error.name === "AbortError"))
        onError("Couldn’t share the postcard. You can still save a copy.");
    } finally {
      if (request === lifetime.current) imageBusy.current = false;
    }
  };

  const shareRoom = async () => {
    if (linkBusy.current) return;
    linkBusy.current = true;
    const request = lifetime.current;
    const current = () => request === lifetime.current;
    setShareResult("sharing");
    const resetResult = (result: "copied" | "shared") => {
      if (!current()) return;
      reportAnalytics({ name: "room_link_shared" });
      setShareResult(result);
    };
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: "mrrp",
            text: "I made a room for us. You’re the cat.",
            url: location.href,
          });
          resetResult("shared");
          return;
        } catch (e) {
          if (!current()) return;
          if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
            setShareResult(null);
            return;
          }
        }
      }
      if (!current()) return;
      if (await copyText(location.href)) resetResult("copied");
      else if (current()) setShareResult("failed");
    } finally {
      if (current()) linkBusy.current = false;
    }
  };

  return {
    captureRoom,
    imageStatus,
    handleCaptureReady,
    saveRoomImage,
    shareRoom,
    shareResult,
    canSharePostcard,
    sharePostcard,
  };
}

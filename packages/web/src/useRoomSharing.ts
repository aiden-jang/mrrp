import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "./clipboard.js";
import { HER_SPOT, sceneFor } from "./hours.js";
import { makeKeepsake } from "./keepsake.js";
import { isNightChrome } from "./roomTheme.js";
import type { RoomView } from "./types.js";

export function useRoomSharing(view: RoomView | null, onError: (message: string) => void) {
  const [captureRoom, setCaptureRoom] = useState<(() => Promise<Blob | null>) | null>(null);
  const [imageStatus, setImageStatus] = useState<"saving" | "shared" | "saved" | null>(null);
  const handleCaptureReady = useCallback((capture: () => Promise<Blob | null>) => {
    setCaptureRoom(() => capture);
  }, []);
  const [shareResult, setShareResult] = useState<"copied" | "shared" | null>(null);
  const objectUrls = useRef(new Set<string>());
  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );
  useEffect(() => {
    if (!imageStatus || imageStatus === "saving") return;
    const timer = setTimeout(() => {
      setImageStatus(null);
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    }, 2200);
    return () => clearTimeout(timer);
  }, [imageStatus]);
  useEffect(() => {
    if (!shareResult) return;
    const timer = setTimeout(() => setShareResult(null), 2200);
    return () => clearTimeout(timer);
  }, [shareResult]);
  const saveRoomImage = async (): Promise<void> => {
    if (!captureRoom || imageStatus) return;
    setImageStatus("saving");
    try {
      const roomBlob = await captureRoom();
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
      if (!blob) throw new Error("postcard unavailable");
      const slug =
        view?.cat.name
          ?.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "mrrp";
      const fileName = `${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const share = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (navigator.share && share.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: `${view?.cat.name ?? "mrrp"}'s room`, files: [file] });
          setImageStatus("shared");
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            setImageStatus(null);
            return;
          }
        }
      }
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      objectUrls.current.add(href);
      setImageStatus("saved");
    } catch {
      setImageStatus(null);
      onError("Couldn’t make the postcard. Try again.");
    }
  };

  const shareRoom = async () => {
    const resetResult = (result: "copied" | "shared") => {
      setShareResult(result);
    };
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
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    if (await copyText(location.href)) resetResult("copied");
    else onError("Couldn’t copy the link. You can copy it from the address bar.");
  };

  return { captureRoom, imageStatus, handleCaptureReady, saveRoomImage, shareRoom, shareResult };
}

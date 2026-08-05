import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

/*
 * Registered after paint, and never in dev.
 *
 * After, because a service worker is a nice-to-have and the cat is not: making the first render wait on
 * it would trade the thing that matters for the thing that helps. Not in dev, because a worker caching
 * assets while you are editing them is a morning lost to wondering why a change did nothing.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // No worker means no offline shell. Everything else still works, so this is not worth a message.
    });
  });
}

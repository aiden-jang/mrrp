import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { primeOnFirstGesture } from "./sound.js";
import { App } from "./App.js";
import "./index.css";

primeOnFirstGesture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

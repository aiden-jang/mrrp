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

// Web Analytics. The token is locked to mrrp.aidenjang.com, so anywhere else the beacon is
// CORS-refused and adds nothing but console noise.
if (import.meta.env.PROD && location.hostname === "mrrp.aidenjang.com") {
  const beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", '{"token": "7a7d3570392b45e4864fd4bd4ffdef91"}');
  document.body.appendChild(beacon);
}

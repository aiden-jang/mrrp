import { useEffect, useState } from "react";
import { lastRoom, markMine, myName, newRoomId } from "./api.js";
import s from "./App.module.css";
import { Cat } from "./Cat.js";
import { sceneFor, type Scene } from "./hours.js";
import { EYES, LOOKS } from "./looks.js";
import { ChromeSync } from "./RoomEffects.js";
import { chromeFor, isNightChrome } from "./roomTheme.js";
import { Welcome } from "./Welcome.js";

const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const DOOR_CAT = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
export const DOOR_CLOCK = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  homeHour: 19,
};

export function useDoorScene(): Scene {
  const [at, setAt] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAt(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return sceneFor(DOOR_CLOCK, at, null, false);
}

export function Landing() {
  const back = lastRoom.get();
  const wantsNew = new URLSearchParams(location.search).has("new");

  useEffect(() => {
    if (back && installed() && !wantsNew) location.replace(`/r/${back}`);
  }, [back, wantsNew]);

  const [name, setName] = useState(myName.get() ?? "");
  const door = useDoorScene();
  const make = () => {
    if (!name.trim()) return;
    myName.set(name.trim());
    const id = newRoomId();
    markMine(id);
    location.href = `/r/${id}`;
  };
  return (
    <main className={s.page} style={chromeFor(door) as React.CSSProperties}>
      <ChromeSync night={isNightChrome(door.sun)} />
      <Welcome name={name} onName={setName} onMake={make} back={back}>
        <Cat
          label="A pixel cat in a quiet room."
          look={DOOR_CAT}
          clock={DOOR_CLOCK}
          mood={null}
          nudge={0}
          reserveBelow={240}
        />
      </Welcome>
    </main>
  );
}

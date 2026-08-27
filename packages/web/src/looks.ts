import type { Cat } from "./types.js";

export interface Look {
  id: string;
  label: string;
  cat: Omit<Cat, "name" | "eyes">;
  voice: number;
}

export const LOOKS: Look[] = [
  {
    id: "ginger",
    label: "ginger",
    cat: { fur: "#e8963f", furDk: "#c9752a", belly: "#fbf0dd", tabby: true },
    voice: 1.0,
  },
  {
    id: "cream",
    label: "cream",
    cat: { fur: "#e8cfa8", furDk: "#cbaa7d", belly: "#fdf6e8", tabby: false },
    voice: 1.09,
  },
  {
    id: "grey",
    label: "grey",
    cat: { fur: "#9aa0a8", furDk: "#767d86", belly: "#eceff2", tabby: true },
    voice: 0.96,
  },
  {
    id: "black",
    label: "black",
    cat: { fur: "#4b444a", furDk: "#332e33", belly: "#6c636a", tabby: false },
    voice: 0.9,
  },
  {
    id: "white",
    label: "white",
    cat: { fur: "#f6f1e8", furDk: "#d8cfc0", belly: "#fffdf8", tabby: false },
    voice: 1.12,
  },
  {
    id: "brown",
    label: "brown",
    cat: { fur: "#a4703f", furDk: "#7f5429", belly: "#f0dcc0", tabby: true },
    voice: 0.94,
  },
  {
    id: "tuxedo",
    label: "tuxedo",
    cat: { fur: "#3f3a40", furDk: "#2b272c", belly: "#fbf7ef", tabby: false },
    voice: 1.03,
  },
  {
    id: "calico",
    label: "calico",
    cat: { fur: "#e3a95f", furDk: "#6b5a4c", belly: "#fdf5e6", tabby: true },
    voice: 1.06,
  },
];

export const EYES: { id: string; label: string; hex: string }[] = [
  { id: "green", label: "green", hex: "#7cb342" },
  { id: "amber", label: "amber", hex: "#d79a2b" },
  { id: "copper", label: "copper", hex: "#b4652c" },
  { id: "blue", label: "blue", hex: "#69a4c4" },
  { id: "grey", label: "grey", hex: "#8e9aa0" },
];

export function timezones(): string[] {
  const common = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Kolkata",
    "Australia/Sydney",
  ];
  const all =
    (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ??
    [];
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const seen = new Set<string>();
  return [here, ...common, ...all].filter((z) => z && !seen.has(z) && seen.add(z));
}

export type Season = "spring" | "summer" | "autumn" | "winter";

export function seasonFor(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

export function seasonalPlantColors(season: Season): { leaf: string; detail: string } {
  if (season === "spring") return { leaf: "#8eae70", detail: "#efb0ba" };
  if (season === "summer") return { leaf: "#6f9a55", detail: "#4f753c" };
  if (season === "autumn") return { leaf: "#b77743", detail: "#dc9a4d" };
  return { leaf: "#81907a", detail: "#edf0e8" };
}

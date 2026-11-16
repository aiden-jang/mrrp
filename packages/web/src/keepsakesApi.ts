import { myToken } from "./api.js";
import type { KeepsakePage } from "./types.js";

export async function fetchKeepsakes(id: string, before?: string): Promise<KeepsakePage> {
  const query = new URLSearchParams({ me: myToken(id) });
  if (before) query.set("before", before);
  const response = await fetch(`/api/room/${id}/keepsakes?${query}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Couldn’t open the kept gifts. Try again.");
  return response.json() as Promise<KeepsakePage>;
}

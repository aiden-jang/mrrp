import { myToken } from "./api.js";
import type { Bodies, HideSeekCommand } from "./types.js";

export async function sendSeek(id: string, command: HideSeekCommand) {
  const body: Bodies["seek"] = { me: myToken(id), command };
  const response = await fetch(`/api/room/${id}/seek`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    throw new Error("Couldn’t share that. Try again.");
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "The round changed, or you can’t do that just yet. Check the room and try again."
        : "Couldn’t share that. Try again.",
    );
}

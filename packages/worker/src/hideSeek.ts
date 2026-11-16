import { HIDE_SPOTS, type HideSeek, type HideSeekCommand } from "./types.js";
import { seatRoles, type SeatPerson } from "./seatAccess.js";
import { activeHold, type Hold, type StoredAffection } from "./affection.js";

interface StoredGame extends HideSeek {
  hider: string;
  seeker: string;
  spot: NonNullable<HideSeek["spot"]>;
}

export function isSeekCommand(value: unknown): value is HideSeekCommand {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<HideSeekCommand>;
  return (
    (c.round === null || (typeof c.round === "string" && /^[\da-f-]{36}$/.test(c.round))) &&
    (c.kind === "end" ||
      ((c.kind === "hide" || c.kind === "search") && HIDE_SPOTS.some((s) => s.id === c.spot)))
  );
}

export async function play(storage: DurableObjectStorage, me: string, command: HideSeekCommand) {
  return storage.transaction(async (txn) => {
    if (await txn.get("deleted")) return false;
    const people = (await txn.get<Record<string, SeatPerson>>("people")) ?? {};
    const { him, her } = seatRoles(people);
    if (!him || !her || (me !== him && me !== her) || !isSeekCommand(command)) return false;
    const saved = await txn.get<StoredGame>("hideSeek");
    const game = saved?.hider === her && saved.seeker === him ? saved : undefined;
    if ((game?.id ?? null) !== command.round) return false;
    if (command.kind === "end") {
      await txn.delete("hideSeek");
    } else if (command.kind === "hide") {
      if (me !== her || game?.phase === "hiding") return false;
      const held = await txn.get<Hold>("held");
      const gesture = await txn.get<StoredAffection>("affection");
      if (activeHold(held, him, Date.now()) || (gesture?.by === her && gesture.until > Date.now()))
        return false;
      await txn.delete(["waiting", "sitting", "settled"]);
      await txn.put<StoredGame>("hideSeek", {
        id: crypto.randomUUID(),
        hider: her,
        seeker: him,
        phase: "hiding",
        spot: command.spot!,
        checked: [],
      });
    } else {
      if (me !== him || game?.phase !== "hiding") return false;
      const spot = command.spot!;
      if (!game.checked.includes(spot)) game.checked.push(spot);
      if (game.spot === spot) game.phase = "found";
      await txn.put("hideSeek", game);
    }
    people[me]!.lastSeen = Date.now();
    await txn.put("people", people);
    return true;
  });
}

export async function view(
  storage: DurableObjectStorage,
  me: string,
  him: string | null,
  her: string | null,
): Promise<HideSeek | null> {
  if (me !== him && me !== her) return null;
  const game = await storage.get<StoredGame>("hideSeek");
  if (!game || game.hider !== her || game.seeker !== him) return null;
  return {
    id: game.id,
    phase: game.phase,
    checked: game.checked,
    ...(me === her || game.phase === "found" ? { spot: game.spot } : {}),
  };
}

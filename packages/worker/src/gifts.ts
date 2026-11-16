import { recordKeepsake } from "./keepsakes.js";
import { GIFTS, type Arrival, type Gift, type RoomView } from "./types.js";

export interface GiftTag {
  text?: string;
  id: string;
  from: string;
}

export interface KeptGift {
  text?: string;
  id: string;
  from: string;
  gift: Gift;
  at: number;
}

export function isGiftId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) ||
      GIFTS.some((gift) => value === `legacy:${gift.id}`))
  );
}

export function placeGift(
  storage: Pick<DurableObjectTransaction, "put">,
  gift: Gift,
  from: string,
  text?: string,
) {
  return storage.put({ gift, giftTag: { id: crypto.randomUUID(), from, text } });
}

export async function acceptGift(storage: DurableObjectTransaction, id: string, her: string | null) {
  const values = await storage.get<unknown>(["gift", "giftTag", "giftKept"]);
  const kept = values.get("giftKept") as KeptGift | undefined;
  if (kept?.id === id) return true;
  const gift = values.get("gift") as Gift | undefined;
  const tag = values.get("giftTag") as GiftTag | undefined;
  if (!gift || (tag?.id ?? `legacy:${gift}`) !== id || !her) return false;
  const receipt = { id, gift, from: tag?.from ?? her, text: tag?.text, at: Date.now() };
  if (receipt.from === her) await recordKeepsake(storage, receipt);
  await storage.put("giftKept", receipt);
  await storage.delete(["gift", "giftTag"]);
  return true;
}

export function giftArrivals(kept: KeptGift | undefined, her: string | null, since: number): Arrival[] {
  return her && kept && (!kept.from || kept.from === her) && kept.at > since
    ? [{ kind: "kept", at: kept.at, gift: kept.gift }]
    : [];
}

export function giftView(values: Map<string, unknown>, seated: boolean, her: string | null) {
  const gift = values.get("gift") as Gift | undefined;
  const tag = values.get("giftTag") as GiftTag | undefined;
  const kept = values.get("giftKept") as KeptGift | undefined;
  return {
    gift: seated ? (gift ?? null) : null,
    giftId: seated && gift ? (tag?.id ?? `legacy:${gift}`) : null,
    keptGift: seated && kept?.from === her ? { gift: kept.gift, at: kept.at } : null,
  } satisfies Pick<RoomView, "gift" | "giftId" | "keptGift">;
}

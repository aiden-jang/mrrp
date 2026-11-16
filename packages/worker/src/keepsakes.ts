import type { GiftKeepsake, KeepsakePage } from "./types.js";
import type { KeptGift } from "./gifts.js";

type Storage = Pick<DurableObjectTransaction, "get" | "put" | "list" | "delete">;
const prefixFor = (owner: string) => `keepsake:${owner}:`;
const suffixFor = (item: GiftKeepsake) => `${String(item.at).padStart(16, "0")}:${item.id}`;
export const isKeepsakeCursor = (value: string) => /^\d{16}:[a-z0-9:-]{1,50}$/.test(value);

export async function recordKeepsake(storage: Storage, kept: KeptGift) {
  const item: GiftKeepsake = { id: kept.id, gift: kept.gift, at: kept.at, text: kept.text };
  await storage.put(prefixFor(kept.from) + suffixFor(item), item);
}

export async function readKeepsakes(
  storage: Storage,
  owner: string | null,
  before?: string,
): Promise<KeepsakePage> {
  if (!owner) return { items: [], next: null };
  const latest = await storage.get<KeptGift>("giftKept");
  // Older versions retained one verifiable receipt, without a reliable link to its message.
  if (latest?.id && latest.from === owner && !(await storage.get(prefixFor(owner) + suffixFor(latest))))
    await recordKeepsake(storage, latest);
  const prefix = prefixFor(owner);
  const entries = [
    ...(await storage.list<GiftKeepsake>({
      prefix,
      reverse: true,
      limit: 21,
      end: before ? prefix + before : undefined,
    })),
  ];
  const page = entries.slice(0, 20);
  return {
    items: page.map(([, item]) => item),
    next: entries.length > 20 ? page.at(-1)![0].slice(prefix.length) : null,
  };
}

export async function allKeepsakes(storage: Storage, owner: string | null): Promise<GiftKeepsake[]> {
  const items: GiftKeepsake[] = [];
  let before: string | undefined;
  do {
    const page = await readKeepsakes(storage, owner, before);
    items.push(...page.items);
    before = page.next ?? undefined;
  } while (before);
  return items;
}

export async function eraseKeepsakes(storage: Storage, owner: string) {
  const prefix = prefixFor(owner);
  let entries = await storage.list({ prefix, limit: 100 });
  while (entries.size) {
    await storage.delete([...entries.keys()]);
    entries = await storage.list({ prefix, limit: 100 });
  }
}

export async function transferKeepsakes(storage: Storage, from: string, to: string) {
  const prefix = prefixFor(from);
  let entries = await storage.list<GiftKeepsake>({ prefix, limit: 100 });
  while (entries.size) {
    await storage.put(
      Object.fromEntries([...entries].map(([key, item]) => [prefixFor(to) + key.slice(prefix.length), item])),
    );
    await storage.delete([...entries.keys()]);
    entries = await storage.list<GiftKeepsake>({ prefix, limit: 100 });
  }
}

export async function discardLeftKeepsakes(storage: Storage) {
  const kept = await storage.get<{ token: string }>("leftSide");
  if (kept) await eraseKeepsakes(storage, kept.token);
}

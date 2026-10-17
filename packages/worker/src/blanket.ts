import { BLANKET_KEYS, type BlanketKey } from "@mrrp/shared";
export { type BlanketKey } from "@mrrp/shared";

export function isBlanketKey(value: unknown): value is BlanketKey {
  return typeof value === "string" && (BLANKET_KEYS as readonly string[]).includes(value);
}

export * from "@mrrp/shared";
import type { Bodies, Treat } from "@mrrp/shared";

export interface LeftOut {
  treat: Treat;
  at: number;
}

// JSON remains untrusted until the route validates each field.
export type Untrusted<K extends keyof Bodies> = Partial<Bodies[K]>;

export interface Doodle {
  cells: string;
  by: string;
  at: number;
}

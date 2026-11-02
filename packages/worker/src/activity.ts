import type { Visit } from "@mrrp/shared";

// Stored actors are seat credentials. Neither the room view nor a keepsake may disclose them.
export function exportActivity(log: Visit[], me: string, other: string | null | undefined) {
  return log.map(({ at, who, action }) => ({
    at,
    who: who === me ? "you" : who === other ? "them" : "former participant",
    action,
  }));
}

export function recentActivity(log: Visit[], other: string) {
  return log
    .filter((visit) => visit.who === other)
    .slice(0, 4)
    .map(({ at, action }) => ({ at, action }));
}

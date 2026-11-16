import type { Arrival, FirstKey, SaidSoFar, Told, Told2, Visit } from "@mrrp/shared";

export function firstArrivals(firsts: Record<string, number>, since: number): Arrival[] {
  return Object.entries(firsts).flatMap(([what, at]) =>
    at > since ? [{ kind: "first", at, what: what as FirstKey }] : [],
  );
}

export function actionArrivals(
  log: Visit[],
  actor: string,
  since: number,
  spokenFor = new Set<number>(),
): Arrival[] {
  return log
    .filter((visit) => visit.who === actor && visit.at > since)
    .filter((visit) => !(visit.action === "gift" && spokenFor.has(visit.at)))
    .slice(0, 4)
    .map((visit) => ({ kind: "action", at: visit.at, action: visit.action }));
}

export function catArrivals(
  log: Visit[],
  lines: Told2[],
  mood: Told | null,
  her: string,
  since: number,
): Arrival[] {
  const arrivals: Arrival[] = [];
  if (mood && mood.at > since) arrivals.push({ kind: "mood", ...mood });
  const said = lines.filter((line) => line.at > since).slice(0, 6);
  for (const line of said)
    arrivals.push({
      kind: "line",
      at: line.at,
      text: line.text,
      gift: line.gift,
      note: line.about,
      drawing: line.drawing,
    });
  // A gift with a message gets one arrival, carried by its words.
  const spokenFor = new Set(said.filter((line) => line.gift).map((line) => line.at));
  return [...arrivals, ...actionArrivals(log, her, since, spokenFor)];
}

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

export function replyHistory(all: string[], lines: Told2[], read: number): SaidSoFar {
  // A rewritten note must not inherit answers to its old words.
  const home = (line: Told2) =>
    line.aboutDay !== undefined && all[line.aboutDay] === line.about ? line.aboutDay : null;
  const answers = new Map<number, Told2[]>();
  for (const line of lines) {
    const day = home(line);
    if (day !== null) answers.set(day, [...(answers.get(day) ?? []), line]);
  }
  return {
    total: all.length,
    notes: all.slice(0, read + 1).map((text, i) => ({
      day: i + 1,
      text,
      answers: (answers.get(i) ?? []).map(({ text, at, drawing }) => ({ text, at, drawing })),
    })),
    lines: lines
      .filter((line) => home(line) === null)
      .map(({ text, at, gift, about, drawing }) => ({ text, at, gift, about, drawing })),
  };
}

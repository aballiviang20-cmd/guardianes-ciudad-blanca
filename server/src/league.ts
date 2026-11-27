import { db } from "./db";

/** Reglas de XP: se calculan SIEMPRE en el servidor a partir de los eventos (el cliente solo informa qué pasó). */
export function xpForEvent(type: string, payload: Record<string, unknown>): number {
  switch (type) {
    case "lesson_completed": {
      const correct = Math.max(0, Math.min(Number(payload.correct) || 0, 10));
      return 10 + correct * 2;
    }
    case "stories_completed":
      return 3;
    case "golden_card":
      return 15;
    case "guardian_report":
      return 5;
    default:
      return 0;
  }
}

type EventRow = { alias: string; course: string; type: string; payload: string };

export function league() {
  const rows = db.prepare("SELECT alias, course, type, payload FROM events").all() as EventRow[];
  const courses = new Map<string, { course: string; xp: number; members: Set<string>; lessons: number; reports: number; golden: number }>();
  for (const r of rows) {
    const c = courses.get(r.course) ?? { course: r.course, xp: 0, members: new Set(), lessons: 0, reports: 0, golden: 0 };
    c.xp += xpForEvent(r.type, JSON.parse(r.payload));
    c.members.add(r.alias);
    if (r.type === "lesson_completed") c.lessons++;
    if (r.type === "guardian_report") c.reports++;
    if (r.type === "golden_card") c.golden++;
    courses.set(r.course, c);
  }
  return [...courses.values()]
    .map((c) => ({ course: c.course, xp: c.xp, members: c.members.size, lessons: c.lessons, reports: c.reports, golden: c.golden }))
    .sort((a, b) => b.xp - a.xp);
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang, LessonsResponse } from "./types";

export type Progress = { stories: boolean; lesson: boolean; best: number; golden: boolean };
export type QueuedEvent = { eventId: string; alias: string; course: string; type: string; payload: Record<string, unknown>; ts: string };
export type PendingReport = { id: string; course: string; monumentId?: string; itemId?: string; kind: "dano" | "error_contenido"; damageType?: string; text: string };

/** Mismas reglas que el servidor (server/src/league.ts). Aquí solo se usan para mostrar el XP local. */
export function localXp(type: string, payload: Record<string, unknown>): number {
  if (type === "lesson_completed") return 10 + Math.min(Number(payload.correct) || 0, 10) * 2;
  if (type === "stories_completed") return 3;
  if (type === "golden_card") return 15;
  if (type === "guardian_report") return 5;
  return 0;
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

type State = {
  profile: { alias: string; course: string } | null;
  lang: Lang;
  juvenil: boolean;
  xp: number;
  streak: { count: number; lastDay: string | null };
  progress: Record<string, Progress>;
  queue: QueuedEvent[];
  reports: PendingReport[];
  content: LessonsResponse | null;
  setProfile: (alias: string, course: string) => void;
  logout: () => void;
  setLang: (l: Lang) => void;
  toggleJuvenil: () => void;
  setContent: (c: LessonsResponse) => void;
  track: (type: string, payload?: Record<string, unknown>) => void;
  completeStories: (monumentId: string) => void;
  completeLesson: (monumentId: string, correct: number, total: number) => void;
  unlockGolden: (monumentId: string) => void;
  addReport: (r: Omit<PendingReport, "id" | "course">) => void;
  dequeueEvents: (ids: string[]) => void;
  dequeueReports: (ids: string[]) => void;
};

const emptyProgress: Progress = { stories: false, lesson: false, best: 0, golden: false };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null,
      lang: "es",
      juvenil: false,
      xp: 0,
      streak: { count: 0, lastDay: null },
      progress: {},
      queue: [],
      reports: [],
      content: null,
      setProfile: (alias, course) => set({ profile: { alias: alias.trim(), course: course.trim().toUpperCase() } }),
      logout: () => set({ profile: null, xp: 0, progress: {}, streak: { count: 0, lastDay: null } }),
      setLang: (lang) => set({ lang }),
      toggleJuvenil: () => set({ juvenil: !get().juvenil }),
      setContent: (content) => set({ content }),
      track: (type, payload = {}) => {
        const p = get().profile;
        if (!p) return;
        const ev: QueuedEvent = { eventId: uid(), alias: p.alias, course: p.course, type, payload, ts: new Date().toISOString() };
        set({ queue: [...get().queue, ev], xp: get().xp + localXp(type, payload) });
      },
      completeStories: (id) => {
        const prev = get().progress[id] ?? emptyProgress;
        if (!prev.stories) get().track("stories_completed", { monumentId: id });
        set({ progress: { ...get().progress, [id]: { ...prev, stories: true } } });
      },
      completeLesson: (id, correct, total) => {
        const prev = get().progress[id] ?? emptyProgress;
        get().track("lesson_completed", { monumentId: id, correct, total });
        const s = get().streak;
        const streak =
          s.lastDay === today() ? s : { count: s.lastDay === yesterday() ? s.count + 1 : 1, lastDay: today() };
        set({ streak, progress: { ...get().progress, [id]: { ...prev, lesson: true, best: Math.max(prev.best, correct) } } });
      },
      unlockGolden: (id) => {
        const prev = get().progress[id] ?? emptyProgress;
        if (prev.golden) return;
        get().track("golden_card", { monumentId: id });
        set({ progress: { ...get().progress, [id]: { ...prev, golden: true } } });
      },
      addReport: (r) => {
        const p = get().profile;
        if (!p) return;
        set({ reports: [...get().reports, { ...r, id: uid(), course: p.course }] });
        if (r.kind === "dano") get().track("guardian_report", { monumentId: r.monumentId, damageType: r.damageType });
      },
      dequeueEvents: (ids) => set({ queue: get().queue.filter((e) => !ids.includes(e.eventId)) }),
      dequeueReports: (ids) => set({ reports: get().reports.filter((r) => !ids.includes(r.id)) }),
    }),
    { name: "guardianes-v1" },
  ),
);

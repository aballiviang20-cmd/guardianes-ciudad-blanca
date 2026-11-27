import { create } from "zustand";
import { persist } from "zustand/middleware";
import { safeChar, type CharId, type Outfit } from "./characters";
import type { Lang, LessonsResponse } from "./types";

export type Progress = { stories: boolean; cuento?: boolean; lesson: boolean; best: number; golden: boolean; stars?: number };
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
  avatar: { c: CharId; outfit: Outfit };
  lang: Lang;
  juvenil: boolean;
  muted: boolean;
  xp: number;
  streak: { count: number; lastDay: string | null };
  progress: Record<string, Progress>;
  queue: QueuedEvent[];
  reports: PendingReport[];
  content: LessonsResponse | null;
  setProfile: (alias: string, course: string) => void;
  setAvatar: (c: CharId, outfit?: Outfit) => void;
  completeCuento: (monumentId: string) => void;
  logout: () => void;
  setLang: (l: Lang) => void;
  toggleJuvenil: () => void;
  toggleMute: () => void;
  setContent: (c: LessonsResponse) => void;
  track: (type: string, payload?: Record<string, unknown>) => void;
  completeStories: (monumentId: string) => void;
  completeLesson: (monumentId: string, correct: number, total: number, mistakes?: number) => number;
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
      avatar: { c: "mateo", outfit: "casual" },
      lang: "es",
      juvenil: false,
      muted: false,
      xp: 0,
      streak: { count: 0, lastDay: null },
      progress: {},
      queue: [],
      reports: [],
      content: null,
      setProfile: (alias, course) => set({ profile: { alias: alias.trim(), course: course.trim().toUpperCase() } }),
      setAvatar: (c, outfit) => set({ avatar: { c, outfit: outfit ?? (get().avatar.c === c ? get().avatar.outfit : "casual") } }),
      completeCuento: (id) => {
        const prev = get().progress[id] ?? emptyProgress;
        if (!prev.cuento) get().track("stories_completed", { monumentId: id, kind: "cuento" });
        set({ progress: { ...get().progress, [id]: { ...prev, cuento: true, stories: true } } });
      },
      logout: () => set({ profile: null, xp: 0, progress: {}, streak: { count: 0, lastDay: null } }),
      setLang: (lang) => set({ lang }),
      toggleJuvenil: () => set({ juvenil: !get().juvenil }),
      toggleMute: () => set({ muted: !get().muted }),
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
      completeLesson: (id, correct, total, mistakes = 0) => {
        const prev = get().progress[id] ?? emptyProgress;
        // Estrellas: 3 sin errores, 2 con un error, 1 al completar.
        const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
        get().track("lesson_completed", { monumentId: id, correct, total, stars });
        const s = get().streak;
        const streak =
          s.lastDay === today() ? s : { count: s.lastDay === yesterday() ? s.count + 1 : 1, lastDay: today() };
        set({ streak, progress: { ...get().progress, [id]: { ...prev, lesson: true, best: Math.max(prev.best, correct), stars: Math.max(prev.stars ?? 0, stars) } } });
        return stars;
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
    {
      name: "guardianes-v1",
      version: 2,
      // v2: Vale pasó a ser Sofía y se sumaron personajes; un avatar guardado inválido se corrige.
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<State>;
        if (s.avatar) s.avatar = { c: safeChar(s.avatar.c), outfit: s.avatar.outfit ?? "casual" };
        return s as State;
      },
    },
  ),
);

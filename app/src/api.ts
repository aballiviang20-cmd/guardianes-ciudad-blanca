import { useStore } from "./store";
import type { LeagueCourse, LessonsResponse } from "./types";

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Error ${res.status}`);
  return body as T;
}

export const api = {
  lessons: () => fetch("/api/lessons").then((r) => json<LessonsResponse>(r)),
  league: () => fetch("/api/league").then((r) => json<{ updatedAt: string; courses: LeagueCourse[] }>(r)),
  health: () => fetch("/api/health").then((r) => json<{ ok: boolean; ai: boolean }>(r)),
  evidence: () => fetch("/api/evidence").then((r) => json<Record<string, unknown> & { available: boolean }>(r)),
};

/** Llamadas del panel docente: el PIN viaja en un header. */
export function teacherApi(pin: string) {
  const headers = { "content-type": "application/json", "x-teacher-pin": pin };
  const post = <T>(url: string, body: unknown = {}) =>
    fetch(`/api/teacher${url}`, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => json<T>(r));
  const get = <T>(url: string) => fetch(`/api/teacher${url}`, { headers }).then((r) => json<T>(r));
  return { post, get };
}

let flushing = false;

/** Envía la cola offline (eventos y reportes) cuando hay conexión. Los eventos son idempotentes en el servidor. */
export async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const { queue, reports, dequeueEvents, dequeueReports } = useStore.getState();
    if (queue.length) {
      const batch = queue.slice(0, 200);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
      if (res.ok) dequeueEvents(batch.map((e) => e.eventId));
    }
    for (const r of reports) {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r),
      });
      if (res.ok) dequeueReports([r.id]);
    }
  } catch {
    // Sin red: se reintenta más tarde.
  } finally {
    flushing = false;
  }
}

export function startSync() {
  window.addEventListener("online", () => void flushQueue());
  setInterval(() => void flushQueue(), 15000);
  void flushQueue();
}

/** Descarga el contenido aprobado y lo guarda para usarlo sin conexión. */
export async function refreshContent() {
  try {
    const content = await api.lessons();
    useStore.getState().setContent(content);
    return content;
  } catch {
    return useStore.getState().content;
  }
}

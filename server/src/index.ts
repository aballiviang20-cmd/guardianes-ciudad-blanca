import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { db, now } from "./db";
import { getFichas, loadFichas, loadMonuments, retrieve } from "./fichas";
import { league } from "./league";
import { draft, GenerationError, itemsOfBatch, judgeBatch, rowToItem, verifyBatch, type ItemRow } from "./pipeline";
import { redactPII } from "./pii";
import { APP_DIST, EVAL_DIR } from "./paths";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const TEACHER_PIN = process.env.TEACHER_PIN || "1825";

/** Panel docente protegido con un PIN de demo (en producción: cuentas de docente). */
function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (req.header("x-teacher-pin") !== TEACHER_PIN) {
    res.status(401).json({ error: "PIN de docente incorrecto" });
    return;
  }
  next();
}

/** Envuelve handlers async para que cualquier error responda JSON claro. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

// ---------------- Público (alumno) ----------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY), time: now() });
});

app.get("/api/monuments", (_req, res) => {
  const { fichas } = getFichas();
  const counts = db
    .prepare("SELECT monument_id, kind, COUNT(*) AS n FROM items WHERE status = 'approved' GROUP BY monument_id, kind")
    .all() as { monument_id: string; kind: string; n: number }[];
  res.json(
    loadMonuments().map((m) => ({
      ...m,
      hasFicha: fichas.has(m.id),
      fichaDraft: fichas.get(m.id)?.draft ?? false,
      sources: fichas.get(m.id)?.sources ?? [],
      approvedQuestions: counts.find((c) => c.monument_id === m.id && c.kind === "question")?.n ?? 0,
      approvedStories: counts.find((c) => c.monument_id === m.id && c.kind === "story")?.n ?? 0,
    })),
  );
});

/** Lecciones: SOLO contenido aprobado por un docente. Lo que recibe el alumno nunca pasó sin revisión humana. */
app.get("/api/lessons", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM items WHERE status = 'approved' AND mode != 'norag' ORDER BY created_at")
    .all() as ItemRow[];
  const { fichas } = getFichas();
  const monuments = loadMonuments().map((m) => {
    const items = rows.filter((r) => r.monument_id === m.id).map(rowToItem);
    return {
      ...m,
      sources: fichas.get(m.id)?.sources ?? [],
      stories: items.filter((i) => i.kind === "story").map((i) => ({ id: i.id, ...i.payload, fragmentId: i.fragmentId })),
      questions: items.filter((i) => i.kind === "question").map((i) => ({ id: i.id, ...i.payload, fragmentId: i.fragmentId })),
    };
  });
  res.json({ updatedAt: now(), monuments });
});

/** Cola offline del alumno: lote de eventos, idempotente por eventId. */
app.post("/api/events", (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  const insert = db.prepare(
    "INSERT OR IGNORE INTO events (event_id, alias, course, type, payload, ts, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  let accepted = 0;
  for (const e of events.slice(0, 500)) {
    if (!e?.eventId || !e?.alias || !e?.course || !e?.type) continue;
    const r = insert.run(
      String(e.eventId),
      String(e.alias).slice(0, 24),
      String(e.course).slice(0, 24).toUpperCase(),
      String(e.type),
      JSON.stringify(e.payload ?? {}),
      String(e.ts ?? now()),
      now(),
    );
    accepted += Number(r.changes);
  }
  res.json({ received: events.length, accepted });
});

app.get("/api/league", (_req, res) => {
  res.json({ updatedAt: now(), courses: league() });
});

app.post("/api/reports", (req, res) => {
  const { course, monumentId, itemId, kind, damageType, text } = req.body ?? {};
  if (!course || !kind || !["dano", "error_contenido"].includes(kind)) {
    res.status(400).json({ error: "Faltan datos del reporte" });
    return;
  }
  const id = randomUUID();
  db.prepare(
    "INSERT INTO reports (id, course, monument_id, item_id, kind, damage_type, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, String(course).toUpperCase().slice(0, 24), monumentId ?? null, itemId ?? null, kind, damageType ?? null,
    redactPII(String(text ?? "")), now());
  res.json({ id });
});

app.get("/api/evidence", (_req, res) => {
  const file = path.join(EVAL_DIR, "results.json");
  if (!fs.existsSync(file)) {
    res.json({ available: false });
    return;
  }
  res.json({ available: true, ...JSON.parse(fs.readFileSync(file, "utf8")) });
});

// ---------------- Docente ----------------

const teacher = express.Router();
teacher.use(requireTeacher);

teacher.post("/fichas/reload", (_req, res) => {
  const { fichas } = loadFichas();
  res.json({ fichas: [...fichas.values()].map((f) => ({ id: f.monumentId, fragments: f.fragments.length, draft: f.draft })) });
});

teacher.post("/generate/retrieve", (req, res) => {
  const { monumentId, topic } = req.body ?? {};
  const fragments = retrieve(String(monumentId), topic ? String(topic) : undefined, 4);
  if (fragments.length === 0) {
    res.status(404).json({ error: "Ese monumento todavía no tiene ficha en data/fichas" });
    return;
  }
  res.json({ fragments });
});

teacher.post(
  "/generate/draft",
  wrap(async (req, res) => {
    const { monumentId, fragmentIds, nQuestions = 3, nStories = 1, mode = "rag" } = req.body ?? {};
    const ficha = getFichas().fichas.get(String(monumentId));
    const fragments = (ficha?.fragments ?? []).filter((f) => !Array.isArray(fragmentIds) || fragmentIds.includes(f.id));
    if (mode === "rag" && fragments.length === 0) {
      res.status(404).json({ error: "No hay fragmentos para ese monumento" });
      return;
    }
    const result = await draft({
      monumentId: String(monumentId),
      fragments,
      nQuestions: Math.min(Number(nQuestions) || 3, 8),
      nStories: Math.min(Number(nStories) || 1, 4),
      mode: mode === "norag" ? "norag" : "rag",
    });
    res.json(result);
  }),
);

teacher.post("/generate/verify", (req, res) => {
  res.json({ items: verifyBatch(String(req.body?.batchId)) });
});

teacher.post(
  "/generate/judge",
  wrap(async (req, res) => {
    res.json({ items: await judgeBatch(String(req.body?.batchId)) });
  }),
);

teacher.get("/items", (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const rows = (
    status
      ? db.prepare("SELECT * FROM items WHERE status = ? AND mode != 'norag' ORDER BY created_at DESC").all(status)
      : db.prepare("SELECT * FROM items WHERE mode != 'norag' ORDER BY created_at DESC LIMIT 200").all()
  ) as ItemRow[];
  res.json({ items: rows.map(rowToItem) });
});

teacher.get("/batches/:id", (req, res) => {
  res.json({ items: itemsOfBatch(String(req.params.id)) });
});

teacher.post("/items/:id/approve", (req, res) => {
  const { reviewer = "docente", payload } = req.body ?? {};
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(String(req.params.id)) as ItemRow | undefined;
  if (!row) {
    res.status(404).json({ error: "No existe" });
    return;
  }
  const merged = payload ? JSON.stringify({ ...JSON.parse(row.payload), ...payload }) : row.payload;
  db.prepare("UPDATE items SET status = 'approved', reason = NULL, reviewer = ?, payload = ?, updated_at = ? WHERE id = ?").run(
    String(reviewer).slice(0, 40), merged, now(), row.id);
  res.json({ ok: true });
});

teacher.post("/items/:id/reject", (req, res) => {
  const { reviewer = "docente" } = req.body ?? {};
  db.prepare("UPDATE items SET status = 'rejected', reason = 'docente', reviewer = ?, updated_at = ? WHERE id = ?").run(
    String(reviewer).slice(0, 40), now(), String(req.params.id));
  res.json({ ok: true });
});

teacher.get("/reports", (_req, res) => {
  res.json({ reports: db.prepare("SELECT * FROM reports ORDER BY created_at DESC LIMIT 200").all() });
});

teacher.get("/stats", (_req, res) => {
  const byStatus = db.prepare("SELECT status, reason, COUNT(*) AS n FROM items WHERE mode != 'norag' GROUP BY status, reason").all();
  const wrong = db
    .prepare(
      `SELECT json_extract(payload, '$.questionId') AS questionId, COUNT(*) AS n FROM events
       WHERE type = 'answer' AND json_extract(payload, '$.correct') = 0 GROUP BY questionId ORDER BY n DESC LIMIT 5`,
    )
    .all() as { questionId: string; n: number }[];
  const mostFailed = wrong.map((w) => {
    const row = db.prepare("SELECT * FROM items WHERE id = ?").get(w.questionId) as ItemRow | undefined;
    return { questionId: w.questionId, fails: w.n, prompt: row ? JSON.parse(row.payload).prompt_es : "(eliminada)" };
  });
  res.json({ byStatus, mostFailed, league: league() });
});

app.use("/api/teacher", teacher);

// ---------------- App compilada (un solo origen para el túnel HTTPS y la demo) ----------------

if (fs.existsSync(APP_DIST)) {
  app.use(express.static(APP_DIST));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(APP_DIST, "index.html")));
}

// Errores: siempre JSON claro, nunca la UI colgada.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof GenerationError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Error interno";
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT) || 8787;
loadFichas();
app.listen(PORT, () => {
  console.log(`Guardianes API en http://localhost:${PORT}  (IA ${process.env.ANTHROPIC_API_KEY ? "activa" : "SIN API KEY"})`);
});

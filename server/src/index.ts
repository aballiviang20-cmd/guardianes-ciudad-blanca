import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { db, now } from "./db";
import { addSource, fichasSummary, getFichas, loadFichas, loadMonuments, retrieve } from "./fichas";
import { league, xpForEvent } from "./league";
import { draft, GenerationError, itemsOfBatch, judgeBatch, rowToItem, verifyBatch, type ItemRow } from "./pipeline";
import { redactPII } from "./pii";
import { normalize } from "./verify";
import { blindItems, computeResults, loadLabels, saveLabel } from "./eval/score";
import { APP_DIST, DATA_DIR, EVAL_DIR } from "./paths";

const app = express();
app.use(cors());
const smallJson = express.json({ limit: "1mb" });
// El modelo de reconocimiento (vectores) se sube a una ruta propia con límite mayor.
app.use((req, res, next) => (req.path === "/api/teacher/classifier" ? next() : smallJson(req, res, next)));

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

/** "[A] García Quintanilla, Julio. 1963. Historia..." -> "García Quintanilla (1963)". */
function shortCite(source: string): string {
  const s = source.replace(/^\[[A-Z]\]\s*/, "");
  const m = s.match(/^([^,.(«]+?)\s*[,.].*?\b(1[5-9]\d\d|20\d\d)\b/);
  return m ? `${m[1].trim()} (${m[2]})` : s.split(" (")[0].slice(0, 60);
}

/** Cita corta de las fuentes marcadas ([A], [B]...) en el fragmento que respalda el ítem. */
function citeFor(fragmentText: string | null, quote: string | null, sources: string[]): string {
  if (!fragmentText) return "";
  // Cada oración de la ficha termina con sus marcas de fuente: se cita solo la oración que contiene la cita.
  const sentences = fragmentText.match(/[^[]+?(?:\s*\[[A-Z]\])+/g) ?? [fragmentText];
  const q = quote ? normalize(quote).replace(/[.,;:]+$/, "") : "";
  const target = (q && sentences.find((s) => normalize(s).includes(q))) || fragmentText;
  const marks = [...new Set([...target.matchAll(/\[([A-Z])\]/g)].map((x) => x[1]))];
  return marks
    .map((k) => sources.find((s) => s.startsWith(`[${k}]`)))
    .filter((s): s is string => Boolean(s))
    .map(shortCite)
    .join(" · ");
}

/** Lecciones: SOLO contenido aprobado por un docente. Lo que recibe el alumno nunca pasó sin revisión humana. */
app.get("/api/lessons", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM items WHERE status = 'approved' AND mode != 'norag' ORDER BY created_at")
    .all() as ItemRow[];
  const { fichas } = getFichas();
  const monuments = loadMonuments().map((m) => {
    const sources = fichas.get(m.id)?.sources ?? [];
    const items = rows.filter((r) => r.monument_id === m.id).map(rowToItem);
    const view = (i: ReturnType<typeof rowToItem>) => ({
      id: i.id,
      ...i.payload,
      fragmentId: i.fragmentId,
      cite: citeFor(i.fragmentText, i.evidenceQuote, sources),
    });
    return {
      ...m,
      sources: sources.map(shortCite),
      stories: items.filter((i) => i.kind === "story").map(view),
      questions: items.filter((i) => i.kind === "question").map(view),
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

/** Fondos ilustrados (generados por el equipo con ChatGPT) en data/fondos/{id}.(webp|png|jpg). */
const FONDOS_DIR = path.join(DATA_DIR, "fondos");
app.use("/fondos", express.static(FONDOS_DIR, { maxAge: "1h" }));
app.get("/api/fondos", (_req, res) => {
  const out: Record<string, string> = {};
  if (fs.existsSync(FONDOS_DIR)) {
    for (const f of fs.readdirSync(FONDOS_DIR)) {
      const m = f.match(/^([a-z0-9-]+)\.(webp|png|jpe?g)$/i);
      if (m) out[m[1]] = `/fondos/${f}`;
    }
  }
  res.json(out);
});

/** Cuentos tipo cómic (clase invertida): contenido curado por el equipo en data/cuentos.json. */
app.get("/api/cuentos", (_req, res) => {
  const file = path.join(DATA_DIR, "cuentos.json");
  res.json(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {});
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

// Resumen para el inicio del panel docente: números del curso, avance por lugar y actividad reciente
teacher.get("/overview", (_req, res) => {
  type Ev = { alias: string; course: string; type: string; payload: string; ts: string };
  const ev = db.prepare("SELECT alias, course, type, payload, ts FROM events ORDER BY ts DESC").all() as Ev[];
  const parsed = ev.map((e) => ({ ...e, p: JSON.parse(e.payload) as Record<string, unknown> }));
  const lessons = parsed.filter((e) => e.type === "lesson_completed");
  const correct = lessons.reduce((a, e) => a + (Number(e.p.correct) || 0), 0);
  const total = lessons.reduce((a, e) => a + (Number(e.p.total) || 0), 0);
  const items = db.prepare("SELECT monument_id, kind, status FROM items WHERE mode != 'norag'").all() as { monument_id: string; kind: string; status: string }[];
  const reportsNew = (db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'nuevo'").get() as { n: number }).n;
  const places = fichasSummary().map((pl) => {
    const mine = items.filter((i) => i.monument_id === pl.id);
    const done = lessons.filter((l) => l.p.monumentId === pl.id);
    const stars = done.map((l) => Number(l.p.stars) || 0);
    return {
      ...pl,
      published: mine.filter((i) => i.status === "approved" && i.kind === "question").length,
      stories: mine.filter((i) => i.status === "approved" && i.kind === "story").length,
      pending: mine.filter((i) => i.status === "pending").length,
      completions: new Set(done.map((l) => `${l.course}|${l.alias}`)).size,
      avgStars: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : null,
    };
  });
  res.json({
    kpis: {
      students: new Set(parsed.map((e) => `${e.course}|${e.alias}`)).size,
      courses: new Set(parsed.map((e) => e.course)).size,
      xp: parsed.reduce((a, e) => a + xpForEvent(e.type, e.p), 0),
      lessons: lessons.length,
      accuracy: total ? Math.round((correct / total) * 100) : null,
      published: items.filter((i) => i.status === "approved" && i.kind === "question").length,
      pending: items.filter((i) => i.status === "pending").length,
      reportsNew,
    },
    places,
    recent: parsed
      .filter((e) => e.type !== "answer")
      .slice(0, 14)
      .map((e) => ({ ts: e.ts, alias: e.alias, course: e.course, type: e.type, monumentId: e.p.monumentId ?? null, correct: e.p.correct ?? null, total: e.p.total ?? null, stars: e.p.stars ?? null })),
    league: league().slice(0, 5),
  });
});

// Lo que la IA conoce de cada lugar y subida de información nueva del docente
teacher.get("/fichas", (_req, res) => {
  res.json({ places: fichasSummary() });
});

teacher.post("/fichas/:id/fuente", (req, res) => {
  try {
    const { title, text } = req.body ?? {};
    res.json(addSource(String(req.params.id), String(title ?? ""), String(text ?? "")));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "No se pudo guardar" });
  }
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

// ---- Evaluación: etiquetado a ciegas y cálculo de métricas ----
teacher.get("/eval/blind", (req, res) => {
  const who = String(req.query.who || "p3").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const labels = loadLabels(who);
  const { fichas } = getFichas();
  const items = blindItems().map((i) => ({ ...i, label: labels[i.id] ?? null }));
  const fichaText = Object.fromEntries([...fichas.values()].map((f) => [f.monumentId, f.fragments.map((x) => x.text).join(" ")]));
  res.json({ who, items, fichas: fichaText });
});

teacher.post("/eval/label", (req, res) => {
  const { who, id, label } = req.body ?? {};
  if (!["correcta", "incorrecta", "dudosa"].includes(label)) {
    res.status(400).json({ error: "Etiqueta inválida" });
    return;
  }
  saveLabel(String(who).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8), String(id), label);
  res.json({ ok: true });
});

teacher.post("/eval/score", (_req, res) => {
  res.json(computeResults());
});

// ---- Reconocimiento en el dispositivo: el servidor solo guarda los ejemplos (vectores), nunca fotos ----
const CLASSIFIER_FILE = path.join(DATA_DIR, "classifier", "knn.json");

teacher.post("/classifier", express.json({ limit: "40mb" }), (req, res) => {
  const { examples, metrics } = req.body ?? {};
  if (!Array.isArray(examples) || examples.some((e) => typeof e?.label !== "string" || !Array.isArray(e?.vec))) {
    res.status(400).json({ error: "Formato inválido: se esperan ejemplos {label, vec}" });
    return;
  }
  fs.mkdirSync(path.dirname(CLASSIFIER_FILE), { recursive: true });
  // Se redondean los vectores para que el archivo pese menos sin afectar la clasificación.
  const compact = examples.map((e: { label: string; vec: number[] }) => ({ label: e.label, vec: e.vec.map((x) => Math.round(x * 1e4) / 1e4) }));
  fs.writeFileSync(CLASSIFIER_FILE, JSON.stringify({ savedAt: now(), model: "mobilenet_v2_100 + KNN", examples: compact }));
  if (metrics) {
    const manualPath = path.join(EVAL_DIR, "manual.json");
    const manual = fs.existsSync(manualPath) ? JSON.parse(fs.readFileSync(manualPath, "utf8")) : {};
    manual.classifier = metrics;
    fs.mkdirSync(EVAL_DIR, { recursive: true });
    fs.writeFileSync(manualPath, JSON.stringify(manual, null, 2));
  }
  res.json({ saved: compact.length });
});

app.get("/api/classifier", (_req, res) => {
  if (!fs.existsSync(CLASSIFIER_FILE)) {
    res.json({ available: false, examples: [] });
    return;
  }
  res.json({ available: true, ...JSON.parse(fs.readFileSync(CLASSIFIER_FILE, "utf8")) });
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

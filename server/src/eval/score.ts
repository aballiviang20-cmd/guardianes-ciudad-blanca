import fs from "node:fs";
import path from "node:path";
import { EVAL_DIR } from "../paths";

export type Label = "correcta" | "incorrecta" | "dudosa";
type Item = {
  id: string; method: string; model: string; monumentId: string; prompt: string; options: string[]; answer: number; type: string;
  explanation: string; status: string; reason: string | null; usage: { input_tokens: number; output_tokens: number } | null; latencyMs: number | null;
};

/** Precios de lista (US$ por millón de tokens, noviembre 2026). Verificar el día del pitch. */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

const readJson = <T>(file: string, fallback: T): T => {
  const p = path.join(EVAL_DIR, file);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T) : fallback;
};

export function loadGenerated(): Item[] {
  return readJson<{ items: Item[] }>("generated.json", { items: [] }).items;
}

export function loadLabels(who: string): Record<string, Label> {
  return readJson<Record<string, Label>>(`labels_${who}.json`, {});
}

export function saveLabel(who: string, id: string, label: Label) {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  const labels = loadLabels(who);
  labels[id] = label;
  fs.writeFileSync(path.join(EVAL_DIR, `labels_${who}.json`), JSON.stringify(labels, null, 2));
}

/** Orden ciego y estable: mezcla por hash del id (no revela el método). */
export function blindItems() {
  const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return loadGenerated()
    .map(({ id, monumentId, prompt, options, answer, type, explanation }) => ({ id, monumentId, prompt, options, answer, type, explanation }))
    .sort((a, b) => hash(a.id) - hash(b.id));
}

function cohenKappa(pairs: [Label, Label][]): number | null {
  if (pairs.length < 2) return null;
  const cats: Label[] = ["correcta", "incorrecta", "dudosa"];
  const n = pairs.length;
  const po = pairs.filter(([a, b]) => a === b).length / n;
  const pe = cats.reduce((s, c) => s + (pairs.filter(([a]) => a === c).length / n) * (pairs.filter(([, b]) => b === c).length / n), 0);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

export function computeResults(raters: [string, string] = ["p3", "p4"]) {
  const items = loadGenerated();
  const [l1, l2] = raters.map(loadLabels);
  const consensus = (id: string): Label | null => {
    const a = l1[id];
    const b = l2[id];
    if (!a && !b) return null;
    if (a && b) return a === b ? a : "dudosa";
    return (a ?? b) as Label; // una sola etiqueta: se usa, pero el kappa lo refleja
  };

  const methods = [...new Set(items.map((i) => i.method))].map((method) => {
    const rows = items.filter((i) => i.method === method && consensus(i.id));
    const c = rows.filter((i) => consensus(i.id) === "correcta").length;
    const inc = rows.filter((i) => consensus(i.id) === "incorrecta").length;
    const dud = rows.filter((i) => consensus(i.id) === "dudosa").length;
    return { method, n: rows.length, correct: c, incorrect: inc, doubtful: dud, accuracy: rows.length ? c / rows.length : 0 };
  });

  const rag = items.filter((i) => i.method.startsWith("Con RAG"));
  const pipeline = {
    total: rag.length,
    rejectedByQuote: rag.filter((i) => i.reason && i.reason.startsWith("cita")).length,
    rejectedByJudge: rag.filter((i) => i.reason === "juez").length,
    passed: rag.filter((i) => i.status === "pending" || i.status === "approved").length,
  };

  // Juez vs humanos: solo ítems con RAG que pasaron el chequeo de cita (el juez los vio).
  const judged = rag.filter((i) => (i.status === "pending" || i.reason === "juez") && consensus(i.id) && consensus(i.id) !== "dudosa");
  const tp = judged.filter((i) => i.reason === "juez" && consensus(i.id) === "incorrecta").length;
  const fp = judged.filter((i) => i.reason === "juez" && consensus(i.id) === "correcta").length;
  const fn = judged.filter((i) => i.reason !== "juez" && consensus(i.id) === "incorrecta").length;

  const pairs = items.filter((i) => l1[i.id] && l2[i.id]).map((i) => [l1[i.id], l2[i.id]] as [Label, Label]);

  const cost = [...new Set(items.map((i) => i.model))].map((model) => {
    const rows = items.filter((i) => i.model === model && i.usage);
    const [pin, pout] = PRICES[model] ?? [0, 0];
    const usd = rows.reduce((s, i) => s + ((i.usage!.input_tokens * pin + i.usage!.output_tokens * pout) / 1e6), 0);
    const lat = rows.reduce((s, i) => s + (i.latencyMs ?? 0), 0);
    return { model, usdPerQuestion: rows.length ? usd / rows.length : 0, avgLatencyMs: rows.length ? lat / rows.length : 0 };
  });

  const manual = readJson<{ teacher?: unknown; classifier?: unknown; notes?: string[] }>("manual.json", {});
  const results = {
    generatedAt: new Date().toISOString(),
    labeled: { [raters[0]]: Object.keys(l1).length, [raters[1]]: Object.keys(l2).length, total: items.length },
    methods,
    pipeline,
    kappa: cohenKappa(pairs),
    judge: { precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, n: judged.length },
    cost,
    teacher: manual.teacher ?? null,
    classifier: manual.classifier ?? null,
    notes: [
      "Etiquetado humano a ciegas por dos personas del equipo; si no coinciden, la pregunta cuenta como dudosa.",
      "Exactitud = correctas / etiquetadas (las dudosas cuentan en contra).",
      "Muestra pequeña: es una señal, no una prueba estadística.",
      ...(manual.notes ?? []),
    ],
  };
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(EVAL_DIR, "results.json"), JSON.stringify(results, null, 2));
  return results;
}

// Uso por línea de comandos: npm run eval:score --prefix server
if (process.argv[1]?.includes("score")) {
  const r = computeResults();
  console.log(JSON.stringify({ methods: r.methods, kappa: r.kappa, judge: r.judge, pipeline: r.pipeline }, null, 2));
}

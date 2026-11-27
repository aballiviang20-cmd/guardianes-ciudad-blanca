import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Carpeta temporal: el test nunca toca eval/ real.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guardianes-eval-"));
process.env.EVAL_DIR = dir;

const base = { monumentId: "x", prompt: "p", options: [], answer: 0, type: "mcq", explanation: "" };
const items = [
  { id: "a", method: "Con RAG + cita · m", model: "claude-opus-5-5", status: "pending", reason: null, usage: { input_tokens: 1000, output_tokens: 300 }, latencyMs: 2000 },
  { id: "b", method: "Con RAG + cita · m", model: "claude-opus-5-5", status: "rejected", reason: "juez", usage: { input_tokens: 1000, output_tokens: 300 }, latencyMs: 2000 },
  { id: "c", method: "Con RAG + cita · m", model: "claude-opus-5-5", status: "rejected", reason: "cita_inexistente", usage: null, latencyMs: null },
  { id: "d", method: "Sin RAG · m", model: "claude-opus-5-5", status: "rejected", reason: "juez", usage: { input_tokens: 500, output_tokens: 300 }, latencyMs: 1500 },
  { id: "e", method: "Sin RAG · m", model: "claude-opus-5-5", status: "rejected", reason: "juez", usage: { input_tokens: 500, output_tokens: 300 }, latencyMs: 1500 },
].map((x) => ({ ...base, ...x }));

let score: typeof import("../src/eval/score");

beforeAll(async () => {
  fs.writeFileSync(path.join(dir, "generated.json"), JSON.stringify({ items }));
  fs.writeFileSync(path.join(dir, "labels_p3.json"), JSON.stringify({ a: "correcta", b: "incorrecta", c: "correcta", d: "incorrecta", e: "correcta" }));
  fs.writeFileSync(path.join(dir, "labels_p4.json"), JSON.stringify({ a: "correcta", b: "incorrecta", c: "incorrecta", d: "incorrecta", e: "correcta" }));
  score = await import("../src/eval/score");
});

describe("métricas de evaluación", () => {
  it("exactitud por método con consenso de dos etiquetadores (desacuerdo = dudosa)", () => {
    const r = score.computeResults();
    const rag = r.methods.find((m) => m.method.startsWith("Con RAG"))!;
    const norag = r.methods.find((m) => m.method.startsWith("Sin RAG"))!;
    expect(rag).toMatchObject({ n: 3, correct: 1, incorrect: 1, doubtful: 1 });
    expect(norag).toMatchObject({ n: 2, correct: 1, incorrect: 1 });
  });

  it("cuenta los filtros del pipeline", () => {
    expect(score.computeResults().pipeline).toEqual({ total: 3, rejectedByQuote: 1, rejectedByJudge: 1, passed: 1 });
  });

  it("mide al juez contra los humanos", () => {
    // RAG juzgados y no dudosos: a (pasó, correcta) y b (rechazada por juez, incorrecta) -> precisión y recall 1
    expect(score.computeResults().judge).toEqual({ precision: 1, recall: 1, n: 2 });
  });

  it("calcula kappa de Cohen y costo por pregunta", () => {
    const r = score.computeResults();
    expect(r.kappa).not.toBeNull();
    expect(r.kappa!).toBeGreaterThan(0.5);
    expect(r.cost[0].usdPerQuestion).toBeCloseTo(((1000 * 4 + 300 * 20) * 2 + (500 * 4 + 300 * 20) * 2) / 1e6 / 4, 6);
  });

  it("el orden ciego no expone el método", () => {
    const blind = score.blindItems();
    expect(blind).toHaveLength(5);
    expect(Object.keys(blind[0])).not.toContain("method");
  });
});

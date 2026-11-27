/**
 * Evaluación (criterio B): genera preguntas CON RAG + cita y SIN RAG sobre los mismos monumentos.
 * Luego dos personas las etiquetan a ciegas en /evidencia/etiquetar y score.ts calcula las métricas.
 *
 *   npm run eval --prefix server                        # modelo principal (CLAUDE_MODEL)
 *   EVAL_ALT_MODEL=claude-haiku-5-5 npm run eval ...     # agrega la variante RAG con un segundo modelo
 */
import fs from "node:fs";
import path from "node:path";
import { getFichas, loadFichas, retrieve } from "../fichas";
import { draft, judgeBatch, verifyBatch } from "../pipeline";
import { EVAL_DIR } from "../paths";

const PER_MONUMENT = Number(process.env.EVAL_PER_MONUMENT || 4);

type EvalItem = {
  id: string;
  method: string;
  model: string;
  monumentId: string;
  prompt: string;
  options: string[];
  answer: number;
  type: string;
  explanation: string;
  evidenceQuote: string | null;
  status: string;
  reason: string | null;
  judgeReason: string | null;
  usage: { input_tokens: number; output_tokens: number } | null;
  latencyMs: number | null;
};

async function runMethod(monumentId: string, mode: "rag" | "norag", model: string): Promise<EvalItem[]> {
  process.env.CLAUDE_MODEL = model;
  const fragments = mode === "rag" ? retrieve(monumentId, undefined, 4) : [];
  const d = await draft({ monumentId, fragments, nQuestions: PER_MONUMENT, nStories: 0, mode });
  verifyBatch(d.batchId);
  const judged = await judgeBatch(d.batchId);
  return judged
    .filter((i) => i.kind === "question")
    .map((i) => {
      const p = i.payload as Record<string, unknown>;
      return {
        id: i.id,
        method: `${mode === "rag" ? "Con RAG + cita" : "Sin RAG"} · ${model}`,
        model,
        monumentId,
        prompt: String(p.prompt_es),
        options: (p.options_es as string[]) ?? [],
        answer: Number(p.answer),
        type: String(p.type),
        explanation: String(p.explanation_es),
        evidenceQuote: i.evidenceQuote,
        status: i.status,
        reason: i.reason,
        judgeReason: i.judgeReason,
        usage: i.usage,
        latencyMs: i.latencyMs,
      };
    });
}

const main = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const alt = process.env.EVAL_ALT_MODEL;
loadFichas();
const monuments = [...getFichas().fichas.keys()];
const items: EvalItem[] = [];

const plan: ["rag" | "norag", string][] = [["rag", main], ["norag", main], ...(alt ? ([["rag", alt]] as ["rag", string][]) : [])];
for (const m of monuments) {
  for (const [mode, model] of plan) {
    process.stdout.write(`${m} · ${mode} · ${model} … `);
    try {
      const got = await runMethod(m, mode, model);
      items.push(...got);
      console.log(`${got.length} preguntas`);
    } catch (e) {
      console.log(`ERROR: ${e instanceof Error ? e.message : e}`);
    }
  }
}
process.env.CLAUDE_MODEL = main;

fs.mkdirSync(EVAL_DIR, { recursive: true });
fs.writeFileSync(path.join(EVAL_DIR, "generated.json"), JSON.stringify({ generatedAt: new Date().toISOString(), models: { main, alt: alt ?? null }, items }, null, 2));
console.log(`\n${items.length} preguntas guardadas en eval/generated.json.`);
console.log("Siguiente paso: dos personas etiquetan a ciegas en /evidencia/etiquetar y luego se calcula en /evidencia.");

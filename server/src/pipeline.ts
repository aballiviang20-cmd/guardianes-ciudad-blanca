import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { db, now } from "./db";
import { findFragment, getFichas, type Fragment } from "./fichas";
import { checkQuote } from "./verify";

export const PROMPT_VERSION = "v1";
const MODEL = () => process.env.CLAUDE_MODEL || "claude-opus-5-5";
const JUDGE_MODEL = () => process.env.JUDGE_MODEL || MODEL();
const EFFORT = () => (process.env.CLAUDE_EFFORT || "low") as "low" | "medium" | "high";

export class GenerationError extends Error {
  constructor(message: string, public status = 503) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new GenerationError("Falta ANTHROPIC_API_KEY en server/.env: la generación con IA no está disponible.", 503);
  }
  client ??= new Anthropic();
  return client;
}

/** Traduce errores del SDK a mensajes claros para el panel docente (nunca se cuelga la UI). */
function toGenerationError(err: unknown): GenerationError {
  if (err instanceof GenerationError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new GenerationError("La API key de Claude no es válida.", 503);
  if (err instanceof Anthropic.RateLimitError) return new GenerationError("Límite de uso de la API alcanzado. Intenta en un minuto.", 503);
  if (err instanceof Anthropic.APIConnectionError) return new GenerationError("Sin conexión con la API de Claude.", 503);
  if (err instanceof Anthropic.APIError) return new GenerationError(`Error de la API de Claude (${err.status ?? "?"}).`, 503);
  return new GenerationError(err instanceof Error ? err.message : "Error desconocido al generar.", 500);
}

// ---------- Esquemas de salida estructurada ----------

const QuestionSchema = z.object({
  type: z.enum(["mcq", "tf", "order"]),
  prompt_es: z.string(),
  prompt_en: z.string(),
  options_es: z.array(z.string()),
  options_en: z.array(z.string()),
  answer: z.number().int(),
  explanation_es: z.string(),
  explanation_en: z.string(),
  juvenil_es: z.string(),
  evidence_quote: z.string(),
  fragment_id: z.string(),
});

const StorySchema = z.object({
  title_es: z.string(),
  title_en: z.string(),
  text_es: z.string(),
  text_en: z.string(),
  evidence_quote: z.string(),
  fragment_id: z.string(),
});

const DraftSchema = z.object({ questions: z.array(QuestionSchema), stories: z.array(StorySchema) });
const JudgeSchema = z.object({
  verdicts: z.array(z.object({ id: z.string(), supported: z.boolean(), reason: z.string() })),
});

export type DraftQuestion = z.infer<typeof QuestionSchema>;
export type DraftStory = z.infer<typeof StorySchema>;

const SYSTEM_DRAFT = `Eres un diseñador de contenido educativo para "Guardianes de la Ciudad Blanca", una app para estudiantes de secundaria (13 a 17 años) de Sucre, Bolivia.
Reglas obligatorias:
1. Usa SOLO la información de los fragmentos que se te entregan. No agregues fechas, nombres ni datos que no estén escritos ahí.
2. Cada pregunta e historia debe incluir "evidence_quote": una frase COPIADA LITERALMENTE (carácter por carácter, de al menos 6 palabras) del fragmento que la respalda, y "fragment_id" con el id exacto de ese fragmento.
3. Tipos de pregunta:
   - "mcq": 3 o 4 opciones; "answer" es el índice (desde 0) de la opción correcta.
   - "tf": options_es = ["Verdadero","Falso"], options_en = ["True","False"]; "answer" 0 si es verdadero, 1 si es falso.
   - "order": 3 o 4 hechos escritos EN EL ORDEN CRONOLÓGICO CORRECTO (la app los desordena); "answer" = -1. Úsalo solo si los fragmentos tienen al menos 3 hechos con fecha.
4. "explanation_es": 1 o 2 oraciones claras. "juvenil_es": la misma explicación en lenguaje cercano para un chico de 14 años, sin memes ni burlas sobre personas históricas, sin cambiar el dato.
5. Historias: 1 a 3 oraciones, con un gancho de curiosidad al inicio. Máximo 280 caracteres.
6. Si una afirmación es discutida, atribúyela ("según...", "conocido en Bolivia como...").
7. Las versiones en inglés deben ser traducciones fieles.`;

function fragmentsBlock(fragments: Fragment[]) {
  return fragments.map((f) => `<fragmento id="${f.id}">\n${f.text}\n</fragmento>`).join("\n");
}

type Usage = { input_tokens: number; output_tokens: number };

export type ItemRow = {
  id: string;
  batch_id: string;
  monument_id: string;
  kind: "question" | "story";
  mode: string;
  payload: string;
  evidence_quote: string | null;
  fragment_id: string | null;
  status: string;
  reason: string | null;
  judge_reason: string | null;
  model: string | null;
  prompt_version: string | null;
  usage: string | null;
  latency_ms: number | null;
  reviewer: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToItem(r: ItemRow) {
  return {
    id: r.id,
    batchId: r.batch_id,
    monumentId: r.monument_id,
    kind: r.kind,
    mode: r.mode,
    payload: JSON.parse(r.payload),
    evidenceQuote: r.evidence_quote,
    fragmentId: r.fragment_id,
    fragmentText: r.fragment_id ? findFragment(r.fragment_id)?.text ?? null : null,
    status: r.status,
    reason: r.reason,
    judgeReason: r.judge_reason,
    model: r.model,
    promptVersion: r.prompt_version,
    usage: r.usage ? (JSON.parse(r.usage) as Usage) : null,
    latencyMs: r.latency_ms,
    reviewer: r.reviewer,
    createdAt: r.created_at,
  };
}

export function itemsOfBatch(batchId: string) {
  const rows = db.prepare("SELECT * FROM items WHERE batch_id = ? ORDER BY kind DESC, created_at").all(batchId) as ItemRow[];
  return rows.map(rowToItem);
}

/** Etapa 2: borrador con IA. mode "norag" = sin fragmentos (línea base para la evaluación). */
export async function draft(opts: {
  monumentId: string;
  fragments: Fragment[];
  nQuestions: number;
  nStories: number;
  mode: "rag" | "norag";
  level?: "4to" | "6to";
  difficulty?: "facil" | "medio" | "dificil";
}) {
  const ficha = getFichas().fichas.get(opts.monumentId);
  const name = ficha?.title ?? opts.monumentId;
  // Adaptación al curso: vocabulario, tipo de pregunta y largo del relato según nivel y dificultad.
  const LEVEL = {
    "4to": "Curso: 4to de secundaria (14-15 años). Oraciones cortas, vocabulario cotidiano; explica cualquier palabra técnica. Historias de máximo 3 oraciones.",
    "6to": "Curso: 6to de secundaria (16-17 años). Puedes usar vocabulario histórico (cabildo, audiencia, barroco) y pedir relaciones de causa y consecuencia. Historias de 4 a 5 oraciones.",
  } as const;
  const DIFF = {
    facil: "Dificultad FÁCIL: prioriza verdadero/falso y opción múltiple con distractores claramente distintos.",
    medio: "Dificultad MEDIA: mezcla opción múltiple, verdadero/falso y alguna de ordenar.",
    dificil: "Dificultad DIFÍCIL: prioriza ordenar hechos en el tiempo y opción múltiple con distractores cercanos (años o lugares parecidos), siempre respaldados por la cita.",
  } as const;
  const adapt = [opts.level ? LEVEL[opts.level] : "", opts.difficulty ? DIFF[opts.difficulty] : ""].filter(Boolean).join(" ");
  const userPromptBase =
    opts.mode === "rag"
      ? `Monumento: ${name}\nFragmentos disponibles:\n${fragmentsBlock(opts.fragments)}\n\nGenera ${opts.nQuestions} preguntas (mezcla de tipos) y ${opts.nStories} historias.`
      : `Monumento: ${name} (Sucre, Bolivia). No tienes fragmentos: usa tu conocimiento general. En evidence_quote escribe la frase en la que te basas y en fragment_id escribe "ninguno".\n\nGenera ${opts.nQuestions} preguntas (mezcla de tipos) y ${opts.nStories} historias.`;
  const userPrompt = adapt ? `${userPromptBase}\n\n${adapt}` : userPromptBase;

  const started = Date.now();
  let parsed: z.infer<typeof DraftSchema> | null;
  let usage: Usage;
  try {
    const response = await getClient().messages.parse({
      model: MODEL(),
      max_tokens: 16000,
      system: SYSTEM_DRAFT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { effort: EFFORT(), format: zodOutputFormat(DraftSchema) },
    });
    if (response.stop_reason === "refusal") throw new GenerationError("El modelo rechazó la solicitud.", 422);
    parsed = response.parsed_output;
    usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
  } catch (err) {
    throw toGenerationError(err);
  }
  if (!parsed) throw new GenerationError("La respuesta del modelo no tuvo el formato esperado.", 502);
  const latency = Date.now() - started;

  const batchId = randomUUID();
  const total = parsed.questions.length + parsed.stories.length || 1;
  // El uso de tokens se reparte entre los ítems del lote para poder calcular costo por ítem.
  const perItem: Usage = {
    input_tokens: Math.round(usage.input_tokens / total),
    output_tokens: Math.round(usage.output_tokens / total),
  };
  const insert = db.prepare(`INSERT INTO items
    (id, batch_id, monument_id, kind, mode, payload, evidence_quote, fragment_id, status, model, prompt_version, usage, latency_ms, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`);
  const t = now();
  for (const q of parsed.questions) {
    const { evidence_quote, fragment_id, ...payload } = q;
    insert.run(randomUUID(), batchId, opts.monumentId, "question", opts.mode, JSON.stringify(payload), evidence_quote, fragment_id,
      MODEL(), PROMPT_VERSION, JSON.stringify(perItem), Math.round(latency / total), t, t);
  }
  for (const s of parsed.stories) {
    const { evidence_quote, fragment_id, ...payload } = s;
    insert.run(randomUUID(), batchId, opts.monumentId, "story", opts.mode, JSON.stringify(payload), evidence_quote, fragment_id,
      MODEL(), PROMPT_VERSION, JSON.stringify(perItem), Math.round(latency / total), t, t);
  }
  return { batchId, usage, latencyMs: latency, items: itemsOfBatch(batchId) };
}

/** Etapa 3: chequeo de cita por código (sin IA). */
export function verifyBatch(batchId: string) {
  const update = db.prepare("UPDATE items SET status = ?, reason = ?, updated_at = ? WHERE id = ?");
  for (const item of itemsOfBatch(batchId)) {
    if (item.status !== "draft") continue;
    if (item.mode === "norag") {
      // La línea base no tiene fragmentos: no puede pasar el chequeo, pero se conserva para la evaluación.
      update.run("verified", "sin_fragmento", now(), item.id);
      continue;
    }
    const check = checkQuote(item.evidenceQuote, item.fragmentText);
    if (check.ok) update.run("verified", null, now(), item.id);
    else update.run("rejected", check.reason, now(), item.id);
  }
  return itemsOfBatch(batchId);
}

/** Etapa 4: juez con IA. ¿La cita respalda la respuesta? */
export async function judgeBatch(batchId: string) {
  const toJudge = itemsOfBatch(batchId).filter((i) => i.status === "verified");
  if (toJudge.length === 0) return itemsOfBatch(batchId);

  const blocks = toJudge
    .map((i) => {
      const p = i.payload as Record<string, unknown>;
      const answerText =
        i.kind === "question"
          ? (p.type === "order"
              ? `Orden correcto: ${(p.options_es as string[]).join(" → ")}`
              : `Respuesta: ${(p.options_es as string[])[p.answer as number] ?? "?"}`)
          : `Historia: ${p.text_es}`;
      const content = i.kind === "question" ? `Pregunta: ${p.prompt_es}\n${answerText}\nExplicación: ${p.explanation_es}` : answerText;
      return `<item id="${i.id}">\n${content}\nCita: "${i.evidenceQuote ?? ""}"\nFragmento: ${i.fragmentText ?? "(ninguno)"}\n</item>`;
    })
    .join("\n");

  let verdicts: z.infer<typeof JudgeSchema>["verdicts"] = [];
  try {
    const response = await getClient().messages.parse({
      model: JUDGE_MODEL(),
      max_tokens: 8000,
      system:
        "Eres un verificador de hechos estricto. Para cada ítem decide si el FRAGMENTO respalda completamente la respuesta (y la explicación). Si el ítem afirma algo que el fragmento no dice, supported=false. Si no hay fragmento, supported=false. Responde un veredicto por cada id, con un motivo breve en español.",
      messages: [{ role: "user", content: blocks }],
      output_config: { effort: EFFORT(), format: zodOutputFormat(JudgeSchema) },
    });
    if (response.stop_reason === "refusal") throw new GenerationError("El juez rechazó la solicitud.", 422);
    verdicts = response.parsed_output?.verdicts ?? [];
  } catch (err) {
    throw toGenerationError(err);
  }

  const update = db.prepare("UPDATE items SET status = ?, reason = ?, judge_reason = ?, updated_at = ? WHERE id = ?");
  for (const item of toJudge) {
    const v = verdicts.find((x) => x.id === item.id);
    if (!v) update.run("pending", null, "El juez no devolvió veredicto: revisar a mano.", now(), item.id);
    else if (v.supported) update.run("pending", item.reason, v.reason, now(), item.id);
    else update.run("rejected", "juez", v.reason, now(), item.id);
  }
  return itemsOfBatch(batchId);
}

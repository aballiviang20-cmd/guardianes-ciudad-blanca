import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, teacherApi } from "../api";
import { Button } from "../components/ui";

type MethodRow = { method: string; n: number; correct: number; incorrect: number; doubtful: number; accuracy: number };
type Results = {
  available: boolean;
  generatedAt?: string;
  models?: Record<string, string>;
  methods?: MethodRow[];
  pipeline?: { total: number; rejectedByQuote: number; rejectedByJudge: number; passed: number };
  kappa?: number | null;
  judge?: { precision: number | null; recall: number | null; n: number };
  cost?: { model: string; usdPerQuestion: number; avgLatencyMs: number }[];
  classifier?: { accuracy: number; classes: string[]; matrix: number[][]; falsePositiveOther: number } | null;
  teacher?: { manualMinPerQuestion: number | null; assistedMinPerQuestion: number | null; note?: string };
  notes?: string[];
};

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/** Página de evidencia: muestra eval/results.json, generado por los scripts de evaluación del repo. */
export function EvidencePage() {
  const [r, setR] = useState<Results | null>(null);
  useEffect(() => {
    api.evidence().then((x) => setR(x as Results)).catch(() => setR({ available: false }));
  }, []);

  return (
    <div className="evidence-page">
      <header>
        <h1>Evidencia</h1>
        <p>Resultados medidos con el pipeline real y etiquetado humano a ciegas. Generado por <code>npm run eval</code>.</p>
        <div className="row-gap">
          <Link to="/docente">← Panel docente</Link>
          <Link to="/evidencia/etiquetar">Etiquetar a ciegas</Link>
          <Button variant="secondary" onClick={() => teacherApi(sessionStorage.getItem("teacher-pin") ?? "").post("/eval/score").then((x) => setR({ available: true, ...(x as object) })).catch(() => alert("Entra primero al panel docente con el PIN"))}>Recalcular</Button>
        </div>
      </header>
      {!r && <p>Cargando…</p>}
      {r && !r.available && (
        <div className="card">
          <h3>Aún no hay resultados</h3>
          <ol>
            <li>
              <code>npm run eval</code> genera 15 preguntas con RAG + cita y 15 sin RAG, y exporta <code>eval/blind.csv</code> sin la columna de método.
            </li>
            <li>Dos personas etiquetan por separado: correcta / incorrecta / dudosa.</li>
            <li>
              <code>npm run eval:score --prefix server</code> calcula las métricas y escribe <code>eval/results.json</code>.
            </li>
          </ol>
        </div>
      )}
      {r?.available && (
        <motion.div className="evidence-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {r.methods && (
            <div className="card wide">
              <h3>Con RAG + cita vs sin RAG (mismos monumentos)</h3>
              {r.methods.map((m, i) => (
                <div key={m.method} className="bar-row">
                  <span>
                    {m.method} (n={m.n})
                  </span>
                  <div className="bar">
                    <motion.span initial={{ width: 0 }} animate={{ width: pct(m.accuracy) }} transition={{ delay: 0.2 + i * 0.2, type: "spring", stiffness: 60 }} />
                  </div>
                  <b>{pct(m.accuracy)}</b>
                </div>
              ))}
            </div>
          )}
          {r.pipeline && (
            <div className="card">
              <h3>Filtros del pipeline</h3>
              <p>Generadas: <b>{r.pipeline.total}</b></p>
              <p>Rechazadas por chequeo de cita: <b>{r.pipeline.rejectedByQuote}</b></p>
              <p>Rechazadas por el juez: <b>{r.pipeline.rejectedByJudge}</b></p>
              <p>Llegan al docente: <b>{r.pipeline.passed}</b></p>
            </div>
          )}
          <div className="card">
            <h3>Fiabilidad</h3>
            <p>Concordancia entre etiquetadores (kappa de Cohen): <b>{r.kappa == null ? "—" : r.kappa.toFixed(2)}</b></p>
            {r.judge && (
              <p>
                Juez vs humanos: precisión <b>{pct(r.judge.precision)}</b> · recall <b>{pct(r.judge.recall)}</b> (n={r.judge.n})
              </p>
            )}
          </div>
          {r.cost && (
            <div className="card">
              <h3>Costo y latencia</h3>
              {r.cost.map((c) => (
                <p key={c.model}>
                  <code>{c.model}</code>: US$ {c.usdPerQuestion.toFixed(4)} por pregunta · {(c.avgLatencyMs / 1000).toFixed(1)} s
                </p>
              ))}
            </div>
          )}
          {r.teacher && (
            <div className="card">
              <h3>Tiempo del docente</h3>
              <p>A mano: <b>{r.teacher.manualMinPerQuestion ?? "—"}</b> min/pregunta</p>
              <p>Revisando lo generado: <b>{r.teacher.assistedMinPerQuestion ?? "—"}</b> min/pregunta</p>
              {r.teacher.note && <small>{r.teacher.note}</small>}
            </div>
          )}
          {r.classifier && (
            <div className="card">
              <h3>Reconocimiento en el celular</h3>
              <p>Precisión: <b>{pct(r.classifier.accuracy)}</b> · falsos positivos en "otro": <b>{pct(r.classifier.falsePositiveOther)}</b></p>
            </div>
          )}
          {r.notes && (
            <div className="card wide">
              <h3>Límites y notas</h3>
              <ul>
                {r.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

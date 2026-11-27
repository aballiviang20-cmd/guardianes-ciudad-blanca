import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../api";
import { Button } from "../components/ui";
import { snappy } from "../motion";

type BlindItem = { id: string; monumentId: string; prompt: string; options: string[]; answer: number; type: string; explanation: string; label: string | null };
type Label = "correcta" | "incorrecta" | "dudosa";

/** Etiquetado a ciegas: el etiquetador no sabe si la pregunta vino con RAG o sin RAG. Teclas 1, 2, 3. */
export function LabelPage() {
  const pin = sessionStorage.getItem("teacher-pin") ?? "";
  const [who, setWho] = useState(() => sessionStorage.getItem("label-who") ?? "");
  const [started, setStarted] = useState(false);
  const [items, setItems] = useState<BlindItem[]>([]);
  const [fichas, setFichas] = useState<Record<string, string>>({});
  const [i, setI] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    teacherApi(pin)
      .get<{ items: BlindItem[]; fichas: Record<string, string> }>(`/eval/blind?who=${who}`)
      .then((r) => {
        setItems(r.items);
        setFichas(r.fichas);
        setI(Math.max(0, r.items.findIndex((x) => !x.label)));
        setStarted(true);
      })
      .catch((e) => setError(e.message));
  }, [pin, who]);

  const label = useCallback(
    async (l: Label) => {
      const it = items[i];
      if (!it) return;
      await teacherApi(pin).post("/eval/label", { who, id: it.id, label: l });
      setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, label: l } : x)));
      setI((n) => Math.min(n + 1, items.length));
    },
    [items, i, pin, who],
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") void label("correcta");
      if (e.key === "2") void label("incorrecta");
      if (e.key === "3") void label("dudosa");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, label]);

  if (!pin) {
    return (
      <div className="evidence-page">
        <p>Primero entra al <Link to="/docente">panel docente</Link> con el PIN.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="evidence-page label-start">
        <h1>Etiquetado a ciegas</h1>
        <p>Compara cada pregunta con la ficha. No sabrás con qué método se generó.</p>
        <div className="row-gap">
          {["p3", "p4"].map((w) => (
            <button key={w} className={`chip-btn ${who === w ? "on" : ""}`} onClick={() => { setWho(w); sessionStorage.setItem("label-who", w); }}>
              Etiquetador {w.toUpperCase()}
            </button>
          ))}
        </div>
        <Button disabled={!who} onClick={load}>Empezar</Button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const it = items[i];
  const done = items.filter((x) => x.label).length;
  return (
    <div className="evidence-page label-page">
      <header className="label-head">
        <h1>Etiquetador {who.toUpperCase()}</h1>
        <span className="count-pill">
          {done}
          <small>/{items.length}</small>
        </span>
        <Link to="/evidencia">Ver evidencia</Link>
      </header>
      {items.length === 0 && <p>No hay preguntas generadas. Corre <code>npm run eval --prefix server</code> (requiere API key).</p>}
      <AnimatePresence mode="wait">
        {it ? (
          <motion.div key={it.id} className="label-grid" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={snappy}>
            <div className="card">
              <span className="badge">{it.monumentId}</span>
              <h3>{it.prompt}</h3>
              <ol className="item-options">
                {it.options.map((o, k) => (
                  <li key={k} className={it.type !== "order" && k === it.answer ? "right" : ""}>{o}</li>
                ))}
              </ol>
              <p className="item-expl">{it.explanation}</p>
              <div className="label-buttons">
                <Button variant="success" onClick={() => label("correcta")}>1 · Correcta</Button>
                <Button variant="danger" onClick={() => label("incorrecta")}>2 · Incorrecta</Button>
                <Button variant="secondary" onClick={() => label("dudosa")}>3 · Dudosa</Button>
              </div>
              <div className="row-gap">
                <button className="link" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
                {it.label && <span className="badge">Marcada: {it.label}</span>}
              </div>
            </div>
            <div className="card ficha-ref">
              <h3>Ficha de referencia</h3>
              <p>{fichas[it.monumentId] ?? "(sin ficha)"}</p>
            </div>
          </motion.div>
        ) : (
          items.length > 0 && (
            <motion.div key="done" className="card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <h3>¡Listo! Etiquetaste {done} preguntas.</h3>
              <p>Cuando el otro etiquetador termine, calcula las métricas en <Link to="/evidencia">Evidencia</Link>.</p>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

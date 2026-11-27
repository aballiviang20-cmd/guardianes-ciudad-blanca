import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../api";
import { CharFace, CharPose } from "../components/Character";
import { MonumentIcon } from "../components/MonumentIcon";
import { Button } from "../components/ui";
import type { LeagueCourse } from "../types";

type Item = {
  id: string;
  batchId: string;
  monumentId: string;
  kind: "question" | "story";
  mode: string;
  payload: Record<string, unknown>;
  evidenceQuote: string | null;
  fragmentId: string | null;
  fragmentText: string | null;
  status: string;
  reason: string | null;
  judgeReason: string | null;
  model: string | null;
  usage: { input_tokens: number; output_tokens: number } | null;
  latencyMs: number | null;
};
type Fragment = { id: string; text: string; score: number };
type Monument = { id: string; name: { es: string }; color: string; hasFicha: boolean; fichaDraft: boolean };
type Report = { id: string; course: string; monument_id: string | null; kind: string; damage_type: string | null; text: string; created_at: string };

const REASONS: Record<string, string> = {
  cita_inexistente: "Cita inexistente en la ficha",
  cita_muy_corta: "Cita demasiado corta",
  cita_vacia: "Sin cita",
  fragmento_inexistente: "Fragmento inexistente",
  juez: "El juez la rechazó",
  docente: "Rechazada por docente",
};

/** Resalta la cita literal dentro del fragmento original. */
function Highlight({ text, quote }: { text: string | null; quote: string | null }) {
  if (!text) return <em>(sin fragmento)</em>;
  if (!quote) return <>{text}</>;
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = norm(quote).replace(/[.,;:]+$/, "").trim();
  const i = norm(text).indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function ItemCard({ item, actions }: { item: Item; actions?: React.ReactNode }) {
  const p = item.payload as Record<string, string | string[] | number>;
  const isQ = item.kind === "question";
  const options = (p.options_es as string[]) ?? [];
  return (
    <motion.article
      layout
      className={`item-card status-${item.status}`}
      initial={{ opacity: 0, y: 14 }}
      animate={item.status === "rejected" ? { opacity: 0.75, y: 0, x: [0, -6, 6, 0] } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80 }}
    >
      <header>
        <span className={`badge kind-${item.kind}`}>{isQ ? `Pregunta · ${p.type}` : "Historia"}</span>
        <span className={`badge st-${item.status}`}>{item.status}</span>
        {item.reason && <span className="badge st-rejected">{REASONS[item.reason] ?? item.reason}</span>}
      </header>
      {isQ ? (
        <>
          <h4>{p.prompt_es as string}</h4>
          <ol className={`item-options ${p.type === "order" ? "ordered" : ""}`}>
            {options.map((o, i) => (
              <li key={i} className={p.type !== "order" && i === p.answer ? "right" : ""}>
                {o}
              </li>
            ))}
          </ol>
          <p className="item-expl">{p.explanation_es as string}</p>
          {p.juvenil_es && <p className="item-expl juv">Juvenil · {p.juvenil_es as string}</p>}
        </>
      ) : (
        <>
          <h4>{p.title_es as string}</h4>
          <p>{p.text_es as string}</p>
        </>
      )}
      <details>
        <summary>English</summary>
        <p>{(isQ ? p.prompt_en : p.title_en) as string}</p>
        <p>{(isQ ? p.explanation_en : p.text_en) as string}</p>
      </details>
      <div className="evidence">
        <span className="evidence-label">Fuente · {item.fragmentId}</span>
        <p>
          <Highlight text={item.fragmentText} quote={item.evidenceQuote} />
        </p>
        {item.judgeReason && <p className="judge">Juez: {item.judgeReason}</p>}
      </div>
      {actions && <footer>{actions}</footer>}
    </motion.article>
  );
}

type StageState = "idle" | "run" | "ok" | "err";
const STAGES = [
  { key: "retrieve", title: "1. Recuperar", sub: "BM25 elige fragmentos de la ficha", ai: false },
  { key: "draft", title: "2. Borrador IA", sub: "Claude genera con cita obligatoria", ai: true },
  { key: "verify", title: "3. Chequeo de cita", sub: "El código busca la cita literal", ai: false },
  { key: "judge", title: "4. Juez IA", sub: "¿La cita respalda la respuesta?", ai: true },
] as const;

function Generate({ pin, onDone }: { pin: string; onDone: () => void }) {
  const api = teacherApi(pin);
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [monumentId, setMonumentId] = useState("casa-libertad");
  const [topic, setTopic] = useState("");
  const [nQ, setNQ] = useState(3);
  const [nS, setNS] = useState(1);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<{ latencyMs: number; usage: { input_tokens: number; output_tokens: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = Object.values(stages).includes("run");

  useEffect(() => {
    fetch("/api/monuments").then((r) => r.json()).then(setMonuments).catch(() => {});
  }, []);

  async function run() {
    setError(null);
    setItems([]);
    setFragments([]);
    setMeta(null);
    setStages({ retrieve: "run" });
    try {
      const r = await api.post<{ fragments: Fragment[] }>("/generate/retrieve", { monumentId, topic });
      setFragments(r.fragments);
      setStages({ retrieve: "ok", draft: "run" });
      const d = await api.post<{ batchId: string; items: Item[]; latencyMs: number; usage: { input_tokens: number; output_tokens: number } }>(
        "/generate/draft",
        { monumentId, fragmentIds: r.fragments.map((f) => f.id), nQuestions: nQ, nStories: nS },
      );
      setItems(d.items);
      setMeta({ latencyMs: d.latencyMs, usage: d.usage });
      setStages({ retrieve: "ok", draft: "ok", verify: "run" });
      const v = await api.post<{ items: Item[] }>("/generate/verify", { batchId: d.batchId });
      setItems(v.items);
      setStages({ retrieve: "ok", draft: "ok", verify: "ok", judge: "run" });
      const j = await api.post<{ items: Item[] }>("/generate/judge", { batchId: d.batchId });
      setItems(j.items);
      setStages({ retrieve: "ok", draft: "ok", verify: "ok", judge: "ok" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setStages((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === "run" ? "err" : v])));
    }
  }

  const pending = items.filter((i) => i.status === "pending").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="gen">
      <div className="gen-form card">
        <h3>Generar lección con IA</h3>
        <div className="chips">
          {monuments.map((m) => (
            <button key={m.id} disabled={!m.hasFicha} className={`chip-btn ${monumentId === m.id ? "on" : ""}`} style={{ ["--accent" as string]: m.color }} onClick={() => setMonumentId(m.id)}>
              <MonumentIcon id={m.id} size={20} /> {m.name.es} {!m.hasFicha && "· sin ficha"}
              {m.fichaDraft && " · borrador"}
            </button>
          ))}
        </div>
        <div className="gen-row">
          <label>
            Tema (opcional)
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ej. independencia, arquitectura" />
          </label>
          <label>
            Preguntas
            <select value={nQ} onChange={(e) => setNQ(Number(e.target.value))}>
              {[2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Historias
            <select value={nS} onChange={(e) => setNS(Number(e.target.value))}>
              {[0, 1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? "Generando…" : "Generar con IA"}
        </Button>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="stages">
        {STAGES.map((s, i) => {
          const st = stages[s.key] ?? "idle";
          return (
            <motion.div key={s.key} className={`stage ${st} ${s.ai ? "ai" : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <span className="stage-dot">
                {st === "run" ? <motion.span className="spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} /> : st === "ok" ? "✓" : st === "err" ? "!" : i + 1}
              </span>
              <div>
                <b>{s.title}</b> <span className={`tag ${s.ai ? "tag-ai" : "tag-code"}`}>{s.ai ? "IA" : "Código"}</span>
                <small>{s.sub}</small>
              </div>
            </motion.div>
          );
        })}
      </div>

      {fragments.length > 0 && (
        <div className="fragments">
          {fragments.map((f, i) => (
            <motion.div key={f.id} className="fragment" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
              <b>{f.id}</b> <span className="score">BM25 {f.score}</span>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      )}

      {meta && (
        <p className="gen-meta">
          {(meta.latencyMs / 1000).toFixed(1)} s · {meta.usage.input_tokens} tokens entrada · {meta.usage.output_tokens} salida · {pending} pendientes · {rejected} rechazados
        </p>
      )}

      <div className="items">
        <AnimatePresence>
          {items.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </AnimatePresence>
      </div>
      {stages.judge === "ok" && pending > 0 && (
        <Button variant="success" onClick={onDone}>
          Revisar {pending} pendientes →
        </Button>
      )}
    </div>
  );
}

function Review({ pin }: { pin: string }) {
  const api = teacherApi(pin);
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = () => api.get<{ items: Item[] }>("/items?status=pending").then((r) => setItems(r.items));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (it: Item) => {
    await api.post(`/items/${it.id}/approve`, { reviewer: "docente-demo", payload: editing === it.id ? draft : undefined });
    setEditing(null);
    setItems((xs) => xs.filter((x) => x.id !== it.id));
  };
  const reject = async (it: Item) => {
    await api.post(`/items/${it.id}/reject`, { reviewer: "docente-demo" });
    setItems((xs) => xs.filter((x) => x.id !== it.id));
  };

  return (
    <div className="items">
      {items.length === 0 && (
        <div className="empty-state">
          <CharFace c="orki" face="alegre" size={90} anim="pop" />
          <p>No hay nada pendiente. Todo lo publicado pasó por revisión humana.</p>
        </div>
      )}
      <AnimatePresence>
        {items.map((it) => (
          <ItemCard
            key={it.id}
            item={it}
            actions={
              <>
                {editing === it.id ? (
                  <div className="edit-box">
                    {Object.keys(draft).map((k) => (
                      <label key={k}>
                        {k}
                        <textarea value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} rows={2} />
                      </label>
                    ))}
                  </div>
                ) : null}
                <Button variant="success" onClick={() => approve(it)}>
                  Aprobar{editing === it.id ? " cambios" : ""}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const p = it.payload as Record<string, string>;
                    setEditing(it.id);
                    setDraft(
                      it.kind === "question"
                        ? { prompt_es: p.prompt_es, explanation_es: p.explanation_es, juvenil_es: p.juvenil_es }
                        : { title_es: p.title_es, text_es: p.text_es },
                    );
                  }}
                >
                  Editar
                </Button>
                <Button variant="danger" onClick={() => reject(it)}>
                  Rechazar
                </Button>
              </>
            }
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Reports({ pin }: { pin: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    const api = teacherApi(pin);
    const load = () => api.get<{ reports: Report[] }>("/reports").then((r) => setReports(r.reports)).catch(() => {});
    void load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [pin]);
  return (
    <div className="reports">
      {reports.length === 0 && <p className="empty">Sin reportes todavía.</p>}
      <AnimatePresence>
        {reports.map((r) => (
          <motion.div key={r.id} layout className={`report ${r.kind}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="badge">{r.kind === "dano" ? `Daño · ${r.damage_type}` : "Error de contenido"}</span>
            <b>{r.course}</b> · {r.monument_id} · <small>{new Date(r.created_at).toLocaleTimeString()}</small>
            <p>{r.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Progress({ pin }: { pin: string }) {
  const [stats, setStats] = useState<{ byStatus: { status: string; reason: string | null; n: number }[]; mostFailed: { questionId: string; fails: number; prompt: string }[]; league: LeagueCourse[] } | null>(null);
  useEffect(() => {
    teacherApi(pin).get<NonNullable<typeof stats>>("/stats").then(setStats).catch(() => {});
  }, [pin]);
  if (!stats) return null;
  return (
    <div className="progress-grid">
      <div className="card">
        <h3>Liga de cursos</h3>
        {stats.league.map((c) => (
          <p key={c.course}>
            <b>{c.course}</b>: {c.xp} XP · {c.members} alumnos · {c.lessons} retos · {c.reports} reportes
          </p>
        ))}
      </div>
      <div className="card">
        <h3>Preguntas más falladas</h3>
        {stats.mostFailed.length === 0 && <p>Sin datos aún.</p>}
        {stats.mostFailed.map((f) => (
          <p key={f.questionId}>
            {f.fails} fallos · · {f.prompt}
          </p>
        ))}
      </div>
      <div className="card">
        <h3>Contenido por estado</h3>
        {stats.byStatus.map((s, i) => (
          <p key={i}>
            {s.status} {s.reason ? `(${REASONS[s.reason] ?? s.reason})` : ""}: <b>{s.n}</b>
          </p>
        ))}
      </div>
    </div>
  );
}

export function TeacherPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("teacher-pin") ?? "");
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState<"gen" | "rev" | "rep" | "prog">("gen");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!pin) return;
    teacherApi(pin)
      .get("/items?status=pending")
      .then(() => {
        setOk(true);
        sessionStorage.setItem("teacher-pin", pin);
      })
      .catch(() => setOk(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ok) {
    return (
      <div className="teacher-login">
        <CharPose c="orki" pose="bolivia" size={150} anim="wave" />
        <h1>Panel docente</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            teacherApi(pin)
              .get("/items?status=pending")
              .then(() => {
                sessionStorage.setItem("teacher-pin", pin);
                setOk(true);
              })
              .catch(() => setErr("PIN incorrecto"));
          }}
        >
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
          <Button type="submit">Entrar</Button>
          {err && <p className="error">{err}</p>}
        </form>
        <Link to="/">← App del alumno</Link>
      </div>
    );
  }

  const tabs = [
    { k: "gen", label: "Generar" },
    { k: "rev", label: "Revisar" },
    { k: "rep", label: "Reportes" },
    { k: "prog", label: "Progreso" },
  ] as const;

  return (
    <div className="teacher">
      <header className="teacher-head">
        <div>
          <h1>Panel docente</h1>
          <p>Solo lo que usted aprueba llega a sus estudiantes.</p>
        </div>
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>
              {tab === t.k && <motion.span layoutId="tab-pill" className="tab-pill" />}
              <span>{t.label}</span>
            </button>
          ))}
          <Link to="/evidencia" className="tab-link">
            Evidencia
          </Link>
          <Link to="/entrenar" className="tab-link">
            Cámara
          </Link>
          <Link to="/carteles" className="tab-link">
            Carteles QR
          </Link>
        </nav>
      </header>
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "gen" && <Generate pin={pin} onDone={() => setTab("rev")} />}
        {tab === "rev" && <Review pin={pin} />}
        {tab === "rep" && <Reports pin={pin} />}
        {tab === "prog" && <Progress pin={pin} />}
      </motion.div>
    </div>
  );
}

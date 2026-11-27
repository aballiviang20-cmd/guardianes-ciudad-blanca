import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../api";
import { CharFace, CharPose } from "../components/Character";
import { MonumentIcon } from "../components/MonumentIcon";
import { Button, CountUp } from "../components/ui";
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
  { key: "retrieve", title: "Busca en sus fuentes", sub: "Elige los párrafos más útiles de la ficha (BM25)", ai: false },
  { key: "draft", title: "La IA escribe", sub: "Claude arma preguntas con una cita obligatoria", ai: true },
  { key: "verify", title: "Revisa la cita", sub: "El código confirma que la cita existe tal cual", ai: false },
  { key: "judge", title: "Segunda opinión", sub: "Otra IA comprueba que la cita respalda la respuesta", ai: true },
] as const;

/** Orki explica cada paso en una frase, para que nadie se pierda. */
function Guide({ children, face = "alegre" }: { children: React.ReactNode; face?: "alegre" | "pensativo" | "sorprendido" }) {
  return (
    <div className="t-guide">
      <CharFace c="orki" face={face} size={74} anim="idle" />
      <motion.div className="t-bubble" initial={{ opacity: 0, x: -10, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        {children}
      </motion.div>
    </div>
  );
}

type Place = { id: string; name: string; color: string; sources: string[]; fragments: number; draft: boolean };

function Upload({ pin, onSaved }: { pin: string; onSaved: (monumentId: string) => void }) {
  const api = teacherApi(pin);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ letter: string; sentences: number; fragments: number } | null>(null);
  const load = () => api.get<{ places: Place[] }>("/fichas").then((r) => setPlaces(r.places)).catch(() => {});
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length >= 25).length;
  const place = places.find((p) => p.id === placeId);
  const ready = placeId && title.trim().length >= 3 && sentences > 0;

  async function readFile(f: File) {
    if (!/\.(txt|md|csv)$/i.test(f.name)) {
      setError("Por ahora suba archivos de texto (.txt). Si tiene Word o PDF: abra el archivo, copie el texto y péguelo aquí.");
      return;
    }
    setError(null);
    setText((await f.text()).slice(0, 20000));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ letter: string; sentences: number; fragments: number }>(`/fichas/${placeId}/fuente`, { title, text });
      setSaved(r);
      setText("");
      setTitle("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  if (saved && place) {
    return (
      <motion.div className="t-success card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <CharPose c="orki" pose="salta" size={140} anim="jump" pulse={1} />
        <h3>¡Listo! La IA ya aprendió {saved.sentences} datos nuevos de {place.name}</h3>
        <p>
          Quedaron como la fuente <b>[{saved.letter}]</b>. Cada pregunta que salga de ahí lo va a citar.
        </p>
        <div className="t-actions">
          <Button variant="success" onClick={() => onSaved(place.id)}>
            Crear una lección con esto →
          </Button>
          <Button variant="secondary" onClick={() => setSaved(null)}>
            Subir otra cosa
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="t-upload">
      <div className="card t-form">
        <div className="t-q">
          <span className="t-num">1</span>
          <b>¿De qué lugar es?</b>
        </div>
        <div className="t-places">
          {places.map((p) => (
            <motion.button key={p.id} whileTap={{ scale: 0.95 }} className={`t-place ${placeId === p.id ? "on" : ""}`} style={{ ["--accent" as string]: p.color }} onClick={() => setPlaceId(p.id)}>
              <MonumentIcon id={p.id} size={30} />
              <span>{p.name}</span>
            </motion.button>
          ))}
        </div>
        <div className="t-q">
          <span className="t-num">2</span>
          <b>¿De dónde sale la información?</b>
        </div>
        <input className="t-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Libro «Historia de Sucre», página 45" maxLength={200} />
        <div className="t-q">
          <span className="t-num">3</span>
          <b>Pegue el texto o suba un archivo</b>
        </div>
        <textarea className="t-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Copie y pegue aquí párrafos de su libro, apunte o página web confiable…" />
        <div className="t-row">
          <label className="t-file">
            <input type="file" accept=".txt,.md,.csv,text/plain" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            📄 Subir archivo .txt
          </label>
          <span className={`t-count ${sentences ? "ok" : ""}`}>{sentences ? `${sentences} datos listos para la IA` : "Todavía no hay oraciones completas"}</span>
        </div>
        {error && <p className="error">{error}</p>}
        <Button block onClick={save} disabled={!ready || busy}>
          {busy ? "Guardando…" : "Guardar información"}
        </Button>
      </div>
      <div className="card t-known">
        <h3>Lo que la IA ya sabe</h3>
        <p className="t-hint">La IA solo escribe preguntas con estas fuentes. Nada inventado.</p>
        {places.map((p) => (
          <details key={p.id} open={p.id === placeId}>
            <summary style={{ ["--accent" as string]: p.color }}>
              <MonumentIcon id={p.id} size={20} /> {p.name} <small>{p.fragments} párrafos · {p.sources.length} fuentes</small>
            </summary>
            <ul>
              {p.sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

function Generate({ pin, onDone, initialMonument }: { pin: string; onDone: () => void; initialMonument?: string }) {
  const api = teacherApi(pin);
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [monumentId, setMonumentId] = useState(initialMonument ?? "san-lazaro");
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
      const msg = e instanceof Error ? e.message : "Error";
      setError(/ANTHROPIC_API_KEY/.test(msg) ? "La IA todavía no está conectada en este servidor. Pida al encargado técnico que configure la clave (server/.env) y vuelva a intentar." : msg);
      setStages((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v === "run" ? "err" : v])));
    }
  }

  const pending = items.filter((i) => i.status === "pending").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="gen">
      <div className="gen-form card">
        <h3>Elija el lugar y toque «Crear lección»</h3>
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
          {running ? "La IA está trabajando…" : "✨ Crear lección con IA"}
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
        <details className="t-tech">
          <summary>Ver qué párrafos usó la IA (detalle técnico)</summary>
        <div className="fragments">
          {fragments.map((f, i) => (
            <motion.div key={f.id} className="fragment" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
              <b>{f.id}</b> <span className="score">BM25 {f.score}</span>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
        </details>
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
          Siguiente: revisar {pending} {pending === 1 ? "pregunta" : "preguntas"} →
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

  const [confirmAll, setConfirmAll] = useState(false);
  const approveAll = async () => {
    for (const it of items) await api.post(`/items/${it.id}/approve`, { reviewer: "docente-demo" });
    setItems([]);
    setConfirmAll(false);
  };

  return (
    <div className="items">
      {items.length > 1 && (
        <div className="t-bulk card">
          {!confirmAll ? (
            <>
              <span>
                <b>{items.length} por revisar.</b> Todas ya pasaron el control de cita y la segunda opinión.
              </span>
              <Button variant="secondary" onClick={() => setConfirmAll(true)}>
                Aprobar todas
              </Button>
            </>
          ) : (
            <>
              <span>¿Seguro? Se publicarán {items.length} preguntas para sus estudiantes. Le recomendamos leer al menos una.</span>
              <Button variant="success" onClick={approveAll}>
                Sí, aprobar {items.length}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}
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

const STATUS_LABEL: Record<string, { t: string; c: string }> = {
  approved: { t: "Publicadas", c: "var(--verde-ok)" },
  pending: { t: "Por revisar", c: "var(--oro)" },
  rejected: { t: "Rechazadas", c: "var(--rojo)" },
  verified: { t: "En verificación", c: "var(--cielo)" },
  draft: { t: "Borradores", c: "var(--suave)" },
};

function Progress({ pin }: { pin: string }) {
  const [stats, setStats] = useState<{ byStatus: { status: string; reason: string | null; n: number }[]; mostFailed: { questionId: string; fails: number; prompt: string }[]; league: LeagueCourse[] } | null>(null);
  useEffect(() => {
    teacherApi(pin).get<NonNullable<typeof stats>>("/stats").then(setStats).catch(() => {});
  }, [pin]);
  if (!stats) return <div className="tp-loading">Cargando…</div>;
  const failed = stats.mostFailed.filter((f) => f.prompt && f.prompt !== "(eliminada)");
  const maxFail = Math.max(1, ...failed.map((f) => f.fails));
  const totals = new Map<string, number>();
  for (const s of stats.byStatus) totals.set(s.status, (totals.get(s.status) ?? 0) + s.n);
  const all = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  const maxXp = Math.max(1, ...stats.league.map((c) => c.xp));
  return (
    <div className="tp-cols">
      <section className="tp-panel">
        <header>
          <h3>Liga de cursos</h3>
          <span className="tp-pill">{stats.league.length} cursos</span>
        </header>
        {stats.league.length === 0 ? (
          <p className="tp-muted">Todavía no hay cursos jugando. Comparta los carteles QR con su curso.</p>
        ) : (
          <ol className="tp-league">
            {stats.league.map((c, i) => (
              <li key={c.course}>
                <span className={`tp-rank r${i + 1}`}>{i + 1}</span>
                <b>{c.course}</b>
                <span className="tp-bar">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(c.xp / maxXp) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} />
                </span>
                <small>{c.xp} XP</small>
              </li>
            ))}
          </ol>
        )}
        {stats.league.length > 0 && (
          <div className="tp-mini-stats">
            {stats.league.slice(0, 3).map((c) => (
              <span key={c.course}>
                <b>{c.course}</b> · {c.members} alumnos · {c.lessons} retos · {c.reports} reportes
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="tp-panel">
        <header>
          <h3>Preguntas para reforzar en clase</h3>
        </header>
        {failed.length === 0 ? (
          <div className="tp-empty">
            <CharFace c="sofia" face="alegre" size={60} anim="idle" />
            <p>Todavía no hay preguntas con muchos errores. ¡Buen trabajo del curso!</p>
          </div>
        ) : (
          <ul className="tp-fails">
            {failed.map((f, i) => (
              <li key={f.questionId}>
                <p>{f.prompt}</p>
                <div className="tp-fail-row">
                  <span className="tp-bar danger">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${(f.fails / maxFail) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08 }} />
                  </span>
                  <small>{f.fails} {f.fails === 1 ? "error" : "errores"}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tp-panel">
        <header>
          <h3>Estado del contenido</h3>
          <span className="tp-pill">{all} en total</span>
        </header>
        <div className="tp-stack">
          {[...totals.entries()].map(([st, n]) => (
            <motion.span key={st} title={STATUS_LABEL[st]?.t ?? st} style={{ background: STATUS_LABEL[st]?.c ?? "var(--suave)" }} initial={{ width: 0 }} animate={{ width: `${(n / all) * 100}%` }} transition={{ duration: 0.8 }} />
          ))}
        </div>
        <ul className="tp-legend">
          {[...totals.entries()].map(([st, n]) => (
            <li key={st}>
              <i style={{ background: STATUS_LABEL[st]?.c ?? "var(--suave)" }} /> {STATUS_LABEL[st]?.t ?? st} <b>{n}</b>
            </li>
          ))}
        </ul>
        <p className="tp-muted">Las rechazadas por la IA nunca llegan a los alumnos: quedan como evidencia de que el control funciona.</p>
      </section>
    </div>
  );
}

export function TeacherPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("teacher-pin") ?? "");
  const [ok, setOk] = useState(false);
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

  return (
    <TeacherShell
      pin={pin}
      onLogout={() => {
        sessionStorage.removeItem("teacher-pin");
        setPin("");
        setOk(false);
      }}
    />
  );
}

/* =====================================================================================
 * Panel docente: menú lateral + secciones. Todo con lenguaje simple y un paso claro a la vez.
 * ===================================================================================== */
type TabKey = "home" | "up" | "gen" | "rev" | "prog" | "rep";

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </>
  ),
  up: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
      <path d="M4 20a2 2 0 0 0 2 1h13v-3" />
      <path d="M11.5 7v7M8 10.5h7" />
    </>
  ),
  gen: (
    <>
      <path d="M11 3l1.9 4.8L17.7 9.7l-4.8 1.9L11 16.4l-1.9-4.8L4.3 9.7l4.8-1.9z" />
      <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  rev: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="m8 12.2 2.8 2.8L16.5 9" />
    </>
  ),
  prog: (
    <>
      <path d="M4 20V11M10 20V5M16 20v-6M2.5 20.5h19" />
    </>
  ),
  rep: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.8 2H4.2z" />
      <path d="M10 21h4" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3M21 14v7h-4M14 18v3" />
    </>
  ),
  cam: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6L4.6 18.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  out: (
    <>
      <path d="M15 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};
function Ico({ k, s = 22 }: { k: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[k]}
    </svg>
  );
}

const SECTIONS: { k: TabKey; label: string; title: string; sub: string }[] = [
  { k: "home", label: "Inicio", title: "Inicio", sub: "Cómo va su curso y qué conviene hacer ahora." },
  { k: "up", label: "Información", title: "Información para la IA", sub: "La IA solo escribe con lo que usted carga aquí. Pegue un texto confiable y listo." },
  { k: "gen", label: "Crear lección", title: "Crear lección con IA", sub: "Elija un lugar y la IA propone preguntas, cada una con la frase exacta de donde salió." },
  { k: "rev", label: "Revisar", title: "Revisar antes de publicar", sub: "Nada llega a sus alumnos sin su visto bueno. Revise una por una o apruebe todas." },
  { k: "prog", label: "Mi curso", title: "Progreso del curso", sub: "Liga de cursos y las preguntas que más fallan, para reforzarlas en clase." },
  { k: "rep", label: "Reportes", title: "Reportes de alumnos", sub: "Daños que vieron en un monumento o errores que encontraron en una pregunta." },
];

type Overview = {
  kpis: { students: number; courses: number; xp: number; lessons: number; accuracy: number | null; published: number; pending: number; reportsNew: number };
  places: (Place & { published: number; stories: number; pending: number; completions: number; avgStars: number | null })[];
  recent: { ts: string; alias: string; course: string; type: string; monumentId: string | null; correct: number | null; total: number | null; stars: number | null }[];
  league: LeagueCourse[];
};

function useOverview(pin: string, tab: TabKey) {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    const api = teacherApi(pin);
    let live = true;
    const load = () => api.get<Overview>("/overview").then((d) => live && setData(d)).catch(() => {});
    void load();
    const iv = setInterval(load, 6000);
    return () => {
      live = false;
      clearInterval(iv);
    };
  }, [pin, tab]);
  return data;
}

function ago(ts: string) {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(ts).toLocaleDateString();
}

const EVENT_TEXT: Record<string, string> = {
  lesson_completed: "terminó el reto de",
  stories_completed: "leyó el cuento de",
  golden_card: "ganó la figurita dorada de",
  guardian_report: "reportó un daño en",
};

function Kpi({ icon, label, value, suffix = "", tone = "verde", delay = 0 }: { icon: string; label: string; value: number | null; suffix?: string; tone?: string; delay?: number }) {
  return (
    <motion.div className={`tp-kpi tone-${tone}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}>
      <span className="tp-kpi-ico">
        <Ico k={icon} s={20} />
      </span>
      <b>{value === null ? "—" : <CountUp to={value} />}{value === null ? "" : suffix}</b>
      <small>{label}</small>
    </motion.div>
  );
}

function Dashboard({ data, go }: { data: Overview | null; go: (t: TabKey) => void }) {
  if (!data) return <div className="tp-loading">Cargando…</div>;
  const k = data.kpis;
  const thin = data.places.filter((p) => p.published < 3);
  const next =
    k.pending > 0
      ? { t: `Tiene ${k.pending} ${k.pending === 1 ? "pregunta" : "preguntas"} esperando su visto bueno`, d: "Revíselas en un minuto: cada una muestra la frase de la fuente.", cta: "Revisar ahora", to: "rev" as TabKey, pose: "frente" }
      : thin.length > 0
        ? { t: `${thin[0].name} tiene pocas preguntas`, d: "Cree una lección nueva: la IA la arma con sus fuentes en segundos.", cta: "Crear lección", to: "gen" as TabKey, pose: "sucre" }
        : k.students === 0
          ? { t: "Todo listo para sus alumnos", d: "Imprima los carteles QR o comparta el enlace de la app con su curso.", cta: "Ver carteles QR", to: null, pose: "bolivia" }
          : { t: "¡Su curso está en marcha!", d: "Mire qué preguntas fallan más para reforzarlas en clase.", cta: "Ver mi curso", to: "prog" as TabKey, pose: "salta" };
  const steps = [
    { done: data.places.some((p) => p.fragments > 0), t: "Cargar información", to: "up" as TabKey },
    { done: k.published + k.pending > 0, t: "Crear una lección con IA", to: "gen" as TabKey },
    { done: k.published > 0 && k.pending === 0, t: "Revisar y publicar", to: "rev" as TabKey },
    { done: k.students > 0, t: "Que el curso juegue", to: "prog" as TabKey },
  ];
  const doneN = steps.filter((s) => s.done).length;
  return (
    <div className="tp-dash">
      <motion.section className="tp-next" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
        <div className="tp-next-txt">
          <span className="tp-eyebrow">Próximo paso recomendado</span>
          <h2>{next.t}</h2>
          <p>{next.d}</p>
          {next.to ? (
            <Button onClick={() => go(next.to!)}>
              {next.cta} <Ico k="arrow" s={18} />
            </Button>
          ) : (
            <Link className="btn-link" to="/carteles">
              <Button>
                {next.cta} <Ico k="arrow" s={18} />
              </Button>
            </Link>
          )}
        </div>
        <div className="tp-next-art">
          <CharPose c="orki" pose={next.pose as "sucre"} size={150} anim="idle" />
        </div>
      </motion.section>

      <div className="tp-kpis">
        <Kpi icon="phone" label="Alumnos activos" value={k.students} delay={0.05} />
        <Kpi icon="rev" label="Retos completados" value={k.lessons} tone="azul" delay={0.1} />
        <Kpi icon="prog" label="Aciertos" value={k.accuracy} suffix="%" tone="oro" delay={0.15} />
        <Kpi icon="gen" label="Preguntas publicadas" value={k.published} tone="terra" delay={0.2} />
        <Kpi icon="rep" label="Reportes nuevos" value={k.reportsNew} tone="rojo" delay={0.25} />
      </div>

      <div className="tp-cols">
        <section className="tp-panel">
          <header>
            <h3>Preparar una clase</h3>
            <span className="tp-pill">
              {doneN} de 4
            </span>
          </header>
          <div className="tp-meter">
            <motion.span initial={{ width: 0 }} animate={{ width: `${(doneN / 4) * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
          </div>
          <ol className="tp-check">
            {steps.map((s, i) => (
              <li key={s.t} className={s.done ? "done" : ""}>
                <button onClick={() => go(s.to)}>
                  <span className="tp-check-dot">{s.done ? <Ico k="rev" s={18} /> : i + 1}</span>
                  <span>{s.t}</span>
                  <Ico k="arrow" s={16} />
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="tp-panel">
          <header>
            <h3>Avance por lugar</h3>
            <button className="tp-link" onClick={() => go("gen")}>
              Crear más
            </button>
          </header>
          <div className="tp-places">
            {data.places.map((p, i) => (
              <div key={p.id} className="tp-place" style={{ ["--accent" as string]: p.color }}>
                <span className="tp-place-ico">
                  <MonumentIcon id={p.id} size={22} />
                </span>
                <div className="tp-place-body">
                  <div className="tp-place-top">
                    <b>{p.name}</b>
                    <small>
                      {p.published} preguntas · {p.completions} {p.completions === 1 ? "alumno" : "alumnos"}
                      {p.avgStars ? ` · ★ ${p.avgStars}` : ""}
                    </small>
                  </div>
                  <div className="tp-bar">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(100, (p.published / 8) * 100)}%` }} transition={{ delay: 0.1 * i, duration: 0.8, ease: "easeOut" }} />
                  </div>
                </div>
                {p.pending > 0 && (
                  <button className="tp-mini-badge" onClick={() => go("rev")}>
                    {p.pending} por revisar
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="tp-panel tp-feed">
          <header>
            <h3>
              <span className="tp-live" /> Actividad en vivo
            </h3>
          </header>
          {data.recent.length === 0 ? (
            <div className="tp-empty">
              <CharFace c="kusi" face="pensativo" size={64} anim="idle" />
              <p>Cuando sus alumnos jueguen, aquí verá lo que hacen al instante.</p>
            </div>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {data.recent.map((r) => (
                  <motion.li key={`${r.ts}-${r.alias}-${r.type}`} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <span className="tp-avatar">{r.alias.slice(0, 1).toUpperCase()}</span>
                    <p>
                      <b>{r.alias}</b> <small>({r.course})</small> {EVENT_TEXT[r.type] ?? r.type} <b>{data.places.find((p) => p.id === r.monumentId)?.name ?? "la app"}</b>
                      {r.type === "lesson_completed" && r.total ? (
                        <span className="tp-score">
                          {" "}
                          · {r.correct}/{r.total} {"★".repeat(Number(r.stars) || 0)}
                        </span>
                      ) : null}
                      <small className="tp-ago">{ago(r.ts)}</small>
                    </p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className="tp-panel">
          <header>
            <h3>Liga de cursos</h3>
            <button className="tp-link" onClick={() => go("prog")}>
              Ver todo
            </button>
          </header>
          {data.league.length === 0 ? (
            <p className="tp-muted">Todavía no hay cursos jugando.</p>
          ) : (
            <ol className="tp-league">
              {data.league.map((c, i) => (
                <li key={c.course}>
                  <span className={`tp-rank r${i + 1}`}>{i + 1}</span>
                  <b>{c.course}</b>
                  <span className="tp-bar">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${(c.xp / Math.max(1, data.league[0].xp)) * 100}%` }} transition={{ duration: 0.8 }} />
                  </span>
                  <small>{c.xp} XP</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** Vista previa: la pregunta tal como la ve el alumno en su celular. */
function StudentPreview({ item }: { item: Item }) {
  const p = item.payload as Record<string, string | string[] | number>;
  const isQ = item.kind === "question";
  const options = (p.options_es as string[]) ?? [];
  return (
    <div className="tp-phone">
      <div className="tp-phone-notch" />
      <div className="tp-phone-screen">
        {isQ ? (
          <>
            <span className="tp-phone-kicker">{p.type === "order" ? "Ordena" : p.type === "fill" ? "Completa" : "Elige la respuesta"}</span>
            <h4>{p.prompt_es as string}</h4>
            <div className="tp-phone-opts">
              {options.map((o, i) => (
                <span key={i} className={p.type !== "order" && i === p.answer ? "ok" : ""}>
                  {p.type === "order" ? `${i + 1}. ` : ""}
                  {o}
                  {p.type !== "order" && i === p.answer && <Ico k="rev" s={16} />}
                </span>
              ))}
            </div>
            <p className="tp-phone-expl">💡 {p.explanation_es as string}</p>
          </>
        ) : (
          <>
            <span className="tp-phone-kicker">Historia</span>
            <h4>{p.title_es as string}</h4>
            <p className="tp-phone-story">{p.text_es as string}</p>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewDeck({ pin, go }: { pin: string; go: (t: TabKey) => void }) {
  const api = teacherApi(pin);
  const [items, setItems] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [confirmAll, setConfirmAll] = useState(false);
  const [done, setDone] = useState({ ok: 0, no: 0 });
  useEffect(() => {
    api.get<{ items: Item[] }>("/items?status=pending").then((r) => setItems(r.items)).catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cur = items?.[Math.min(i, (items?.length ?? 1) - 1)];

  async function decide(ok: boolean) {
    if (!cur) return;
    setDir(ok ? 1 : -1);
    if (ok) await api.post(`/items/${cur.id}/approve`, { reviewer: "docente", payload: editing ? draft : undefined });
    else await api.post(`/items/${cur.id}/reject`, { reviewer: "docente" });
    setDone((d) => ({ ok: d.ok + (ok ? 1 : 0), no: d.no + (ok ? 0 : 1) }));
    setEditing(false);
    setItems((xs) => (xs ?? []).filter((x) => x.id !== cur.id));
  }
  async function approveAll() {
    for (const it of items ?? []) await api.post(`/items/${it.id}/approve`, { reviewer: "docente" });
    setDone((d) => ({ ...d, ok: d.ok + (items?.length ?? 0) }));
    setItems([]);
    setConfirmAll(false);
  }
  function startEdit() {
    if (!cur) return;
    const p = cur.payload as Record<string, string>;
    setDraft(cur.kind === "question" ? { prompt_es: p.prompt_es, explanation_es: p.explanation_es } : { title_es: p.title_es, text_es: p.text_es });
    setEditing(true);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || !cur || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "a" || e.key === "A") void decide(true);
      if (e.key === "r" || e.key === "R") void decide(false);
      if (e.key === "e" || e.key === "E") startEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!items) return <div className="tp-loading">Cargando…</div>;
  if (!cur)
    return (
      <motion.div className="tp-allset" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }}>
        <CharPose c="orki" pose="salta" size={150} anim="jump" pulse={1} />
        <h3>¡Todo revisado!</h3>
        <p>
          {done.ok + done.no > 0 ? `Aprobó ${done.ok} y rechazó ${done.no}. ` : ""}Lo aprobado ya aparece en la app de sus alumnos.
        </p>
        <Button onClick={() => go("gen")}>
          Crear más preguntas <Ico k="arrow" s={18} />
        </Button>
      </motion.div>
    );
  const total = items.length + done.ok + done.no;
  const pos = done.ok + done.no + 1;
  return (
    <div className="tp-review">
      <div className="tp-review-bar">
        <span>
          Pregunta <b>{pos}</b> de <b>{total}</b>
        </span>
        <div className="tp-dots">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={k < pos - 1 ? "past" : k === pos - 1 ? "now" : ""} />
          ))}
        </div>
        {items.length > 1 &&
          (confirmAll ? (
            <span className="tp-confirm">
              ¿Publicar las {items.length}?
              <Button variant="success" onClick={approveAll}>
                Sí, aprobar
              </Button>
              <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                No
              </Button>
            </span>
          ) : (
            <button className="tp-link" onClick={() => setConfirmAll(true)}>
              Aprobar todas ({items.length})
            </button>
          ))}
      </div>
      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <motion.div
          key={cur.id}
          className="tp-review-card"
          custom={dir}
          initial={{ opacity: 0, x: 40, rotate: 1.5 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: dir * 260, rotate: dir * 8, transition: { duration: 0.35 } }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div className="tp-review-left">
            <span className="tp-eyebrow">Así lo verá su alumno</span>
            {editing ? (
              <div className="tp-edit">
                {Object.keys(draft).map((key) => (
                  <label key={key}>
                    {key.startsWith("prompt") ? "Pregunta" : key.startsWith("explanation") ? "Explicación" : key.startsWith("title") ? "Título" : "Texto"}
                    <textarea value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} rows={key.startsWith("text") ? 5 : 3} />
                  </label>
                ))}
              </div>
            ) : (
              <StudentPreview item={cur} />
            )}
          </div>
          <div className="tp-review-right">
            <span className="tp-eyebrow">¿De dónde salió?</span>
            <div className="tp-source">
              <span className="tp-source-tag">
                <MonumentIcon id={cur.monumentId} size={16} /> Fuente {cur.fragmentId}
              </span>
              <p>
                <Highlight text={cur.fragmentText} quote={cur.evidenceQuote} />
              </p>
              <small>Lo resaltado es la frase exacta que respalda la respuesta.</small>
            </div>
            {cur.judgeReason && (
              <div className="tp-judge">
                <b>Segunda opinión (IA):</b> {cur.judgeReason}
              </div>
            )}
            <div className="tp-actions">
              <Button variant="success" onClick={() => decide(true)}>
                ✓ {editing ? "Guardar y aprobar" : "Aprobar"}
              </Button>
              {!editing ? (
                <Button variant="secondary" onClick={startEdit}>
                  ✎ Editar
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancelar edición
                </Button>
              )}
              <Button variant="danger" onClick={() => decide(false)}>
                ✕ Rechazar
              </Button>
            </div>
            <p className="tp-keys">
              Atajos: <kbd>A</kbd> aprobar · <kbd>E</kbd> editar · <kbd>R</kbd> rechazar
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TeacherShell({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const [tab, setTab] = useState<TabKey>("home");
  const [genMonument, setGenMonument] = useState<string | undefined>();
  const data = useOverview(pin, tab);
  const sec = SECTIONS.find((s) => s.k === tab)!;
  const badge = (k: TabKey) => (k === "rev" ? data?.kpis.pending : k === "rep" ? data?.kpis.reportsNew : 0) || 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="tp">
      <aside className="tp-side">
        <div className="tp-brand">
          <CharFace c="orki" face="alegre" size={44} anim="idle" />
          <div>
            <b>Guardianes</b>
            <small>Panel docente</small>
          </div>
        </div>
        <nav className="tp-nav">
          {SECTIONS.map((s) => (
            <button key={s.k} className={tab === s.k ? "on" : ""} onClick={() => setTab(s.k)}>
              {tab === s.k && <motion.span layoutId="tp-nav-pill" className="tp-nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Ico k={s.k} />
              <span>{s.label}</span>
              {badge(s.k) > 0 && <em>{badge(s.k)}</em>}
            </button>
          ))}
        </nav>
        <div className="tp-side-tools">
          <small>Herramientas</small>
          <Link to="/carteles">
            <Ico k="qr" s={18} /> Carteles QR
          </Link>
          <Link to="/entrenar">
            <Ico k="cam" s={18} /> Enseñar a la cámara
          </Link>
          <Link to="/evidencia">
            <Ico k="lab" s={18} /> Evidencia de la IA
          </Link>
          <Link to="/">
            <Ico k="phone" s={18} /> App del alumno
          </Link>
          <button onClick={onLogout}>
            <Ico k="out" s={18} /> Salir
          </button>
        </div>
      </aside>

      <main className="tp-main">
        <header className="tp-head">
          <div>
            <span className="tp-hello">{tab === "home" ? `${hello}, profe` : "Panel docente"}</span>
            <h1>{sec.title}</h1>
            <p>{sec.sub}</p>
          </div>
        </header>
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          {tab === "home" && <Dashboard data={data} go={setTab} />}
          {tab === "up" && (
            <Upload
              pin={pin}
              onSaved={(id) => {
                setGenMonument(id);
                setTab("gen");
              }}
            />
          )}
          {tab === "gen" && <Generate key={genMonument} pin={pin} initialMonument={genMonument} onDone={() => setTab("rev")} />}
          {tab === "rev" && <ReviewDeck pin={pin} go={setTab} />}
          {tab === "prog" && <Progress pin={pin} />}
          {tab === "rep" && <Reports pin={pin} />}
        </motion.div>
      </main>
    </div>
  );
}

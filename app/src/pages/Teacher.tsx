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
  const [tab, setTab] = useState<TabKey>("home");
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

  return <TeacherHome pin={pin} tab={tab} setTab={setTab} />;
}

type TabKey = "home" | "up" | "gen" | "rev" | "prog" | "rep";
const STEPS: { k: Exclude<TabKey, "home" | "rep">; n: number; title: string; desc: string; icon: string; tip: string }[] = [
  { k: "up", n: 1, title: "Subir información", desc: "Pegue un texto de su libro o apunte", icon: "📚", tip: "Elija el lugar, diga de dónde sale el dato y pegue el texto. La IA solo usará lo que usted suba." },
  { k: "gen", n: 2, title: "Crear lección con IA", desc: "La IA arma preguntas con su cita", icon: "✨", tip: "Elija un lugar y toque el botón. En unos segundos la IA propone preguntas, cada una con la frase exacta de donde salió." },
  { k: "rev", n: 3, title: "Revisar y aprobar", desc: "Usted decide qué ven sus alumnos", icon: "✅", tip: "Lea cada pregunta: lo resaltado en amarillo es la cita de la fuente. Apruebe, edite o rechace. Nada llega a los alumnos sin su visto bueno." },
  { k: "prog", n: 4, title: "Ver el progreso", desc: "Cómo va su curso y qué fallan más", icon: "📈", tip: "Aquí ve la liga de cursos y las preguntas que más se equivocan, para reforzarlas en clase." },
];

function TeacherHome({ pin, tab, setTab }: { pin: string; tab: TabKey; setTab: (t: TabKey) => void }) {
  const [genMonument, setGenMonument] = useState<string | undefined>();
  const [pending, setPending] = useState(0);
  const [reports, setReports] = useState(0);
  useEffect(() => {
    const api = teacherApi(pin);
    api.get<{ items: Item[] }>("/items?status=pending").then((r) => setPending(r.items.length)).catch(() => {});
    api.get<{ reports: Report[] }>("/reports").then((r) => setReports(r.reports.length)).catch(() => {});
  }, [pin, tab]);
  const step = STEPS.find((s) => s.k === tab);

  return (
    <div className="teacher">
      <header className="teacher-head">
        <button className="t-home-btn" onClick={() => setTab("home")}>
          <h1>Panel docente</h1>
          <p>Solo lo que usted aprueba llega a sus estudiantes.</p>
        </button>
        <nav className="t-stepper" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <button key={s.k} className={`t-stepbtn ${tab === s.k ? "on" : ""}`} onClick={() => setTab(s.k)}>
              {tab === s.k && <motion.span layoutId="t-step-pill" className="t-step-pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="t-stepnum">{s.n}</span>
              <span className="t-steplabel">{s.title}</span>
              {s.k === "rev" && pending > 0 && <span className="t-badge">{pending}</span>}
              {i < STEPS.length - 1 && <span className="t-arrow" aria-hidden>›</span>}
            </button>
          ))}
        </nav>
      </header>

      {/* sin salida animada: el paso nuevo aparece al instante aunque el navegador esté en segundo plano */}
      <>
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "home" && (
            <>
              <Guide>
                <b>¡Hola, profe!</b> Preparar una lección le toma unos 3 minutos. Siga los 4 pasos en orden; yo le voy explicando cada uno.
              </Guide>
              <div className="t-home-grid">
                {STEPS.map((s, i) => (
                  <motion.button
                    key={s.k}
                    className="t-card"
                    onClick={() => setTab(s.k)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, type: "spring", stiffness: 260, damping: 22 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="t-card-n">Paso {s.n}</span>
                    <motion.span className="t-card-icon" animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 + i * 0.6 }}>
                      {s.icon}
                    </motion.span>
                    <b>{s.title}</b>
                    <small>{s.desc}</small>
                    {s.k === "rev" && pending > 0 && <span className="t-badge big">{pending} por revisar</span>}
                    <span className="t-go">Empezar →</span>
                  </motion.button>
                ))}
              </div>
              <h3 className="t-more">Más herramientas</h3>
              <div className="t-tools">
                <button className="t-tool" onClick={() => setTab("rep")}>
                  🛎️ Reportes de alumnos {reports > 0 && <span className="t-badge">{reports}</span>}
                </button>
                <Link className="t-tool" to="/carteles">
                  🖨️ Imprimir carteles QR
                </Link>
                <Link className="t-tool" to="/entrenar">
                  📷 Enseñar a la cámara
                </Link>
                <Link className="t-tool" to="/evidencia">
                  📊 Evidencia de la IA
                </Link>
              </div>
            </>
          )}
          {step && (
            <Guide face={step.k === "rev" ? "pensativo" : "alegre"}>
              <b>
                Paso {step.n} de 4 · {step.title}.
              </b>{" "}
              {step.tip}
            </Guide>
          )}
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
          {tab === "rev" && <Review pin={pin} />}
          {tab === "prog" && <Progress pin={pin} />}
          {tab === "rep" && (
            <>
              <Guide face="pensativo">Aquí llegan los avisos de sus alumnos: daños que vieron en un monumento o errores en una pregunta.</Guide>
              <Reports pin={pin} />
            </>
          )}
          {step && (
            <div className="t-nav">
              <Button variant="secondary" onClick={() => setTab(step.n === 1 ? "home" : STEPS[step.n - 2].k)}>
                ← {step.n === 1 ? "Inicio" : "Paso anterior"}
              </Button>
              {step.n < 4 ? (
                <Button onClick={() => setTab(STEPS[step.n].k)}>Siguiente paso: {STEPS[step.n].title} →</Button>
              ) : (
                <Button onClick={() => setTab("home")}>Volver al inicio</Button>
              )}
            </div>
          )}
        </motion.div>
      </>
    </div>
  );
}

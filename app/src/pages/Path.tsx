import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CharFace, CharOutfit } from "../components/Character";
import { useCuentos } from "../useCuentos";
import { MonumentIcon } from "../components/MonumentIcon";
import { Scene } from "../components/Scene";
import { StudentShell } from "../components/Shell";
import { Button, Icon } from "../components/ui";
import { bouncy, snappy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import type { MonumentContent , Difficulty } from "../types";
import { useContent } from "../useContent";

const ROW = 168;
const OFFSETS = [-70, 70, -70, 70, -70, 70];

/** Camino curvo que une los nodos; el tramo recorrido se pinta de oro. */
function Trail({ count, done }: { count: number; done: number }) {
  const pts = Array.from({ length: count }, (_, i) => [OFFSETS[i % OFFSETS.length], 60 + i * ROW]);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const my = (py + y) / 2;
    return `${acc} C${px} ${my}, ${x} ${my}, ${x} ${y}`;
  }, "");
  const height = 60 + (count - 1) * ROW + 60;
  return (
    <svg className="trail" viewBox={`-200 0 400 ${height}`} width="400" height={height} aria-hidden>
      <path d={d} stroke="#E4D9C8" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={d} stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="2 14" strokeLinecap="round" />
      <motion.path
        d={d}
        stroke="#E5A823"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: count > 1 ? Math.min(1, done / (count - 1)) : 0 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.4 }}
      />
    </svg>
  );
}

const DIFF_LABEL: Record<Difficulty, { es: string; en: string }> = {
  facil: { es: "Fácil", en: "Easy" },
  medio: { es: "Medio", en: "Medium" },
  dificil: { es: "Difícil", en: "Hard" },
};

export function PathPage() {
  const { t, lang } = useT();
  const content = useContent();
  const progress = useStore((s) => s.progress);
  const avatar = useStore((s) => s.avatar);
  const cuentos = useCuentos();
  const [open, setOpen] = useState<MonumentContent | null>(null);
  const difficulty = useStore((s) => s.difficulty);
  const setDifficulty = useStore((s) => s.setDifficulty);
  const account = useStore((s) => s.account);
  const course = useStore((s) => s.profile?.course ?? "");
  const [acts, setActs] = useState<{ id: string; monument_id: string; difficulty: Difficulty; note: string | null; due: string | null; created_by: string }[]>([]);
  useEffect(() => {
    if (!course) return;
    fetch(`/api/activities?course=${encodeURIComponent(course)}`)
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((d) => setActs(d.activities ?? []))
      .catch(() => {});
  }, [course]);
  const navigate = useNavigate();
  const monuments = content?.monuments ?? [];
  const available = (m: MonumentContent) => m.questions.length > 0 || m.stories.length > 0;
  const current = monuments.find((m) => available(m) && !progress[m.id]?.lesson);
  const doneCount = monuments.filter((m) => progress[m.id]?.lesson).length;
  // Tramo dorado del camino: hasta la parada actual (o todo, si se completó la ruta).
  const reached = current ? monuments.findIndex((m) => m.id === current.id) : doneCount ? monuments.length - 1 : 0;

  return (
    <StudentShell>
      <motion.section className="unit-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
        <div className="unit-txt">
          <span className="unit-eyebrow">{lang === "es" ? "Unidad 1 · Sucre" : "Unit 1 · Sucre"}</span>
          <h1>{lang === "es" ? "Guardianes de la Ciudad Blanca" : "Guardians of the White City"}</h1>
          <div className="unit-meter" aria-label={`${doneCount}/${monuments.length}`}>
            <motion.i initial={{ width: 0 }} animate={{ width: `${monuments.length ? (doneCount / monuments.length) * 100 : 0}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
          </div>
          <small>
            {doneCount}/{monuments.length || 4} {lang === "es" ? "paradas" : "stops"} · {t.routeTitle}
          </small>
        </div>
        <button className="avatar-btn" onClick={() => navigate("/perfil")} aria-label="Perfil">
          <CharFace c={avatar.c} face={doneCount > 0 ? "alegre" : "pensativo"} size={72} anim="idle" />
        </button>
      </motion.section>

      {acts.length > 0 && (
        <div className="acts">
          {acts.slice(0, 2).map((a, i) => {
            const mon = monuments.find((x) => x.id === a.monument_id);
            const done = progress[a.monument_id]?.lesson;
            return (
              <motion.button
                key={a.id}
                className={`act-card ${done ? "done" : ""}`}
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1 * i, type: "spring", stiffness: 300, damping: 22 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setDifficulty(a.difficulty);
                  navigate(`/reto/${a.monument_id}?dif=${a.difficulty}`);
                }}
              >
                <span className="act-tag">{done ? (lang === "es" ? "¡Entregada!" : "Done!") : lang === "es" ? "Tarea del profe" : "Teacher task"}</span>
                <b>{mon?.name[lang] ?? a.monument_id}</b>
                <small>
                  {DIFF_LABEL[a.difficulty][lang]} · {a.created_by}
                  {a.due ? ` · ${lang === "es" ? "hasta el" : "due"} ${a.due.slice(8, 10)}/${a.due.slice(5, 7)}` : ""}
                </small>
                {a.note && <em>{a.note}</em>}
              </motion.button>
            );
          })}
        </div>
      )}

      {content && monuments.every((m) => !available(m)) && <p className="empty">{t.noContent}</p>}

      <div className="path" style={{ height: monuments.length ? 60 + (monuments.length - 1) * ROW + 110 : 0 }}>
        {monuments.length > 0 && <Trail count={monuments.length} done={reached} />}
        {monuments.map((m, i) => {
          const p = progress[m.id];
          const isAvailable = available(m);
          const done = p?.lesson;
          const isCurrent = current?.id === m.id;
          return (
            <motion.div
              key={m.id}
              className={`stop ${OFFSETS[i % OFFSETS.length] < 0 ? "left" : "right"}`}
              style={{ top: 60 + i * ROW - 42, marginLeft: OFFSETS[i % OFFSETS.length] - 42 }}
              initial={{ opacity: 0, scale: 0.3, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...bouncy, delay: 0.1 + i * 0.12 }}
            >
              {m.year && <span className="stop-year serif">{m.year}</span>}
              {isCurrent && (
                <motion.div
                  className="stop-avatar"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...bouncy, delay: 0.6 }}
                >
                  <CharOutfit c={avatar.c} outfit={avatar.outfit} size={84} anim="idle" />
                </motion.div>
              )}
              {isCurrent && (
                <motion.span className="bubble" animate={{ y: [0, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
                  {t.startHere}
                </motion.span>
              )}
              <motion.button
                className={`node ${done ? "done" : ""} ${isAvailable ? "" : "locked"} ${isCurrent ? "current" : ""}`}
                style={{ ["--node" as string]: m.color }}
                whileHover={isAvailable ? { scale: 1.06 } : undefined}
                whileTap={isAvailable ? { scale: 0.92, y: 5 } : undefined}
                transition={snappy}
                disabled={!isAvailable}
                onClick={() => {
                  sfx.tap();
                  setOpen(m);
                }}
                aria-label={m.name[lang]}
              >
                {isCurrent && <span className="node-ring" />}
                <span className="node-icon">{isAvailable ? <MonumentIcon id={m.id} size={42} /> : Icon.lock(28)}</span>
                {done && (
                  <motion.span className="node-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={bouncy}>
                    {Icon.check(15)}
                  </motion.span>
                )}
                {p?.golden && <span className="node-golden">{Icon.star(15)}</span>}
              </motion.button>
              <div className="node-stars">
                {[0, 1, 2].map((k) => (
                  <span key={k} className={k < (p?.stars ?? 0) ? "on" : ""}>
                    {Icon.star(16)}
                  </span>
                ))}
              </div>
              <span className="node-label">{isAvailable ? m.name[lang] : t.soon}</span>
            </motion.div>
          );
        })}
      </div>

      <div className="unit-next">
        <span className="unit-next-lock">{Icon.lock(22)}</span>
        <div>
          <span className="unit-eyebrow">{lang === "es" ? "Unidad 2 · Próximamente" : "Unit 2 · Coming soon"}</span>
          <b>{lang === "es" ? "Potosí, Ciudad de Plata" : "Potosí, City of Silver"}</b>
          <small>{lang === "es" ? "Termina la Unidad 1 para desbloquearla" : "Finish Unit 1 to unlock it"}</small>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div
              className="sheet"
              style={{ ["--accent" as string]: open.color }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-art">
                <Scene id={open.id} />
                <span className="sheet-year serif">{open.year}</span>
              </div>
              <div className="sheet-body">
                <h3>{open.name[lang]}</h3>
                {open.tagline && <p className="serif tagline">{open.tagline[lang]}</p>}
                <div className="sheet-meta">
                  <span>
                    {Icon.book(14)} {open.stories.length} {t.stories}
                  </span>
                  <span>
                    {Icon.check(14)} {open.questions.length} {t.questions}
                  </span>
                </div>
                <div className="diff-pick" role="radiogroup" aria-label={lang === "es" ? "Dificultad" : "Difficulty"}>
                  {(["facil", "medio", "dificil"] as Difficulty[]).map((d) => (
                    <button key={d} role="radio" aria-checked={difficulty === d} className={`diff-${d} ${difficulty === d ? "on" : ""}`} onClick={() => setDifficulty(d)}>
                      {difficulty === d && <motion.span layoutId="diff-pill" className="diff-pill" transition={{ type: "spring", stiffness: 420, damping: 30 }} />}
                      <span>{DIFF_LABEL[d][lang]}</span>
                    </button>
                  ))}
                </div>
                {account?.level && (
                  <p className="diff-hint">
                    {lang === "es"
                      ? `Recomendado para ${account.level} de secundaria: ${DIFF_LABEL[account.level === "4to" ? "facil" : "dificil"].es}`
                      : `Recommended for grade ${account.level}: ${DIFF_LABEL[account.level === "4to" ? "facil" : "dificil"].en}`}
                  </p>
                )}
                <div className="steps">
                  {cuentos?.[open.id] && (
                    <button className={`step-card ${progress[open.id]?.cuento ? "done" : "next"}`} onClick={() => navigate(`/cuento/${open.id}`)}>
                      <span className="step-n">{progress[open.id]?.cuento ? Icon.check(18) : "1"}</span>
                      <span>
                        <b>{lang === "es" ? "Cuento" : "Story"}</b>
                        <small>{lang === "es" ? "Primero entérate de la historia" : "First, learn the story"}</small>
                      </span>
                    </button>
                  )}
                  {open.questions.length > 0 && (
                    <button className={`step-card ${progress[open.id]?.lesson ? "done" : progress[open.id]?.cuento || !cuentos?.[open.id] ? "next" : ""}`} onClick={() => navigate(`/reto/${open.id}`)}>
                      <span className="step-n">{progress[open.id]?.lesson ? Icon.check(18) : "2"}</span>
                      <span>
                        <b>{t.startChallenge}</b>
                        <small>
                          {open.questions.length} {t.questions} · 3 {lang === "es" ? "vidas" : "lives"}
                        </small>
                      </span>
                      <span className="step-stars">
                        {[0, 1, 2].map((k) => (
                          <i key={k} className={k < (progress[open.id]?.stars ?? 0) ? "on" : ""}>{Icon.star(14)}</i>
                        ))}
                      </span>
                    </button>
                  )}
                </div>
                {open.stories.length > 0 && (
                  <button className="link center" onClick={() => navigate(`/historias/${open.id}`)}>
                    {lang === "es" ? "Repaso rápido" : "Quick review"}
                  </button>
                )}
                <Button variant="gold" block onClick={() => navigate(`/escanear/${open.id}`)}>
                  {Icon.camera()} {t.scan}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StudentShell>
  );
}

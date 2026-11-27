import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../components/Mascot";
import { MonumentIcon } from "../components/MonumentIcon";
import { Scene } from "../components/Scene";
import { StudentShell } from "../components/Shell";
import { Button, Icon } from "../components/ui";
import { bouncy, snappy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import type { MonumentContent } from "../types";
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

export function PathPage() {
  const { t, lang } = useT();
  const content = useContent();
  const progress = useStore((s) => s.progress);
  const [open, setOpen] = useState<MonumentContent | null>(null);
  const navigate = useNavigate();
  const monuments = content?.monuments ?? [];
  const available = (m: MonumentContent) => m.questions.length > 0 || m.stories.length > 0;
  const current = monuments.find((m) => available(m) && !progress[m.id]?.lesson);
  const doneCount = monuments.filter((m) => progress[m.id]?.lesson).length;
  // Tramo dorado del camino: hasta la parada actual (o todo, si se completó la ruta).
  const reached = current ? monuments.findIndex((m) => m.id === current.id) : doneCount ? monuments.length - 1 : 0;

  return (
    <StudentShell>
      <section className="route-head">
        <div>
          <h1 className="serif">{t.routeTitle}</h1>
          <div className="route-progress">
            {monuments.map((m) => (
              <span key={m.id} className={progress[m.id]?.lesson ? "on" : ""} />
            ))}
          </div>
        </div>
        <Mascot size={78} mood={doneCount > 0 ? "wave" : "idle"} />
      </section>

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
              <span className="node-label">{isAvailable ? m.name[lang] : t.soon}</span>
            </motion.div>
          );
        })}
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
                {open.stories.length > 0 && (
                  <Button variant="secondary" block onClick={() => navigate(`/historias/${open.id}`)}>
                    {t.viewStories}
                  </Button>
                )}
                {open.questions.length > 0 && (
                  <Button block onClick={() => navigate(`/reto/${open.id}`)}>
                    {t.startChallenge}
                  </Button>
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

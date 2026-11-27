import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../components/Mascot";
import { MonumentIcon } from "../components/MonumentIcon";
import { StudentShell } from "../components/Shell";
import { Button, Icon } from "../components/ui";
import { useT } from "../i18n";
import { useStore } from "../store";
import type { MonumentContent } from "../types";
import { useContent } from "../useContent";

const OFFSETS = [0, 70, 0, -70];

export function PathPage() {
  const { t, lang } = useT();
  const content = useContent();
  const progress = useStore((s) => s.progress);
  const [open, setOpen] = useState<MonumentContent | null>(null);
  const navigate = useNavigate();
  const monuments = content?.monuments ?? [];
  const available = (m: MonumentContent) => m.questions.length > 0 || m.stories.length > 0;
  const current = monuments.find((m) => available(m) && !progress[m.id]?.lesson);

  return (
    <StudentShell>
      <motion.section className="unit-banner" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div>
          <span className="unit-kicker">{t.unit}</span>
          <h2>{t.unitTitle}</h2>
        </div>
        <Mascot size={74} mood="idle" />
      </motion.section>

      {!content && <p className="empty">…</p>}
      {content && monuments.every((m) => !available(m)) && <p className="empty">{t.noContent}</p>}

      <div className="path">
        {monuments.map((m, i) => {
          const p = progress[m.id];
          const isAvailable = available(m);
          const done = p?.lesson;
          const isCurrent = current?.id === m.id;
          return (
            <motion.div
              key={m.id}
              className="path-row"
              style={{ x: OFFSETS[i % OFFSETS.length] }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 200, damping: 14 }}
            >
              {isCurrent && (
                <motion.div className="bubble" animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                  {t.startHere}
                </motion.div>
              )}
              <motion.button
                className={`node ${done ? "done" : ""} ${isAvailable ? "" : "locked"} ${isCurrent ? "current" : ""}`}
                style={{ ["--node" as string]: m.color }}
                whileTap={{ y: 4 }}
                disabled={!isAvailable}
                onClick={() => setOpen(m)}
                aria-label={m.name[lang]}
              >
                {isCurrent && <span className="node-ring" />}
                <span className="node-icon">{isAvailable ? <MonumentIcon id={m.id} size={44} /> : Icon.lock(30)}</span>
                {done && <span className="node-check">{Icon.check(16)}</span>}
                {p?.golden && <span className="node-golden">{Icon.star(16)}</span>}
              </motion.button>
              <span className="node-label">{isAvailable ? m.name[lang] : `${m.name[lang]} · ${t.soon}`}</span>
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
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-head">
                <span className="sheet-icon">
                  <MonumentIcon id={open.id} size={48} />
                </span>
                <div>
                  <h3>{open.name[lang]}</h3>
                  <p>
                    {open.stories.length} {t.stories.toLowerCase()} · {open.questions.length} {t.questions}
                  </p>
                </div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StudentShell>
  );
}

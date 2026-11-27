import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { flushQueue } from "../api";
import { Mascot } from "../components/Mascot";
import { MonumentIcon } from "../components/MonumentIcon";
import { StudentShell } from "../components/Shell";
import { Button, Icon } from "../components/ui";
import { useT } from "../i18n";
import { useStore } from "../store";
import { useContent } from "../useContent";

const DAMAGES = ["grafiti", "basura", "cableado", "fachada", "otro"] as const;

export function GuardianPage() {
  const { t, lang } = useT();
  const content = useContent();
  const addReport = useStore((s) => s.addReport);
  const [monumentId, setMonumentId] = useState<string | null>(null);
  const [damage, setDamage] = useState<(typeof DAMAGES)[number] | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!monumentId || !damage) return;
    addReport({ kind: "dano", monumentId, damageType: damage, text: text.trim() || t.damages[damage] });
    void flushQueue();
    setSent(true);
  };

  return (
    <StudentShell>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.section key="ok" className="guardian-done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.span className="shield-big" initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 140 }}>
              {Icon.shield(90)}
            </motion.span>
            <h2>{t.sentTitle}</h2>
            <p>{t.sentBody}</p>
            <Mascot mood="happy" size={100} />
            <Button
              variant="secondary"
              onClick={() => {
                setSent(false);
                setText("");
                setDamage(null);
              }}
            >
              {t.another}
            </Button>
          </motion.section>
        ) : (
          <motion.section key="form" className="guardian" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="page-head guardian-head">
              <span className="shield-icon">{Icon.shield(44)}</span>
              <div>
                <h2>{t.guardianTitle}</h2>
                <p>{t.guardianLead}</p>
              </div>
            </div>
            <h4>{t.which}</h4>
            <div className="chips">
              {(content?.monuments ?? []).map((m) => (
                <button key={m.id} className={`chip-btn ${monumentId === m.id ? "on" : ""}`} onClick={() => setMonumentId(m.id)} style={{ ["--accent" as string]: m.color }}>
                  <MonumentIcon id={m.id} size={22} /> {m.name[lang]}
                </button>
              ))}
            </div>
            <h4>{t.damage}</h4>
            <div className="chips">
              {DAMAGES.map((d) => (
                <button key={d} className={`chip-btn ${damage === d ? "on" : ""}`} onClick={() => setDamage(d)}>
                  {t.damages[d]}
                </button>
              ))}
            </div>
            <h4>{t.describe}</h4>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} rows={3} />
            <div className="textarea-meta">
              <small>🔒 {t.privacy}</small>
              <small>{text.length}/200</small>
            </div>
            <Button block disabled={!monumentId || !damage} onClick={submit}>
              {t.send}
            </Button>
          </motion.section>
        )}
      </AnimatePresence>
    </StudentShell>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { flushQueue } from "../api";
import { Burst } from "../components/Burst";
import { CharPose } from "../components/Character";
import { MonumentIcon } from "../components/MonumentIcon";
import { StudentShell } from "../components/Shell";
import { Button, Icon } from "../components/ui";
import { bouncy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import { useContent } from "../useContent";

const DAMAGES = ["grafiti", "basura", "cableado", "fachada", "otro"] as const;

export function GuardianPage() {
  const { t, lang } = useT();
  const content = useContent();
  const addReport = useStore((s) => s.addReport);
  const avatarC = useStore((s) => s.avatar.c);
  const [monumentId, setMonumentId] = useState<string | null>(null);
  const [damage, setDamage] = useState<(typeof DAMAGES)[number] | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!monumentId || !damage) return;
    addReport({ kind: "dano", monumentId, damageType: damage, text: text.trim() || t.damages[damage] });
    void flushQueue();
    sfx.complete();
    setSent(true);
  };

  return (
    <StudentShell>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.section key="ok" className="guardian-done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.span className="shield-big" initial={{ rotate: -25, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={bouncy}>
              {Icon.shield(96)}
              <Burst count={16} radius={110} />
            </motion.span>
            <h1 className="serif">{t.sentTitle}</h1>
            <p className="xp-chip">{t.sentBody}</p>
            <CharPose c={avatarC} pose="sucre" size={150} anim="jump" pulse={1} />
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
            <div className="guardian-head">
              <span className="shield-icon">{Icon.shield(40)}</span>
              <div>
                <h1 className="serif">{t.guardianTitle}</h1>
                <p>{t.guardianLead}</p>
              </div>
            </div>
            <h4>{t.which}</h4>
            <div className="chips">
              {(content?.monuments ?? []).map((m) => (
                <motion.button key={m.id} whileTap={{ scale: 0.94 }} className={`chip-btn ${monumentId === m.id ? "on" : ""}`} onClick={() => setMonumentId(m.id)} style={{ ["--accent" as string]: m.color }}>
                  <MonumentIcon id={m.id} size={20} /> {m.name[lang]}
                </motion.button>
              ))}
            </div>
            <h4>{t.damage}</h4>
            <div className="chips">
              {DAMAGES.map((d) => (
                <motion.button key={d} whileTap={{ scale: 0.94 }} className={`chip-btn ${damage === d ? "on" : ""}`} onClick={() => setDamage(d)}>
                  {t.damages[d]}
                </motion.button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} rows={3} placeholder={t.describePh} />
            <div className="textarea-meta">
              <span />
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

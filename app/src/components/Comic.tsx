import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CHARACTERS, type CharId, type Face, type Pose } from "../characters";
import { CharFace, CharPose } from "./Character";
import { Scene } from "./Scene";
import { Button, Icon } from "./ui";
import { sfx } from "../sfx";
import type { Lang } from "../types";

export type Panel = { who: CharId; face?: Face; pose?: Pose; sfx?: string; text_es: string; text_en: string };
export type Cuento = { title_es: string; title_en: string; panels: Panel[] };

/** Texto que se escribe solo (efecto máquina de escribir); un toque lo completa. */
function Typed({ text, done, onDone }: { text: string; done: boolean; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
  }, [text]);
  useEffect(() => {
    if (done) {
      setN(text.length);
      return;
    }
    if (n >= text.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), 18);
    return () => clearTimeout(t);
  }, [n, text, done, onDone]);
  return (
    <>
      {text.slice(0, n)}
      <span className="typed-ghost">{text.slice(n)}</span>
    </>
  );
}

/**
 * Lector de cómic (clase invertida): un panel por vez, el personaje entra de lado,
 * el globo se escribe solo y las onomatopeyas aparecen con golpe. Toque = siguiente.
 */
export function ComicReader({ id, cuento, lang, onClose, onFinish, finishLabel }: {
  id: string; cuento: Cuento; lang: Lang; onClose: () => void; onFinish: () => void; finishLabel: string;
}) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);
  const p = cuento.panels[i];
  const last = i === cuento.panels.length - 1;
  const fromLeft = p.who !== "orki";
  const char = CHARACTERS[p.who];

  useEffect(() => {
    setTyped(false);
    if (p.sfx) setTimeout(() => sfx.combo(), 250);
  }, [i, p.sfx]);

  const next = () => {
    if (!typed) {
      setTyped(true);
      return;
    }
    if (last) return;
    sfx.page();
    setI(i + 1);
  };

  return (
    <div className="comic" onClick={next}>
      <div className="comic-top" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn static" onClick={onClose} aria-label="Cerrar">
          {Icon.close()}
        </button>
        <div className="comic-dots">
          {cuento.panels.map((_, j) => (
            <span key={j} className={j <= i ? "on" : ""} />
          ))}
        </div>
      </div>
      <h2 className="comic-title">{lang === "es" ? cuento.title_es : cuento.title_en}</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="comic-panel"
          initial={{ opacity: 0, scale: 0.92, rotate: fromLeft ? -2 : 2, x: fromLeft ? -40 : 40 }}
          animate={{ opacity: 1, scale: 1, rotate: fromLeft ? -0.6 : 0.6, x: 0 }}
          exit={{ opacity: 0, scale: 1.04, x: fromLeft ? 40 : -40 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <div className="comic-bg">
            <Scene id={id} />
            <span className="halftone" style={{ ["--c" as string]: char.color }} />
          </div>
          {p.sfx && (
            <motion.span className="comic-sfx" initial={{ scale: 0, rotate: -25 }} animate={{ scale: [0, 1.3, 1], rotate: -8 }} transition={{ delay: 0.2, duration: 0.45 }}>
              {p.sfx}
            </motion.span>
          )}
          <motion.div
            className={`comic-char ${fromLeft ? "left" : "right"} ${p.pose ? "full" : "head"}`}
            initial={{ x: fromLeft ? -140 : 140, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
          >
            {p.pose ? <CharPose c={p.who} pose={p.pose} size={190} anim={p.pose === "salta" ? "jump" : "idle"} /> : <CharFace c={p.who} face={p.face ?? "alegre"} size={150} anim="pop" />}
            <span className="comic-name">{char.name}</span>
          </motion.div>
          <motion.div
            className={`bubble-comic ${fromLeft ? "tail-left" : "tail-right"}`}
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 20, delay: 0.25 }}
          >
            <Typed text={lang === "es" ? p.text_es : p.text_en} done={typed} onDone={() => setTyped(true)} />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="comic-foot" onClick={(e) => e.stopPropagation()}>
        {i > 0 && (
          <button className="link" onClick={() => setI(i - 1)}>
            ←
          </button>
        )}
        {last && typed ? (
          <Button block onClick={onFinish}>
            {finishLabel}
          </Button>
        ) : (
          <motion.span className="tap-hint" animate={{ x: [0, 8, 0] }} transition={{ duration: 1.1, repeat: Infinity }} onClick={next}>
            {Icon.chevron(28)}
          </motion.span>
        )}
      </div>
    </div>
  );
}

import { AnimatePresence, LayoutGroup, motion, Reorder } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { flushQueue } from "../api";
import { Burst, DrawCheck } from "../components/Burst";
import { Mascot } from "../components/Mascot";
import { Button, Icon, ProgressBar } from "../components/ui";
import { bouncy, snappy } from "../motion";
import { pick, pickList, useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import type { Question } from "../types";
import { useMonument } from "../useContent";

const ORDER_SECONDS = 30;

function shuffled<T>(arr: T[]): T[] {
  if (arr.length < 2) return [...arr];
  let out = [...arr];
  for (let tries = 0; tries < 10 && out.every((v, i) => v === arr[i]); tries++) {
    out = [...arr].sort(() => Math.random() - 0.5);
  }
  return out;
}

const isFill = (q: Question, prompt: string) => q.type === "mcq" && prompt.includes("___");

/** "Completa la frase": las fichas vuelan del banco al hueco (layoutId) y vuelven al tocarlas. */
function FillIn({ prompt, options, display, selected, onSelect, locked, result, answer, qid }: {
  prompt: string; options: string[]; display: number[]; selected: number | null; onSelect: (i: number | null) => void;
  locked: boolean; result: boolean | null; answer: number; qid: string;
}) {
  const [before, after] = prompt.split("___");
  return (
    <LayoutGroup id={qid}>
      <div className="fill-sentence">
        <span>{before}</span>
        <span className={`slot ${result === true ? "ok" : result === false ? "bad" : ""}`}>
          {selected !== null ? (
            <motion.button layoutId={`tile-${selected}`} className="tile in-slot" onClick={() => !locked && onSelect(null)} transition={snappy}>
              {options[selected]}
            </motion.button>
          ) : (
            <span className="slot-empty" />
          )}
        </span>
        <span>{after}</span>
      </div>
      {result === false && <p className="fill-answer">{options[answer]}</p>}
      <div className="tile-bank">
        {display.map((i) => (
          <span key={i} className="tile-ghost">
            {selected !== i && (
              <motion.button
                layoutId={`tile-${i}`}
                className="tile"
                disabled={locked}
                onClick={() => {
                  sfx.tap();
                  onSelect(i);
                }}
                whileTap={{ scale: 0.94 }}
                transition={snappy}
              >
                {options[i]}
              </motion.button>
            )}
            <span className="tile-shadow">{options[i]}</span>
          </span>
        ))}
      </div>
    </LayoutGroup>
  );
}

export function LessonPage() {
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const juvenil = useStore((s) => s.juvenil);
  const toggleJuvenil = useStore((s) => s.toggleJuvenil);
  const track = useStore((s) => s.track);
  const addReport = useStore((s) => s.addReport);
  const completeLesson = useStore((s) => s.completeLesson);

  const questions = useMemo(() => m?.questions ?? [], [m]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [reported, setReported] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ORDER_SECONDS);

  const q = questions[idx];
  const options = useMemo(() => (q ? pickList(q, "options", lang) : []), [q, lang]);
  const display = useMemo(() => {
    const idxs = options.map((_, i) => i);
    return q?.type === "mcq" ? shuffled(idxs) : idxs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, options.length]);

  useEffect(() => {
    setSelected(null);
    setResult(null);
    setReported(false);
    setTimeLeft(ORDER_SECONDS);
    if (q?.type === "order") setOrder(shuffled(options));
  }, [q, options]);

  useEffect(() => {
    if (q?.type !== "order" || result !== null) return;
    if (timeLeft <= 0) {
      check();
      return;
    }
    const tm = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, q, result]);

  if (!m || !q) return null;
  const prompt = pick(q, "prompt", lang);
  const fill = isFill(q, prompt);

  function check() {
    if (!q) return;
    const ok = q.type === "order" ? order.join("|") === options.join("|") : selected === q.answer;
    setResult(ok);
    setPulse((p) => p + 1);
    if (ok) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const n = c + 1;
        if (n >= 3) setTimeout(() => sfx.combo(), 180);
        return n;
      });
      sfx.correct();
    } else {
      setCombo(0);
      sfx.wrong();
    }
    track("answer", { questionId: q.id, correct: ok ? 1 : 0 });
  }

  function next() {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      return;
    }
    if (!m) return;
    completeLesson(m.id, correctCount, questions.length);
    void flushQueue();
    navigate(`/resultado/${m.id}`, { state: { correct: correctCount, total: questions.length } });
  }

  function reportError() {
    if (!m || !q) return;
    addReport({ kind: "error_contenido", monumentId: m.id, itemId: q.id, text: `Error reportado en: ${q.prompt_es}` });
    setReported(true);
    void flushQueue();
  }

  const canCheck = q.type === "order" || selected !== null;
  const explanation = juvenil && lang === "es" && q.juvenil_es ? q.juvenil_es : pick(q, "explanation", lang);
  const correctText = q.type === "order" ? options.join(" → ") : options[q.answer];
  const hint = q.type === "order" ? t.orderHint : q.type === "tf" ? t.tfHint : fill ? t.fillHint : t.pickHint;

  return (
    <div className="phone lesson">
      <div className="lesson-top">
        <button className="close-btn" onClick={() => navigate("/")} aria-label={t.back}>
          {Icon.close()}
        </button>
        <div className={`lesson-progress ${combo >= 3 ? "on-fire" : ""}`}>
          <ProgressBar value={(idx + (result !== null ? 1 : 0)) / questions.length} color={combo >= 3 ? "var(--oro)" : "var(--verde-ok)"} />
        </div>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.span key={combo} className="combo" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={bouncy}>
              {Icon.flame(18)} x{combo}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={q.id}
          className="question"
          initial={{ opacity: 0, x: 60 }}
          animate={result === false ? { opacity: 1, x: [0, -14, 12, -8, 6, 0] } : { opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.32 }}
        >
          <span className="q-hint">
            {q.type === "order" && Icon.clock(15)} {hint}
          </span>
          <div className="question-head">
            <Mascot size={92} mood={result === true ? "happy" : result === false ? "sad" : "idle"} pulse={pulse} />
            {!fill && (
              <motion.div className="speech" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...bouncy, delay: 0.1 }}>
                <h2>{prompt}</h2>
              </motion.div>
            )}
          </div>

          {fill ? (
            <FillIn prompt={prompt} options={options} display={display} selected={selected} onSelect={setSelected} locked={result !== null} result={result} answer={q.answer} qid={q.id} />
          ) : q.type === "order" ? (
            <>
              <div className="timer">
                <ProgressBar value={timeLeft / ORDER_SECONDS} color={timeLeft <= 8 ? "var(--rojo)" : "var(--oro)"} />
                <motion.b key={timeLeft} initial={{ scale: timeLeft <= 8 ? 1.4 : 1 }} animate={{ scale: 1 }}>
                  {timeLeft}
                </motion.b>
              </div>
              <Reorder.Group axis="y" values={order} onReorder={result === null ? setOrder : () => {}} className="order-list">
                {order.map((item, i) => (
                  <Reorder.Item key={item} value={item} className={`order-item ${result !== null ? (result ? "ok" : "bad") : ""}`} whileDrag={{ scale: 1.05, rotate: -1.5, boxShadow: "0 14px 28px rgba(0,0,0,.18)" }}>
                    <span className="order-num">{i + 1}</span>
                    <span className="order-text">{item}</span>
                    <span className="grip" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </>
          ) : (
            <div className={`options ${q.type === "tf" ? "tf" : ""}`}>
              {display.map((i, pos) => {
                const opt = options[i];
                const state = result === null ? (selected === i ? "selected" : "") : i === q.answer ? "ok" : selected === i ? "bad" : "dim";
                return (
                  <motion.button
                    key={`${q.id}-${i}`}
                    className={`option ${state}`}
                    disabled={result !== null}
                    onClick={() => {
                      sfx.tap();
                      setSelected(i);
                    }}
                    whileTap={{ scale: 0.96, y: 3 }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={state === "ok" ? { opacity: 1, y: 0, scale: [1, 1.05, 1] } : { opacity: 1, y: 0 }}
                    transition={{ ...snappy, delay: result === null ? 0.06 * pos : 0 }}
                  >
                    {q.type !== "tf" && <span className="option-key">{pos + 1}</span>}
                    <span>{opt}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {result !== null && (
          <motion.div className={`feedback ${result ? "ok" : "bad"}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
            <div className="feedback-head">
              <motion.span className="feedback-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={bouncy}>
                <DrawCheck ok={result} />
                {result && <Burst key={pulse} seed={pulse} />}
              </motion.span>
              <h3>{result ? t.correct : t.incorrect}</h3>
              {lang === "es" && q.juvenil_es && (
                <button className={`toggle ${juvenil ? "on" : ""}`} onClick={toggleJuvenil} aria-pressed={juvenil}>
                  <span className="toggle-knob" />
                  {t.juvenil}
                </button>
              )}
            </div>
            {!result && (
              <p className="correct-answer">
                <b>{t.correctAnswer}</b> {correctText}
              </p>
            )}
            <AnimatePresence mode="wait">
              <motion.p key={`${juvenil}`} className="explanation" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {explanation}
              </motion.p>
            </AnimatePresence>
            <div className="feedback-meta">
              <span className="chip">
                {Icon.book()} {q.cite || m.sources[0] || q.fragmentId}
              </span>
              <button className="link" onClick={reportError} disabled={reported}>
                {Icon.flag()} {reported ? t.reportSent : t.reportError}
              </button>
            </div>
            <Button variant={result ? "success" : "danger"} block onClick={next}>
              {t.continue}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {result === null && (
        <div className="lesson-bottom">
          <Button block disabled={!canCheck} onClick={check}>
            {t.check}
          </Button>
        </div>
      )}
    </div>
  );
}

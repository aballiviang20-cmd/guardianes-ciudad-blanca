import confetti from "canvas-confetti";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { flushQueue } from "../api";
import { Mascot } from "../components/Mascot";
import { Button, Icon, ProgressBar } from "../components/ui";
import { pick, pickList, useT } from "../i18n";
import { useStore } from "../store";
import { useMonument } from "../useContent";

const ORDER_SECONDS = 30;

function shuffled<T>(arr: T[]): T[] {
  if (arr.length < 2) return [...arr];
  let out = [...arr];
  // Baraja hasta que NO quede en el orden correcto.
  for (let tries = 0; tries < 10 && out.every((v, i) => v === arr[i]); tries++) {
    out = [...arr].sort(() => Math.random() - 0.5);
  }
  return out;
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
  const [reported, setReported] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ORDER_SECONDS);

  const q = questions[idx];
  const options = useMemo(() => (q ? pickList(q, "options", lang) : []), [q, lang]);
  // Opción múltiple: se baraja el orden en pantalla (la correcta no queda siempre en "A").
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

  // Contrarreloj para las preguntas de ordenar.
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

  function check() {
    if (!q) return;
    const ok = q.type === "order" ? order.join("|") === options.join("|") : selected === q.answer;
    setResult(ok);
    if (ok) {
      setCorrectCount((c) => c + 1);
      void confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 }, colors: ["#C0532D", "#E5A823", "#2E9E5B", "#3B82C4"] });
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

  return (
    <div className="phone lesson">
      <div className="lesson-top">
        <button className="close-btn" onClick={() => navigate("/")} aria-label={t.back}>
          {Icon.close()}
        </button>
        <ProgressBar value={(idx + (result !== null ? 1 : 0)) / questions.length} />
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={q.id}
          className="question"
          initial={{ opacity: 0, x: 80 }}
          animate={result === false ? { opacity: 1, x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80 }}
          transition={{ duration: 0.35 }}
        >
          <div className="question-head">
            <Mascot size={78} mood={result === true ? "happy" : result === false ? "sad" : "idle"} />
            <div className="speech">
              <span className="q-type">{q.type === "order" ? "⏱️ " + t.orderHint : q.type === "tf" ? "¿V o F?" : t.challenge}</span>
              <h2>{pick(q, "prompt", lang)}</h2>
            </div>
          </div>

          {q.type === "order" ? (
            <>
              <div className="timer">
                <ProgressBar value={timeLeft / ORDER_SECONDS} color={timeLeft <= 8 ? "var(--rojo)" : "var(--oro)"} />
                <span>
                  {timeLeft}
                  {t.timeLeft}
                </span>
              </div>
              <Reorder.Group axis="y" values={order} onReorder={result === null ? setOrder : () => {}} className="order-list">
                {order.map((item, i) => (
                  <Reorder.Item key={item} value={item} className={`order-item ${result !== null ? (result ? "ok" : "bad") : ""}`} whileDrag={{ scale: 1.04, boxShadow: "0 10px 24px rgba(0,0,0,.18)" }}>
                    <span className="order-num">{i + 1}</span>
                    {item}
                    <span className="grip">⋮⋮</span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </>
          ) : (
            <div className={`options ${q.type === "tf" ? "tf" : ""}`}>
              {display.map((i, pos) => {
                const opt = options[i];
                const state =
                  result === null ? (selected === i ? "selected" : "") : i === q.answer ? "ok" : selected === i ? "bad" : "dim";
                return (
                  <motion.button
                    key={`${q.id}-${i}`}
                    className={`option ${state}`}
                    disabled={result !== null}
                    onClick={() => setSelected(i)}
                    whileTap={{ scale: 0.97, y: 2 }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * pos }}
                  >
                    {q.type !== "tf" && <span className="option-key">{String.fromCharCode(65 + pos)}</span>}
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {result !== null && (
          <motion.div
            className={`feedback ${result ? "ok" : "bad"}`}
            initial={{ y: 260 }}
            animate={{ y: 0 }}
            exit={{ y: 260 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="feedback-head">
              <motion.span className="feedback-icon" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }}>
                {result ? Icon.check(28) : Icon.close(28)}
              </motion.span>
              <h3>{result ? t.correct : t.incorrect}</h3>
              {lang === "es" && (
                <label className="switch">
                  <input type="checkbox" checked={juvenil} onChange={toggleJuvenil} />
                  <span>{t.juvenil}</span>
                </label>
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
                📚 {t.source}: {m.sources.length ? m.sources[0] : q.fragmentId}
              </span>
              <button className="link" onClick={reportError} disabled={reported}>
                {reported ? t.reportSent : `⚑ ${t.reportError}`}
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

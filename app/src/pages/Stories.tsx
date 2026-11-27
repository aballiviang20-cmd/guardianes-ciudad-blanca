import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MonumentIcon } from "../components/MonumentIcon";
import { Button, Icon } from "../components/ui";
import { pick, useT } from "../i18n";
import { useStore } from "../store";
import { useMonument } from "../useContent";

/** Historias tipo "stories": barras de progreso arriba, tocar a la derecha avanza y a la izquierda retrocede. */
export function StoriesPage() {
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const completeStories = useStore((s) => s.completeStories);
  const [i, setI] = useState(0);
  if (!m) return null;
  const stories = m.stories;
  const last = i >= stories.length - 1;
  const story = stories[i];

  const next = () => {
    if (last) {
      completeStories(m.id);
      navigate(m.questions.length ? `/reto/${m.id}` : "/");
    } else setI(i + 1);
  };

  return (
    <div className="phone stories" style={{ ["--accent" as string]: m.color }}>
      <div className="story-bars">
        {stories.map((s, j) => (
          <span key={s.id} className="story-bar">
            <motion.span className="story-bar-fill" initial={false} animate={{ width: j < i ? "100%" : j === i ? "100%" : "0%" }} transition={{ duration: j === i ? 5 : 0.2, ease: "linear" }} />
          </span>
        ))}
      </div>
      <button className="close-btn light" onClick={() => navigate("/")} aria-label={t.back}>
        {Icon.close()}
      </button>
      <div className="story-tap left" onClick={() => setI(Math.max(0, i - 1))} />
      <div className="story-tap right" onClick={next} />
      <AnimatePresence mode="wait">
        {story && (
          <motion.article
            key={story.id}
            className="story-card"
            initial={{ opacity: 0, x: 60, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -60, rotate: -3 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
          >
            <motion.span className="story-icon" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: "spring" }}>
              <MonumentIcon id={m.id} size={96} />
            </motion.span>
            <span className="story-kicker">{m.name[lang]}</span>
            <h2>{pick(story, "title", lang)}</h2>
            <p>{pick(story, "text", lang)}</p>
            {m.sources.length > 0 && (
              <small className="story-source">
                {t.source}: {m.sources.join(" · ")}
              </small>
            )}
          </motion.article>
        )}
      </AnimatePresence>
      <div className="story-footer">
        {last ? (
          <Button variant="secondary" block onClick={next}>
            {m.questions.length ? t.finish : t.continue}
          </Button>
        ) : (
          <span className="tap-hint">{t.tapToContinue} →</span>
        )}
      </div>
    </div>
  );
}

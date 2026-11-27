import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Scene } from "../components/Scene";
import { Button, Icon } from "../components/ui";
import { soft } from "../motion";
import { pick, useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import { useMonument } from "../useContent";

/** Historias tipo "stories": ilustración animada arriba, relato en serif abajo. Toque derecho avanza. */
export function StoriesPage() {
  const level = useStore((s) => s.account?.level ?? null);
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const completeStories = useStore((s) => s.completeStories);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  if (!m) return null;
  // 4to: relato más corto (2 historias); 6to y sin cuenta: todas
  const stories = level === "4to" ? m.stories.slice(0, 2) : m.stories;
  const last = i >= stories.length - 1;
  const story = stories[i];

  const go = (n: number) => {
    if (n < 0) return;
    if (n >= stories.length) {
      completeStories(m.id);
      navigate(m.questions.length ? `/reto/${m.id}` : "/");
      return;
    }
    sfx.tap();
    setDir(n > i ? 1 : -1);
    setI(n);
  };

  return (
    <div className="phone stories" style={{ ["--accent" as string]: m.color }}>
      <div className="story-art">
        <Scene id={m.id} />
        <div className="story-bars">
          {stories.map((s, j) => (
            <span key={s.id} className="story-bar">
              <motion.span className="story-bar-fill" initial={false} animate={{ scaleX: j <= i ? 1 : 0 }} transition={{ duration: 0.35 }} />
            </span>
          ))}
        </div>
        <button className="close-btn light" onClick={() => navigate("/")} aria-label={t.back}>
          {Icon.close()}
        </button>
        {m.year && <span className="story-year serif">{m.year}</span>}
      </div>

      <div className="story-tap left" onClick={() => go(i - 1)} />
      <div className="story-tap right" onClick={() => go(i + 1)} />

      <div className="story-body">
        <AnimatePresence mode="wait" custom={dir}>
          {story && (
            <motion.article
              key={story.id}
              custom={dir}
              initial={{ opacity: 0, x: 40 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * dir }}
              transition={soft}
            >
              <span className="story-kicker">{m.name[lang]}</span>
              <h2 className="serif">{pick(story, "title", lang)}</h2>
              <p>{pick(story, "text", lang)}</p>
            </motion.article>
          )}
        </AnimatePresence>
        {story?.cite && (
          <small className="story-source">
            {Icon.book(13)} {story.cite}
          </small>
        )}
      </div>

      <div className="story-footer">
        {last ? (
          <Button block onClick={() => go(i + 1)}>
            {m.questions.length ? t.finish : t.continue}
          </Button>
        ) : (
          <motion.span className="tap-hint" animate={{ x: [0, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
            {Icon.chevron(28)}
          </motion.span>
        )}
      </div>
    </div>
  );
}

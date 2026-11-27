import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Rays } from "../components/Burst";
import { CharOutfit, CharPose } from "../components/Character";
import { Figurita } from "../components/Figurita";
import { Button, CountUp, Icon } from "../components/ui";
import { bouncy } from "../motion";
import { pick, useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import { useMonument } from "../useContent";

export function ResultPage() {
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const avatar = useStore((s) => s.avatar);
  const location = useLocation() as { state?: { correct: number; total: number; stars?: number } };
  const saved = useStore((s) => (id ? s.progress[id] : undefined));
  const correct = location.state?.correct ?? saved?.best ?? 0;
  const total = location.state?.total ?? m?.questions.length ?? 0;
  const stars = location.state?.stars ?? saved?.stars ?? 1;
  const xp = 10 + Math.min(correct, 10) * 2;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    sfx.complete();
    const timers = [0, 1, 2].map((k) =>
      setTimeout(() => {
        if (k < stars) {
          setShown(k + 1);
          sfx.star(k);
        }
      }, 700 + k * 420),
    );
    timers.push(
      setTimeout(() => {
        void confetti({ particleCount: 110, spread: 90, startVelocity: 40, origin: { y: 0.5 }, colors: ["#D52B1E", "#F9E300", "#007934", "#C0532D"], shapes: ["square"], scalar: 0.9 });
      }, 700 + stars * 420),
    );
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  if (!m) return null;
  return (
    <div className="phone result">
      <div className="result-cast">
        <CharOutfit c={avatar.c} outfit={avatar.outfit} size={130} anim="jump" pulse={shown} />
        <CharPose c="orki" pose="salta" size={120} anim="jump" pulse={shown + 1} />
      </div>
      <motion.h1 className="serif" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        {t.lessonDone}
      </motion.h1>
      <div className="result-stars">
        {[0, 1, 2].map((k) => (
          <motion.span
            key={k}
            className={`big-star s${k} ${k < shown ? "on" : ""}`}
            animate={k < shown ? { scale: [0.3, 1.45, 1], rotate: [-40, 12, 0] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
          >
            {Icon.star(k === 1 ? 64 : 50)}
          </motion.span>
        ))}
      </div>
      <div className="result-stats">
        <motion.div className="result-stat xp" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...bouncy, delay: 0.25 }}>
          <span>XP</span>
          <b>
            {Icon.gem(22)} +<CountUp to={xp} />
          </b>
        </motion.div>
        <motion.div className="result-stat acc" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...bouncy, delay: 0.35 }}>
          <span>{t.accuracy}</span>
          <b>
            <CountUp to={total ? Math.round((correct / total) * 100) : 0} />%
          </b>
        </motion.div>
      </div>
      <div className="reward">
        <Rays />
        <Figurita
          monumentId={m.id}
          name={m.name[lang]}
          year={m.year}
          color={m.color}
          unlocked
          reveal
          size="lg"
          rarityLabel={t.common}
          backText={m.stories[0] ? pick(m.stories[0], "title", lang) : undefined}
        />
      </div>
      <div className="result-actions">
        <Button variant="secondary" block onClick={() => navigate("/album")}>
          {t.viewAlbum}
        </Button>
        <Button block onClick={() => navigate("/")}>
          {t.continue}
        </Button>
      </div>
    </div>
  );
}

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Figurita } from "../components/Figurita";
import { Mascot } from "../components/Mascot";
import { Button, CountUp, Icon } from "../components/ui";
import { pick, useT } from "../i18n";
import { useStore } from "../store";
import { useMonument } from "../useContent";

export function ResultPage() {
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { correct: number; total: number } };
  const best = useStore((s) => (id ? s.progress[id]?.best ?? 0 : 0));
  const correct = location.state?.correct ?? best;
  const total = location.state?.total ?? m?.questions.length ?? 0;
  const xp = 10 + Math.min(correct, 10) * 2;

  useEffect(() => {
    const end = Date.now() + 1200;
    const colors = ["#C0532D", "#E5A823", "#2E9E5B", "#3B82C4"];
    (function frame() {
      void confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      void confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  if (!m) return null;
  return (
    <div className="phone result">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 160 }}>
        <Mascot mood="happy" size={130} />
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        {t.lessonDone}
      </motion.h1>
      <div className="result-stats">
        <motion.div className="result-stat xp" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <span>{t.xp}</span>
          <b>
            {Icon.gem(20)} +<CountUp to={xp} />
          </b>
        </motion.div>
        <motion.div className="result-stat acc" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <span>%</span>
          <b>
            <CountUp to={total ? Math.round((correct / total) * 100) : 0} />%
          </b>
        </motion.div>
      </div>
      <motion.p className="new-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        {t.newCard}
      </motion.p>
      <Figurita
        monumentId={m.id}
        name={m.name[lang]}
        color={m.color}
        unlocked
        reveal
        size="lg"
        rarityLabel={t.common}
        backText={m.stories[0] ? pick(m.stories[0], "title", lang) : undefined}
      />
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

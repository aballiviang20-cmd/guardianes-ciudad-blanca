import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Rays } from "../components/Burst";
import { Figurita } from "../components/Figurita";
import { Mascot } from "../components/Mascot";
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
  const location = useLocation() as { state?: { correct: number; total: number } };
  const best = useStore((s) => (id ? (s.progress[id]?.best ?? 0) : 0));
  const correct = location.state?.correct ?? best;
  const total = location.state?.total ?? m?.questions.length ?? 0;
  const xp = 10 + Math.min(correct, 10) * 2;

  useEffect(() => {
    sfx.complete();
    const tm = setTimeout(() => {
      sfx.reveal();
      void confetti({ particleCount: 90, spread: 80, startVelocity: 38, origin: { y: 0.55 }, colors: ["#C0532D", "#E5A823", "#2E9E5B", "#3B82C4"], shapes: ["square"], scalar: 0.9 });
    }, 650);
    return () => clearTimeout(tm);
  }, []);

  if (!m) return null;
  return (
    <div className="phone result">
      <motion.div className="result-top" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Mascot mood="happy" size={110} pulse={1} />
        <h1 className="serif">{t.lessonDone}</h1>
      </motion.div>
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
      <motion.p className="new-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
        {t.newCard}
      </motion.p>
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

import { motion } from "motion/react";
import { useState } from "react";
import { Mascot } from "../components/Mascot";
import { Scene } from "../components/Scene";
import { Button } from "../components/ui";
import { bouncy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";

export function Welcome() {
  const { t, lang } = useT();
  const setProfile = useStore((s) => s.setProfile);
  const setLang = useStore((s) => s.setLang);
  const [alias, setAlias] = useState("");
  const [course, setCourse] = useState("");
  const valid = alias.trim().length >= 2 && course.trim().length >= 2;

  return (
    <div className="phone welcome">
      <div className="welcome-hero">
        <Scene id="sucre" />
        <div className="welcome-mascot">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...bouncy, delay: 0.5 }}>
            <Mascot mood="wave" size={128} />
          </motion.div>
        </div>
        <button className="lang-toggle small" onClick={() => setLang(lang === "es" ? "en" : "es")}>
          <span className={lang === "es" ? "on" : ""}>
            <b>ES</b>
          </span>
          <span className={lang === "en" ? "on" : ""}>
            <b>EN</b>
          </span>
        </button>
      </div>
      <div className="welcome-body">
        <motion.h1 className="serif" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {t.appName}
        </motion.h1>
        <div className="motto">
          {t.motto.map((w, i) => (
            <motion.span key={w} initial={{ opacity: 0, y: 16, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...bouncy, delay: 0.7 + i * 0.18 }}>
              {w}
            </motion.span>
          ))}
        </div>
        <form
          className="welcome-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            sfx.reveal();
            setProfile(alias.slice(0, 16), course.slice(0, 12));
          }}
        >
          <input value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={16} placeholder={t.aliasPh} autoComplete="off" aria-label={t.aliasPh} />
          <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder={t.coursePh} autoComplete="off" aria-label={t.coursePh} />
          <Button type="submit" block disabled={!valid}>
            {t.start}
          </Button>
        </form>
      </div>
    </div>
  );
}

import { motion } from "motion/react";
import { useState } from "react";
import { Mascot } from "../components/Mascot";
import { Skyline } from "../components/Skyline";
import { Button } from "../components/ui";
import { useT } from "../i18n";
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
        <Skyline />
        <motion.div className="welcome-mascot" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, type: "spring" }}>
          <Mascot mood="wave" size={120} />
        </motion.div>
      </div>
      <div className="welcome-body">
        <button className="lang-toggle small" onClick={() => setLang(lang === "es" ? "en" : "es")}>
          <span className={lang === "es" ? "on" : ""}>ES</span>
          <span className={lang === "en" ? "on" : ""}>EN</span>
        </button>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {t.appName}
        </motion.h1>
        <div className="motto">
          {t.motto.map((w, i) => (
            <motion.span key={w} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.8 + i * 0.25, type: "spring" }}>
              {w}
            </motion.span>
          ))}
        </div>
        <p className="lead">{t.welcomeLead}</p>
        <form
          className="welcome-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setProfile(alias.slice(0, 16), course.slice(0, 12));
          }}
        >
          <label>
            {t.alias}
            <input value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={16} placeholder="ej. CondorVeloz" autoComplete="off" />
            <small>{t.aliasHint}</small>
          </label>
          <label>
            {t.course}
            <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder="4TO-A" autoComplete="off" />
            <small>{t.courseHint}</small>
          </label>
          <Button type="submit" block disabled={!valid}>
            {t.start}
          </Button>
        </form>
      </div>
    </div>
  );
}

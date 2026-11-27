import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { StudentShell } from "../components/Shell";
import { useOnline } from "../components/ui";
import { useT } from "../i18n";
import { useStore } from "../store";
import type { LeagueCourse } from "../types";

export function LeaguePage() {
  const { t } = useT();
  const online = useOnline();
  const course = useStore((s) => s.profile?.course);
  const pending = useStore((s) => s.queue.length);
  const [courses, setCourses] = useState<LeagueCourse[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .league()
        .then((r) => alive && setCourses(r.courses))
        .catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [online]);

  const max = Math.max(1, ...(courses ?? []).map((c) => c.xp));
  return (
    <StudentShell>
      <section className="page-head">
        <h2>🏆 {t.league}</h2>
        <p>{t.leagueLead}</p>
        {!online && <p className="note">{t.offlineLeague}</p>}
        {pending > 0 && <p className="note">⏳ {pending} …</p>}
      </section>
      <ol className="league">
        {(courses ?? []).map((c, i) => (
          <motion.li
            key={c.course}
            className={`league-row ${c.course === course ? "mine" : ""}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            layout
          >
            <span className={`rank r${i + 1}`}>{i + 1}</span>
            <div className="league-main">
              <div className="league-name">
                <b>{c.course}</b>
                {c.course === course && <span className="you">{t.yourCourse}</span>}
              </div>
              <div className="league-bar">
                <motion.span initial={{ width: 0 }} animate={{ width: `${(c.xp / max) * 100}%` }} transition={{ type: "spring", stiffness: 70, delay: 0.2 + i * 0.07 }} />
              </div>
              <small>
                {c.members} {t.members} · {c.lessons} {t.lessons} · {c.reports} {t.reports}
              </small>
            </div>
            <b className="league-xp">{c.xp} XP</b>
          </motion.li>
        ))}
      </ol>
    </StudentShell>
  );
}

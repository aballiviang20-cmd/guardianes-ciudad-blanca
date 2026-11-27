import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { StudentShell } from "../components/Shell";
import { Icon, useOnline } from "../components/ui";
import { bouncy } from "../motion";
import { useT } from "../i18n";
import { useStore } from "../store";
import type { LeagueCourse } from "../types";

export function LeaguePage() {
  const { t } = useT();
  const online = useOnline();
  const course = useStore((s) => s.profile?.course);
  const [courses, setCourses] = useState<LeagueCourse[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.league().then((r) => alive && setCourses(r.courses)).catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [online]);

  const list = courses ?? [];
  const max = Math.max(1, ...list.map((c) => c.xp));
  const podium = [list[1], list[0], list[2]];

  return (
    <StudentShell>
      <section className="page-head row">
        <h1 className="serif">{t.league}</h1>
        {!online && <span className="note">{Icon.cloudOff(14)} {t.offlineLeague}</span>}
      </section>

      {list.length > 0 && (
        <div className="podium">
          {podium.map((c, i) =>
            c ? (
              <motion.div
                key={c.course}
                className={`podium-col p${i} ${c.course === course ? "mine" : ""}`}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...bouncy, delay: [0.25, 0.1, 0.4][i] }}
              >
                <span className="podium-name">{c.course}</span>
                <span className="podium-xp">{c.xp} XP</span>
                <div className="podium-block">
                  <span className="serif">{[2, 1, 3][i]}</span>
                </div>
              </motion.div>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      )}

      <ol className="league">
        {list.map((c, i) => (
          <motion.li key={c.course} className={`league-row ${c.course === course ? "mine" : ""}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} layout>
            <span className={`rank r${i + 1}`}>{i + 1}</span>
            <div className="league-main">
              <div className="league-name">
                <b>{c.course}</b>
                {c.course === course && <span className="you">{t.yourCourse}</span>}
              </div>
              <div className="league-bar">
                <motion.span initial={{ width: 0 }} animate={{ width: `${(c.xp / max) * 100}%` }} transition={{ type: "spring", stiffness: 60, delay: 0.4 + i * 0.06 }} />
              </div>
              <small>
                {c.members} {t.members} · {c.lessons} {t.lessons} · {c.reports} {t.reports}
              </small>
            </div>
            <b className="league-xp">{c.xp}</b>
          </motion.li>
        ))}
      </ol>
    </StudentShell>
  );
}

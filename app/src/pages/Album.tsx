import { motion } from "motion/react";
import { Figurita } from "../components/Figurita";
import { StudentShell } from "../components/Shell";
import { pick, useT } from "../i18n";
import { useStore } from "../store";
import { useContent } from "../useContent";

export function AlbumPage() {
  const { t, lang } = useT();
  const content = useContent();
  const progress = useStore((s) => s.progress);
  const monuments = content?.monuments ?? [];
  const total = monuments.length * 2;
  const have = monuments.reduce((n, m) => n + (progress[m.id]?.lesson ? 1 : 0) + (progress[m.id]?.golden ? 1 : 0), 0);

  return (
    <StudentShell>
      <section className="page-head">
        <h2>{t.album}</h2>
        <p>{t.albumLead}</p>
        <div className="album-count">
          <motion.div className="album-count-fill" initial={{ width: 0 }} animate={{ width: `${total ? (have / total) * 100 : 0}%` }} transition={{ type: "spring", stiffness: 80 }} />
          <span>
            {have}/{total}
          </span>
        </div>
      </section>
      <div className="album-grid">
        {monuments.map((m, i) => (
          <motion.div key={m.id} className="album-pair" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Figurita
              monumentId={m.id}
              name={m.name[lang]}
              color={m.color}
              unlocked={!!progress[m.id]?.lesson}
              lockedLabel={t.lockedLesson}
              rarityLabel={t.common}
              backText={m.stories[0] ? pick(m.stories[0], "title", lang) : m.name[lang]}
            />
            <Figurita
              monumentId={m.id}
              name={m.name[lang]}
              color={m.color}
              golden
              unlocked={!!progress[m.id]?.golden}
              lockedLabel={t.lockedGolden}
              rarityLabel={t.golden}
              backText={m.stories[1] ? pick(m.stories[1], "title", lang) : m.name[lang]}
            />
          </motion.div>
        ))}
      </div>
    </StudentShell>
  );
}

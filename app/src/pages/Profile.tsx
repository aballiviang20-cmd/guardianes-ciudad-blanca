import { motion } from "motion/react";
import { CHARACTERS, OUTFITS, outfitImg, safeChar, type CharId, type Outfit } from "../characters";
import { CharFace, CharOutfit } from "../components/Character";
import { StudentShell } from "../components/Shell";
import { Icon } from "../components/ui";
import { bouncy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";

/** Perfil: elegir personaje y vestimenta. Las vestimentas bolivianas se desbloquean con XP. */
export function ProfilePage() {
  const { lang } = useT();
  const avatar = useStore((s) => s.avatar);
  const setAvatar = useStore((s) => s.setAvatar);
  const xp = useStore((s) => s.xp);
  const profile = useStore((s) => s.profile);
  const progress = useStore((s) => s.progress);
  const stars = Object.values(progress).reduce((n, p) => n + (p.stars ?? 0), 0);
  const ch = CHARACTERS[safeChar(avatar.c)];

  return (
    <StudentShell>
      <section className="profile-hero" style={{ ["--accent" as string]: ch.color }}>
        <div className="profile-stage">
          <CharOutfit c={avatar.c} outfit={avatar.outfit} size={190} anim="idle" key={`${avatar.c}-${avatar.outfit}`} />
        </div>
        <div className="profile-info">
          <h1 className="serif">{profile?.alias}</h1>
          <span className="profile-course">{profile?.course}</span>
          <div className="profile-stats">
            <span>{Icon.gem(18)} {xp} XP</span>
            <span>{Icon.star(18)} {stars}</span>
          </div>
        </div>
      </section>

      <h3 className="section-title">{lang === "es" ? "Personaje" : "Character"}</h3>
      <div className="char-row">
        {(Object.keys(CHARACTERS) as CharId[]).map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.92 }}
            className={`char-mini ${avatar.c === c ? "on" : ""}`}
            style={{ ["--accent" as string]: CHARACTERS[c].color }}
            onClick={() => {
              sfx.tap();
              setAvatar(c);
            }}
          >
            <CharFace c={c} face={avatar.c === c ? "alegre" : "pensativo"} size={64} anim={avatar.c === c ? "pop" : "none"} />
            <b>{CHARACTERS[c].name}</b>
          </motion.button>
        ))}
      </div>

      <h3 className="section-title">{lang === "es" ? "Vestimenta" : "Outfit"}</h3>
      <div className="outfit-grid">
        {ch.outfits.map((o: Outfit, i) => {
          const need = OUTFITS[o].xp;
          const locked = xp < need;
          return (
            <motion.button
              key={o}
              className={`outfit-card ${avatar.outfit === o ? "on" : ""} ${locked ? "locked" : ""}`}
              disabled={locked}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...bouncy, delay: i * 0.06 }}
              whileTap={locked ? undefined : { scale: 0.95 }}
              onClick={() => {
                sfx.reveal();
                setAvatar(avatar.c, o);
              }}
            >
              <img src={outfitImg(avatar.c, o)} alt="" draggable={false} />
              <b>{OUTFITS[o][lang]}</b>
              {locked ? (
                <small>
                  {Icon.lock(14)} {need} XP
                </small>
              ) : (
                <small>{avatar.outfit === o ? (lang === "es" ? "Puesto" : "Wearing") : lang === "es" ? "Usar" : "Wear"}</small>
              )}
            </motion.button>
          );
        })}
      </div>
    </StudentShell>
  );
}

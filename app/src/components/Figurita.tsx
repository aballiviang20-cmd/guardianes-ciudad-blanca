import { motion } from "motion/react";
import { useState } from "react";
import { MonumentIcon } from "./MonumentIcon";
import { Icon } from "./ui";

type Props = {
  monumentId: string;
  name: string;
  color: string;
  golden?: boolean;
  unlocked: boolean;
  lockedLabel?: string;
  rarityLabel: string;
  backText?: string;
  /** Si se pasa, la carta aparece primero de espaldas y se voltea sola (revelación). */
  reveal?: boolean;
  size?: "sm" | "lg";
};

/** Figurita coleccionable con volteo 3D. Las doradas tienen brillo animado. */
export function Figurita({ monumentId, name, color, golden, unlocked, lockedLabel, rarityLabel, backText, reveal, size = "sm" }: Props) {
  const [flipped, setFlipped] = useState(false);
  if (!unlocked) {
    return (
      <div className={`figurita figurita-${size} locked`}>
        <div className="figurita-face">
          <span className="lock-icon">{Icon.lock(28)}</span>
          <span className="locked-name">{name}</span>
          <span className="locked-hint">{lockedLabel}</span>
        </div>
      </div>
    );
  }
  return (
    <motion.div
      className={`figurita figurita-${size} ${golden ? "golden" : ""}`}
      onClick={() => backText && setFlipped((f) => !f)}
      initial={reveal ? { rotateY: 180, scale: 0.6 } : false}
      animate={{ rotateY: flipped ? 180 : 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 12, delay: reveal ? 0.5 : 0 }}
      style={{ transformStyle: "preserve-3d" }}
      whileHover={{ y: -4 }}
    >
      <div className="figurita-face front" style={{ background: golden ? undefined : `linear-gradient(160deg, ${color}, #1d1d1d33), ${color}` }}>
        {golden && <span className="shine" />}
        <span className="rarity">{rarityLabel}</span>
        <span className="figurita-icon">
          <MonumentIcon id={monumentId} size={size === "lg" ? 86 : 52} />
        </span>
        <span className="figurita-name">{name}</span>
        <span className="figurita-stars">
          {Icon.star(14)}
          {golden && Icon.star(14)}
          {golden && Icon.star(14)}
        </span>
      </div>
      <div className="figurita-face back">
        <span className="back-pattern" />
        {backText && <span className="back-text">{backText}</span>}
      </div>
    </motion.div>
  );
}

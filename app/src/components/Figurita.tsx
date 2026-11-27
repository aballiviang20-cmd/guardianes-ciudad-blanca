import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useState } from "react";
import { Scene } from "./Scene";
import { Icon } from "./ui";

type Props = {
  monumentId: string;
  name: string;
  year?: number;
  color: string;
  golden?: boolean;
  unlocked: boolean;
  lockedLabel?: string;
  rarityLabel: string;
  backText?: string;
  reveal?: boolean;
  size?: "sm" | "lg";
};

/** Figurita coleccionable: ilustración del lugar, inclinación 3D al mover el puntero y volteo al tocar. */
export function Figurita({ monumentId, name, year, color, golden, unlocked, lockedLabel, rarityLabel, backText, reveal, size = "sm" }: Props) {
  const [flipped, setFlipped] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);

  if (!unlocked) {
    return (
      <div className={`figurita figurita-${size} locked`}>
        <div className="figurita-face">
          <span className="lock-icon">{Icon.lock(26)}</span>
          {year && <span className="locked-year">{year}</span>}
          <span className="locked-hint">{lockedLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`figurita figurita-${size} ${golden ? "golden" : ""}`}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", ["--accent" as string]: color }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      onClick={() => backText && setFlipped((f) => !f)}
      initial={reveal ? { scale: 0.4, rotateZ: -8, opacity: 0 } : false}
      animate={{ scale: 1, rotateZ: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 12, delay: reveal ? 0.55 : 0 }}
    >
      <motion.div className="figurita-inner" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 160, damping: 18 }}>
        <div className="figurita-face front">
          <div className="figurita-art">
            <Scene id={monumentId} animated={size === "lg"} />
          </div>
          <div className="figurita-info">
            <span className="figurita-name">{name}</span>
            {year && <span className="figurita-year">{year}</span>}
          </div>
          <span className="rarity">
            {Icon.star(11)}
            {golden && Icon.star(11)}
            {golden && Icon.star(11)} {rarityLabel}
          </span>
          {golden && <span className="shine" />}
          <motion.span className="glare" style={{ left: glareX }} />
        </div>
        <div className="figurita-face back">
          <span className="back-pattern" />
          {backText && <span className="back-text">{backText}</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { faceImg, outfitImg, poseImg, type CharId, type Face, type Outfit, type Pose } from "../characters";

export type Anim = "idle" | "jump" | "sad" | "wave" | "pop" | "none";

/**
 * Animación con física de dibujo animado sobre las ilustraciones:
 * - jump: anticipación (se agacha), despegue estirado, aterrizaje aplastado y rebote.
 * - idle: respiración suave. - sad: se encoge. - pop: aparece con rebote.
 * `pulse` reinicia la animación aunque el estado no cambie.
 */
function variants(anim: Anim) {
  switch (anim) {
    case "jump":
      return {
        animate: { y: [0, 6, -34, 0, 4, 0], scaleY: [1, 0.82, 1.12, 0.86, 1.05, 1], scaleX: [1, 1.14, 0.9, 1.12, 0.97, 1] },
        transition: { duration: 0.8, times: [0, 0.14, 0.42, 0.66, 0.84, 1], ease: "easeOut" as const },
      };
    case "sad":
      return { animate: { y: [0, 6, 4], scaleY: [1, 0.92, 0.95], rotate: [0, -4, -3] }, transition: { duration: 0.55 } };
    case "wave":
      return { animate: { rotate: [0, -6, 5, -4, 0], y: [0, -3, 0] }, transition: { duration: 1.4, repeat: Infinity, repeatDelay: 0.6 } };
    case "pop":
      return { initial: { scale: 0, rotate: -12 }, animate: { scale: 1, rotate: 0 }, transition: { type: "spring" as const, stiffness: 380, damping: 13 } };
    case "idle":
      return { animate: { scaleY: [1, 1.03, 1], y: [0, -2, 0] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } };
    default:
      return {};
  }
}

function Sprite({ src, size, anim, pulse, alt, shadow = true }: { src: string; size: number; anim: Anim; pulse: number; alt: string; shadow?: boolean }) {
  const v = variants(anim);
  return (
    <span className="sprite" style={{ width: size, height: size }}>
      {shadow && (
        <motion.span
          key={`sh-${anim}-${pulse}`}
          className="sprite-shadow"
          animate={anim === "jump" ? { scaleX: [1, 1.1, 0.5, 1.12, 1, 1], opacity: [0.2, 0.22, 0.08, 0.22, 0.2, 0.2] } : undefined}
          transition={{ duration: 0.8, times: [0, 0.14, 0.42, 0.66, 0.84, 1] }}
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={`${src}-${anim}-${pulse}`}
          src={src}
          alt={alt}
          draggable={false}
          className="sprite-img"
          style={{ originY: 1 }}
          {...v}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
        />
      </AnimatePresence>
    </span>
  );
}

export function CharFace({ c, face, size = 90, anim = "idle", pulse = 0 }: { c: CharId; face: Face; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={faceImg(c, face)} size={size} anim={anim} pulse={pulse} alt={c} shadow={false} />;
}

export function CharPose({ c, pose, size = 160, anim = "idle", pulse = 0 }: { c: CharId; pose: Pose; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={poseImg(c, pose)} size={size} anim={anim} pulse={pulse} alt={c} />;
}

export function CharOutfit({ c, outfit, size = 160, anim = "idle", pulse = 0 }: { c: CharId; outfit: Outfit; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={outfitImg(c, outfit)} size={size} anim={anim} pulse={pulse} alt={c} />;
}

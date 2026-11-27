import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { faceImg, outfitImg, poseImg, type CharId, type Face, type Outfit, type Pose } from "../characters";

export type Anim = "idle" | "jump" | "sad" | "wave" | "pop" | "walk" | "talk" | "none";

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
    case "walk":
      // paso a paso: rebote corto y balanceo, como un ciclo de caminata de dibujo animado
      return { animate: { y: [0, -7, 0, -7, 0], rotate: [-3, 0, 3, 0, -3], scaleY: [1, 1.03, 0.97, 1.03, 1] }, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const } };
    case "talk":
      // habla: asiente y gira la cabeza sin parar mientras está en la viñeta
      return {
        initial: { scale: 0.4, rotate: -10, opacity: 0 },
        animate: { scale: [1, 1.05, 0.98, 1.04, 1], rotate: [0, -4, 2, -2, 0], y: [0, -4, 0, -3, 0], opacity: 1 },
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const, opacity: { duration: 0.2 } },
      };
    case "idle":
      // el movimiento continuo lo hace la capa "viva" de Sprite
      return {};
    default:
      return {};
  }
}

/**
 * Capa "viva": todo personaje respira, se balancea y da un saltito cada pocos segundos, siempre.
 * Cada instancia arranca en otra fase para que el elenco no se mueva sincronizado.
 */
const ALIVE_BODY = {
  y: [0, -3, 0, -3, 0, -13, 0, 0],
  rotate: [0, -2, 0, 2, 0, -1, 1, 0],
  scaleY: [1, 1.025, 1, 1.025, 0.93, 1.07, 0.96, 1],
  scaleX: [1, 0.985, 1, 0.985, 1.06, 0.95, 1.03, 1],
};
const ALIVE_FACE = {
  y: [0, -3, 0, -2, 0, -6, 0],
  rotate: [0, -4, 0, 4, 0, -2, 0],
  scale: [1, 1.02, 1, 1.02, 0.97, 1.05, 1],
};
const ALIVE_TIMES = { body: [0, 0.14, 0.28, 0.42, 0.56, 0.66, 0.78, 1], face: [0, 0.18, 0.36, 0.54, 0.7, 0.8, 1] };

function Sprite({ src, size, anim, pulse, alt, shadow = true, kind = "body" }: { src: string; size: number; anim: Anim; pulse: number; alt: string; shadow?: boolean; kind?: "body" | "face" }) {
  const v = variants(anim);
  const reduced = useReducedMotion();
  const phase = useMemo(() => Math.random(), []);
  const alive = anim !== "none" && anim !== "walk" && !reduced;
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
      <motion.span
        className="sprite-alive"
        style={{ originY: 1 }}
        animate={alive ? (kind === "face" ? ALIVE_FACE : ALIVE_BODY) : undefined}
        transition={alive ? { duration: (kind === "face" ? 2.8 : 3.6) + phase * 1.4, times: ALIVE_TIMES[kind], repeat: Infinity, ease: "easeInOut", delay: phase * 1.2 } : undefined}
      >
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
      </motion.span>
    </span>
  );
}

export function CharFace({ c, face, size = 90, anim = "idle", pulse = 0 }: { c: CharId; face: Face; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={faceImg(c, face)} size={size} anim={anim} pulse={pulse} alt={c} shadow={false} kind="face" />;
}

export function CharPose({ c, pose, size = 160, anim = "idle", pulse = 0 }: { c: CharId; pose: Pose; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={poseImg(c, pose)} size={size} anim={anim} pulse={pulse} alt={c} />;
}

export function CharOutfit({ c, outfit, size = 160, anim = "idle", pulse = 0 }: { c: CharId; outfit: Outfit; size?: number; anim?: Anim; pulse?: number }) {
  return <Sprite src={outfitImg(c, outfit)} size={size} anim={anim} pulse={pulse} alt={c} />;
}

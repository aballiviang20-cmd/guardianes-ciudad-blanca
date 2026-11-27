import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
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

/* ------------------------------------------------------------------------------------------
 * Vida continua (en 3 capas, todas suaves y desfasadas entre personajes):
 * 1) respiración + balanceo: cada propiedad con su propio período (ping-pong con easeInOut),
 *    así el movimiento nunca se ve mecánico;
 * 2) gestos ocasionales cada 4–9 s: saltito con estiramiento/aplastado, ladeo o asentir;
 * 3) parpadeo: párpados del color de la piel sobre los ojos detectados (tools/arte/ojos.mjs),
 *    a veces con doble parpadeo.
 * ------------------------------------------------------------------------------------------ */
type EyeData = { w: number; h: number; skin: string; eyes: [number, number, number, number][] };
let eyesCache: Record<string, EyeData> | null = null;
let eyesPromise: Promise<Record<string, EyeData>> | null = null;
function loadEyes() {
  if (eyesCache) return Promise.resolve(eyesCache);
  eyesPromise ??= fetch("/personajes/ojos.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((d: Record<string, EyeData>) => (eyesCache = d));
  return eyesPromise;
}
function useEyes(src: string) {
  const name = src.split("/").pop()!.replace(/\.webp$/, "");
  const [data, setData] = useState<EyeData | null>(() => eyesCache?.[name] ?? null);
  useEffect(() => {
    let live = true;
    void loadEyes().then((d) => live && setData(d[name] ?? null));
    return () => {
      live = false;
    };
  }, [name]);
  return data;
}

function Eyelids({ src, size, phase }: { src: string; size: number; phase: number }) {
  const data = useEyes(src);
  const [blink, setBlink] = useState(0);
  useEffect(() => {
    if (!data) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setBlink((b) => b + 1);
        next();
      }, 2200 + Math.random() * 3800);
    };
    t = setTimeout(next, 400 + phase * 2500);
    return () => clearTimeout(t);
  }, [data, phase]);
  if (!data || blink === 0) return null;
  // la imagen se dibuja con object-fit: contain anclada abajo dentro de un cuadro size×size
  const k = Math.min(size / data.w, size / data.h);
  const rw = data.w * k,
    rh = data.h * k;
  const ox = (size - rw) / 2,
    oy = size - rh;
  const double = blink % 4 === 3;
  return (
    <>
      {data.eyes.map(([x, y, w, h], i) => (
        <motion.span
          key={`${i}-${blink}`}
          className="eyelid"
          style={{ left: ox + x * rw, top: oy + y * rh, width: w * rw, height: h * rh, background: data.skin }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: double ? [0, 1, 0.1, 1, 0] : [0, 1, 1, 0] }}
          transition={{ duration: double ? 0.42 : 0.2, times: double ? [0, 0.22, 0.5, 0.72, 1] : [0, 0.4, 0.6, 1], ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

const GESTURES_BODY = [
  // saltito con anticipación, estirado y aterrizaje suave
  { y: [0, 3, -14, 0, 2, 0], scaleY: [1, 0.93, 1.06, 0.95, 1.02, 1], scaleX: [1, 1.05, 0.96, 1.04, 0.99, 1], rotate: [0, 0, 0, 0, 0, 0] },
  // ladea el cuerpo y vuelve
  { rotate: [0, -5, 3, -1, 0], y: [0, -2, 0, -1, 0], scaleY: [1, 1, 1, 1, 1], scaleX: [1, 1, 1, 1, 1] },
  // pequeño rebote contento
  { y: [0, -6, 0, -4, 0], scaleY: [1, 1.03, 0.98, 1.02, 1], scaleX: [1, 0.98, 1.02, 0.99, 1], rotate: [0, 1, -1, 0, 0] },
];
const GESTURES_FACE = [
  // asiente
  { y: [0, 4, -2, 3, 0], rotate: [0, 0, 0, 0, 0], scale: [1, 0.99, 1.01, 1, 1] },
  // ladea la cabeza, curioso
  { rotate: [0, 8, 6, -2, 0], y: [0, -2, -2, 0, 0], scale: [1, 1.02, 1.02, 1, 1] },
  // sacude la cabeza
  { rotate: [0, -6, 6, -4, 3, 0], y: [0, 0, 0, 0, 0, 0], scale: [1, 1, 1, 1, 1, 1] },
];

function useGesture(enabled: boolean, phase: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setN((x) => x + 1);
        next();
      }, 4000 + Math.random() * 5000);
    };
    t = setTimeout(next, 1200 + phase * 3000);
    return () => clearTimeout(t);
  }, [enabled, phase]);
  return n;
}

function Sprite({ src, size, anim, pulse, alt, shadow = true, kind = "body" }: { src: string; size: number; anim: Anim; pulse: number; alt: string; shadow?: boolean; kind?: "body" | "face" }) {
  const v = variants(anim);
  const reduced = useReducedMotion();
  const phase = useMemo(() => Math.random(), []);
  const alive = anim !== "none" && anim !== "walk" && !reduced;
  const gestureN = useGesture(alive && anim !== "talk", phase);
  const g = kind === "face" ? GESTURES_FACE[gestureN % GESTURES_FACE.length] : GESTURES_BODY[gestureN % GESTURES_BODY.length];
  const per = (base: number) => ({ duration: base + phase * 0.9, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const, delay: -phase * base });
  const breathe =
    kind === "face"
      ? { animate: { y: [0, -2.5], rotate: [-2.2, 2.2], scale: [1, 1.015] }, transition: { y: per(1.7), rotate: per(2.9), scale: per(1.7) } }
      : { animate: { y: [0, -3], rotate: [-1.4, 1.4], scaleY: [1, 1.022], scaleX: [1, 0.992] }, transition: { y: per(1.6), rotate: per(2.6), scaleY: per(1.6), scaleX: per(1.6) } };
  return (
    <span className="sprite" style={{ width: size, height: size }}>
      {shadow && (
        <motion.span
          key={`sh-${anim}-${pulse}`}
          className="sprite-shadow"
          animate={anim === "jump" ? { scaleX: [1, 1.1, 0.5, 1.12, 1, 1], opacity: [0.2, 0.22, 0.08, 0.22, 0.2, 0.2] } : alive ? { scaleX: [1, 0.94], opacity: [0.2, 0.15] } : undefined}
          transition={
            anim === "jump"
              ? { duration: 0.8, times: [0, 0.14, 0.42, 0.66, 0.84, 1] }
              : alive
                ? { duration: 1.6 + phase * 0.9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                : undefined
          }
        />
      )}
      <motion.span className="sprite-alive" style={{ originY: 1 }} animate={alive ? breathe.animate : undefined} transition={alive ? breathe.transition : undefined}>
        <motion.span
          key={`g-${gestureN}`}
          className="sprite-alive"
          style={{ originY: 1 }}
          animate={alive && gestureN > 0 ? g : undefined}
          transition={{ duration: kind === "face" ? 1.1 : 0.9, ease: "easeInOut" }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={`${src}-${anim}-${pulse}`} className="sprite-alive" style={{ originY: 1 }} {...v} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}>
              <img src={src} alt={alt} draggable={false} className="sprite-img" />
              {alive && <Eyelids src={src} size={size} phase={phase} />}
            </motion.span>
          </AnimatePresence>
        </motion.span>
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

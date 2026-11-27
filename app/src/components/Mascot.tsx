import { motion } from "motion/react";

export type Mood = "idle" | "happy" | "sad" | "wave";

/**
 * Orki: dinosaurio guardián inspirado en las huellas de Cal Orck'o (Sucre). Ilustración propia del equipo.
 * Lleva un pañuelo color teja, como los techos de la Ciudad Blanca.
 */
export function Mascot({ mood = "idle", size = 120 }: { mood?: Mood; size?: number }) {
  const body =
    mood === "happy"
      ? { y: [0, -18, 0, -10, 0], rotate: [0, -6, 6, -3, 0], transition: { duration: 0.9 } }
      : mood === "sad"
        ? { y: [0, 3, 0], rotate: [0, -3, 0], transition: { duration: 0.8 } }
        : { y: [0, -4, 0], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <motion.svg viewBox="0 0 140 140" width={size} height={size} animate={body} aria-label="Orki, la mascota" role="img">
      {/* sombra */}
      <ellipse cx="70" cy="128" rx="36" ry="5" fill="rgba(0,0,0,.12)" />
      {/* cola */}
      <path d="M42 96 Q14 104 8 82 Q24 92 44 84 Z" fill="#3F9E62" />
      {/* púas color teja */}
      {[
        [46, 70],
        [56, 62],
        [67, 58],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x - 6} ${y + 6} L${x} ${y - 6} L${x + 6} ${y + 6} Z`} fill="#C0532D" />
      ))}
      {/* cuerpo */}
      <ellipse cx="68" cy="92" rx="34" ry="30" fill="#4CAF6E" />
      <ellipse cx="74" cy="98" rx="20" ry="19" fill="#F6E7C1" />
      {/* patas */}
      <rect x="48" y="108" width="14" height="16" rx="6" fill="#3F9E62" />
      <rect x="78" y="108" width="14" height="16" rx="6" fill="#3F9E62" />
      {/* brazo (saluda) */}
      <motion.g
        style={{ originX: "92px", originY: "84px" }}
        animate={mood === "wave" ? { rotate: [0, -35, 0, -35, 0] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: mood === "wave" ? Infinity : 0, repeatDelay: 1 }}
      >
        <ellipse cx="98" cy="82" rx="7" ry="11" fill="#3F9E62" transform="rotate(-30 98 82)" />
      </motion.g>
      {/* cabeza */}
      <circle cx="86" cy="52" r="26" fill="#4CAF6E" />
      <ellipse cx="104" cy="60" rx="15" ry="11" fill="#57BD79" />
      {/* pañuelo */}
      <path d="M62 70 Q86 82 108 68 L104 78 Q86 90 64 80 Z" fill="#C0532D" />
      <path d="M70 78 L64 92 L76 84 Z" fill="#96401F" />
      {/* ojo con parpadeo */}
      <motion.g
        style={{ originX: "92px", originY: "46px" }}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
      >
        <circle cx="92" cy="46" r="8.5" fill="#fff" />
        <circle cx={mood === "sad" ? 92 : 94} cy={mood === "sad" ? 49 : 47} r="4.2" fill="#1d1d1d" />
        <circle cx="95.5" cy="45" r="1.4" fill="#fff" />
      </motion.g>
      <circle cx="102" cy="64" r="3.5" fill="#F28C6B" opacity={0.6} />
      {/* boca */}
      {mood === "sad" ? (
        <path d="M100 72 Q107 66 114 71" stroke="#1d1d1d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : mood === "happy" ? (
        <path d="M98 64 Q107 76 116 63 Z" fill="#7A2E1A" />
      ) : (
        <path d="M99 66 Q107 72 115 64" stroke="#1d1d1d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </motion.svg>
  );
}

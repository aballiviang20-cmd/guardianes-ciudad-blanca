import { motion } from "motion/react";

export type Mood = "idle" | "happy" | "sad" | "wave";

/**
 * Orki: dinosaurio guardián inspirado en las huellas de Cal Orck'o (Sucre). Ilustración propia.
 * Animación con anticipación, estiramiento y aplastamiento: se agacha, salta, se estira en el aire y aterriza.
 * `pulse` reinicia la animación aunque el estado de ánimo no cambie (dos aciertos seguidos).
 */
export function Mascot({ mood = "idle", size = 120, pulse = 0 }: { mood?: Mood; size?: number; pulse?: number }) {
  const jump = {
    y: [0, 5, -30, 0, 3, 0],
    scaleY: [1, 0.84, 1.14, 0.88, 1.04, 1],
    scaleX: [1, 1.12, 0.9, 1.1, 0.98, 1],
  };
  const body =
    mood === "happy"
      ? { animate: jump, transition: { duration: 0.85, times: [0, 0.14, 0.42, 0.68, 0.84, 1], ease: "easeOut" as const } }
      : mood === "sad"
        ? { animate: { y: [0, 4, 3], rotate: [0, -5, -4], scaleY: [1, 0.94, 0.96] }, transition: { duration: 0.6 } }
        : { animate: { scaleY: [1, 1.035, 1], y: [0, -1.5, 0] }, transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } };

  const shadow =
    mood === "happy"
      ? { animate: { scaleX: [1, 1.1, 0.55, 1.12, 1, 1], opacity: [0.18, 0.2, 0.08, 0.2, 0.18, 0.18] }, transition: { duration: 0.85, times: [0, 0.14, 0.42, 0.68, 0.84, 1] } }
      : { animate: { scaleX: [1, 0.96, 1] }, transition: { duration: 2.6, repeat: Infinity } };

  const eyeY = mood === "sad" ? 3 : 0;

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label="Orki" style={{ overflow: "visible" }}>
      <motion.ellipse key={`s-${mood}-${pulse}`} cx="68" cy="129" rx="34" ry="5" fill="#2b2622" opacity={0.18} {...shadow} style={{ originX: "68px", originY: "129px" }} />
      <motion.g key={`b-${mood}-${pulse}`} {...body} style={{ originX: "68px", originY: "124px" }}>
        {/* cola */}
        <path d="M42 98 Q14 106 6 84 Q12 82 18 88 Q28 96 46 86 Z" fill="#3F9E62" />
        {/* púas color teja */}
        {[
          [44, 72, 0.9],
          [54, 63, 1.05],
          [66, 58, 1.1],
        ].map(([x, y, s], i) => (
          <path key={i} d={`M${x - 7 * s} ${y + 7} Q${x} ${y - 9 * s} ${x + 7 * s} ${y + 7} Z`} fill="#C0532D" />
        ))}
        {/* cuerpo */}
        <ellipse cx="68" cy="94" rx="34" ry="30" fill="#4CAF6E" />
        <path d="M44 104 Q68 124 94 102 Q90 122 68 124 Q48 122 44 104Z" fill="#3F9E62" opacity=".55" />
        <ellipse cx="74" cy="100" rx="19" ry="18" fill="#F6E7C1" />
        {[92, 100, 108].map((y) => (
          <path key={y} d={`M62 ${y} Q74 ${y + 3} 86 ${y}`} stroke="#E6D2A3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        ))}
        {/* patas */}
        <path d="M48 112 h14 v12 q0 4 -4 4 h-8 q-4 0 -4 -4z" fill="#3F9E62" />
        <path d="M78 112 h14 v12 q0 4 -4 4 h-8 q-4 0 -4 -4z" fill="#3F9E62" />
        {/* brazo */}
        <motion.g
          style={{ originX: "92px", originY: "88px" }}
          animate={mood === "wave" ? { rotate: [0, -50, -20, -50, 0] } : mood === "happy" ? { rotate: [0, -60, -40, 0] } : { rotate: 0 }}
          transition={{ duration: mood === "wave" ? 1.3 : 0.85, repeat: mood === "wave" ? Infinity : 0, repeatDelay: 0.8 }}
        >
          <path d="M90 86 Q104 80 106 92 Q100 96 92 94Z" fill="#3F9E62" />
        </motion.g>
        {/* cabeza */}
        <circle cx="86" cy="52" r="27" fill="#4CAF6E" />
        <ellipse cx="105" cy="61" rx="16" ry="12" fill="#57BD79" />
        <circle cx="113" cy="58" r="1.6" fill="#2F7A4A" />
        {/* pañuelo de teja */}
        <path d="M60 72 Q86 86 110 70 L106 81 Q86 94 62 82 Z" fill="#C0532D" />
        <path d="M60 72 Q86 86 110 70" stroke="#E07A4F" strokeWidth="2" fill="none" />
        <path d="M68 80 L60 96 L76 87 Z" fill="#96401F" />
        {/* ojo */}
        <motion.g style={{ originX: "92px", originY: "46px" }} animate={{ scaleY: [1, 1, 0.08, 1] }} transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.93, 0.96, 1] }}>
          <ellipse cx="92" cy="46" rx="9" ry="10" fill="#fff" />
          <circle cx={94} cy={47 + eyeY} r="4.6" fill="#1d1d1d" />
          <circle cx="96" cy={45 + eyeY} r="1.6" fill="#fff" />
        </motion.g>
        {mood === "sad" && <path d="M84 36 L100 40" stroke="#2F7A4A" strokeWidth="2.4" strokeLinecap="round" />}
        <circle cx="103" cy="66" r="3.6" fill="#F28C6B" opacity={0.55} />
        {/* boca */}
        {mood === "sad" ? (
          <path d="M100 74 Q107 68 115 73" stroke="#1d1d1d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        ) : mood === "happy" ? (
          <path d="M97 66 Q107 80 118 65 Z" fill="#7A2E1A" />
        ) : (
          <path d="M98 68 Q107 74 116 66" stroke="#1d1d1d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        )}
        {mood === "sad" && (
          <motion.path d="M74 34 q-4 6 0 9 q4 -3 0 -9z" fill="#8EC5F0" initial={{ y: -4, opacity: 0 }} animate={{ y: 4, opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: 1 }} />
        )}
      </motion.g>
    </svg>
  );
}

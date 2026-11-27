import { motion } from "motion/react";

const COLORS = ["#C0532D", "#E5A823", "#2E9E5B", "#3B82C4", "#F28C6B"];

/** Estallido de partículas (rombos y teselas) al acertar: más preciso que un confeti genérico. */
export function Burst({ count = 14, radius = 90, seed = 0 }: { count?: number; radius?: number; seed?: number }) {
  return (
    <div className="burst" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + seed;
        const r = radius * (0.7 + ((i * 37) % 10) / 25);
        return (
          <motion.span
            key={`${seed}-${i}`}
            className={`burst-bit ${i % 3 === 0 ? "round" : ""}`}
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r, scale: [0, 1.2, 0.6], rotate: 180 + i * 20, opacity: [1, 1, 0] }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/** Rayos giratorios detrás de una recompensa. */
export function Rays({ color = "#F6D36B" }: { color?: string }) {
  return (
    <motion.div
      className="rays"
      style={{ background: `repeating-conic-gradient(${color}55 0 10deg, transparent 10deg 24deg)` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: 360 }}
      transition={{ scale: { type: "spring", stiffness: 120, damping: 14 }, rotate: { duration: 24, repeat: Infinity, ease: "linear" } }}
      aria-hidden
    />
  );
}

/** Check que se dibuja (pathLength). */
export function DrawCheck({ size = 30, ok = true }: { size?: number; ok?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ok ? (
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
      ) : (
        <>
          <motion.path d="M6 6l12 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.1 }} />
          <motion.path d="M18 6L6 18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.25 }} />
        </>
      )}
    </svg>
  );
}

import { motion, type HTMLMotionProps } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

type BtnProps = HTMLMotionProps<"button"> & { variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "gold"; block?: boolean };

/** Botón "3D" con borde inferior: se hunde al presionarlo. */
export function Button({ variant = "primary", block, className = "", children, ...rest }: BtnProps) {
  return (
    <motion.button
      whileTap={{ y: 3, scale: 0.98 }}
      whileHover={{ scale: rest.disabled ? 1 : 1.02 }}
      className={`btn btn-${variant} ${block ? "btn-block" : ""} ${className}`}
      {...rest}
    >
      {children as ReactNode}
    </motion.button>
  );
}

export function ProgressBar({ value, color = "var(--verde-ok)" }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <motion.div
        className="progress-fill"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      />
    </div>
  );
}

/** Número que sube animado (XP, puntajes). */
export function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{v}</>;
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export const Icon = {
  flame: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-3 1.5-4.5 2.5-6 .3 2 1.2 3 2.5 3.5C11 8 11.5 5 12 2z" fill="#F08A24" />
      <path d="M12 12c.8 1.6 2.5 2 2.5 4a2.5 2.5 0 0 1-5 0c0-1.3.8-2 1.5-2.8.3.8.6 1.1 1 1.3V12z" fill="#FFD166" />
    </svg>
  ),
  gem: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#3B82C4" />
      <path d="M2 9h20M8 3l4 18 4-18" stroke="#BFE0FF" strokeWidth="1.2" fill="none" />
    </svg>
  ),
  card: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="3" fill="#E5A823" />
      <path d="M9 14l3-5 3 5z" fill="#fff" />
    </svg>
  ),
  map: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
  album: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="11" height="15" rx="2" />
      <path d="M17 5h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2" />
    </svg>
  ),
  trophy: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8" />
    </svg>
  ),
  shield: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  ),
  close: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  camera: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  lock: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  check: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  sound: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  ),
  mute: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </svg>
  ),
  cloudOff: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.3 9.6 4.2 4.2 0 0 0 7 18z" />
      <path d="M3 3l18 18" />
    </svg>
  ),
  clock: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  book: (s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5M8 7h7" />
    </svg>
  ),
  flag: (s = 15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
  chevron: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  heart: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" fill="currentColor" />
      <path d="M7 7.5c-1.2.3-2 1.3-2 2.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  ),
  star: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z" fill="currentColor" />
    </svg>
  ),
};

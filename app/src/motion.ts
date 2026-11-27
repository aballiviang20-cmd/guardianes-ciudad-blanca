/** Presets de movimiento compartidos: el mismo "carácter" de animación en toda la app. */
export const snappy = { type: "spring", stiffness: 520, damping: 32 } as const;
export const bouncy = { type: "spring", stiffness: 320, damping: 14 } as const;
export const soft = { type: "spring", stiffness: 160, damping: 20 } as const;

export const pageVariants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { ...soft } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const stagger = (i: number, base = 0.06) => ({ delay: i * base });

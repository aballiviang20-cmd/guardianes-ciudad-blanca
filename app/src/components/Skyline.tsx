import { motion } from "motion/react";

/** Ilustración animada de la Ciudad Blanca: casas blancas, techos de teja y torres que "suben" al cargar. */
export function Skyline({ height = 170 }: { height?: number }) {
  const buildings = [
    { x: 0, w: 60, h: 70, roof: true },
    { x: 56, w: 44, h: 96, tower: true },
    { x: 98, w: 70, h: 62, roof: true },
    { x: 164, w: 54, h: 120, dome: true },
    { x: 214, w: 66, h: 74, roof: true },
    { x: 276, w: 44, h: 104, tower: true },
    { x: 318, w: 82, h: 66, roof: true },
  ];
  return (
    <svg viewBox="0 0 400 180" width="100%" height={height} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8EC5F0" />
          <stop offset="1" stopColor="#FBF8F3" />
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#sky)" />
      <motion.circle cx="330" cy="46" r="22" fill="#FFD166" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }} />
      {[0, 1].map((i) => (
        <motion.g key={i} initial={{ x: i ? 260 : -60 }} animate={{ x: i ? -120 : 420 }} transition={{ duration: i ? 38 : 30, repeat: Infinity, ease: "linear" }}>
          <ellipse cx="40" cy={i ? 30 : 56} rx="26" ry="9" fill="#fff" opacity=".9" />
          <ellipse cx="58" cy={i ? 26 : 52} rx="16" ry="8" fill="#fff" opacity=".9" />
        </motion.g>
      ))}
      {/* cerros */}
      <path d="M0 140 Q80 92 170 128 T400 118 V180 H0Z" fill="#9BB98A" opacity=".55" />
      {buildings.map((b, i) => {
        const top = 180 - b.h;
        return (
          <motion.g key={i} initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 * i, type: "spring", stiffness: 90, damping: 14 }}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill="#FFFFFF" stroke="#E3DACB" />
            {b.roof && <path d={`M${b.x - 4} ${top + 2} L${b.x + b.w / 2} ${top - 16} L${b.x + b.w + 4} ${top + 2} Z`} fill="#C0532D" />}
            {b.tower && <path d={`M${b.x} ${top} L${b.x + b.w / 2} ${top - 26} L${b.x + b.w} ${top} Z`} fill="#C0532D" />}
            {b.dome && <path d={`M${b.x + 4} ${top} A${b.w / 2 - 4} ${b.w / 2 - 4} 0 0 1 ${b.x + b.w - 4} ${top} Z`} fill="#E9E1D3" stroke="#C9BBA4" />}
            {Array.from({ length: Math.floor(b.w / 18) }).map((_, j) => (
              <rect key={j} x={b.x + 8 + j * 18} y={top + 16} width="8" height="12" rx="3" fill="#1F5C46" opacity=".75" />
            ))}
          </motion.g>
        );
      })}
      <rect y="176" width="400" height="4" fill="#D8CDBA" />
    </svg>
  );
}

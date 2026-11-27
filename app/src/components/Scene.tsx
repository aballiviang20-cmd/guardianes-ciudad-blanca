import { motion } from "motion/react";
import { useId, type ReactNode } from "react";

/**
 * Ilustraciones propias de cada lugar, con los cerros Sicasica y Churuquella al fondo.
 * Detalles animados: nubes, aves, campanas, bandera y reloj. Todo en SVG (liviano y offline).
 */
export function Scene({ id, animated = true, className = "" }: { id: string; animated?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const a = animated;
  return (
    <svg viewBox="0 0 320 210" className={`scene ${className}`} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FD3F2" />
          <stop offset="0.7" stopColor="#E9F3EC" />
          <stop offset="1" stopColor="#F6EBDA" />
        </linearGradient>
        <pattern id={`tejas${uid}`} width="9" height="6" patternUnits="userSpaceOnUse">
          <rect width="9" height="6" fill="#B9512A" />
          <path d="M0 6 Q4.5 0 9 6" fill="#D46A3D" />
          <path d="M0 6 Q4.5 1.5 9 6" fill="none" stroke="#8F3C1F" strokeWidth=".6" />
        </pattern>
        <pattern id={`adobe${uid}`} width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill="#FBF6EE" />
          <path d="M0 8h16M8 0v4M0 4h16M4 4v4M12 4v4" stroke="#EADFCC" strokeWidth=".6" />
        </pattern>
        <radialGradient id={`sun${uid}`}>
          <stop offset="0.45" stopColor="#FFD873" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="210" fill={`url(#sky${uid})`} />
      <motion.circle cx="262" cy="44" r="34" fill={`url(#sun${uid})`} animate={a ? { scale: [1, 1.08, 1] } : undefined} transition={{ duration: 4, repeat: Infinity }} style={{ originX: "262px", originY: "44px" }} />
      <circle cx="262" cy="44" r="15" fill="#FFD45E" />

      <Cloud a={a} y={30} delay={0} />
      <Cloud a={a} y={58} delay={9} small />
      {a && <Birds />}

      {/* Cerros Churuquella y Sicasica */}
      <path d="M-10 150 Q40 96 92 128 Q120 142 150 150Z" fill="#8FAE7E" />
      <path d="M120 150 Q190 82 262 124 Q300 140 330 150Z" fill="#7C9C6D" />
      <path d="M-10 150 Q60 120 120 140 T330 138 V160 H-10Z" fill="#A9C094" />

      <g>{building(id, uid, a)}</g>

      {/* Plaza */}
      <rect y="186" width="320" height="24" fill="#E8DCC6" />
      <path d="M0 192h320M0 200h320" stroke="#D9CAB0" strokeWidth="1" />
      <Tree x={22} />
      <Tree x={298} />
    </svg>
  );
}

function Cloud({ a, y, delay, small }: { a: boolean; y: number; delay: number; small?: boolean }) {
  const s = small ? 0.7 : 1;
  return (
    <motion.g
      initial={{ x: small ? 200 : 20 }}
      animate={a ? { x: [small ? 200 : 20, 340, -80, small ? 200 : 20] } : undefined}
      transition={{ duration: 60, repeat: Infinity, ease: "linear", delay }}
    >
      <g transform={`translate(0 ${y}) scale(${s})`}>
        <ellipse cx="30" cy="10" rx="24" ry="9" fill="#fff" />
        <ellipse cx="46" cy="5" rx="14" ry="9" fill="#fff" />
        <ellipse cx="18" cy="6" rx="10" ry="7" fill="#fff" />
      </g>
    </motion.g>
  );
}

function Birds() {
  return (
    <motion.g initial={{ x: -30, y: 70 }} animate={{ x: [-30, 360], y: [70, 50, 64] }} transition={{ duration: 16, repeat: Infinity, ease: "linear", delay: 2 }}>
      {[0, 14].map((dx, i) => (
        <motion.path
          key={i}
          d={`M${dx} 0 q4 -4 8 0 q4 -4 8 0`}
          stroke="#3c3c3c"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          animate={{ scaleY: [1, -0.4, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.2 }}
          style={{ originY: "0px" }}
          transform={`translate(0 ${i * 6})`}
        />
      ))}
    </motion.g>
  );
}

function Tree({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 150)`}>
      <rect x="-2" y="18" width="4" height="20" rx="2" fill="#7A5A3A" />
      <circle cx="0" cy="12" r="13" fill="#4E8B57" />
      <circle cx="-6" cy="18" r="9" fill="#5C9C63" />
      <circle cx="6" cy="17" r="8" fill="#3F7A49" />
    </g>
  );
}

function Bell({ x, y, a, delay = 0 }: { x: number; y: number; a: boolean; delay?: number }) {
  return (
    <motion.g
      style={{ originX: `${x}px`, originY: `${y}px` }}
      animate={a ? { rotate: [0, 18, -14, 8, 0, 0] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.5, delay }}
    >
      <path d={`M${x - 4} ${y + 9} Q${x - 4} ${y + 1} ${x} ${y + 1} Q${x + 4} ${y + 1} ${x + 4} ${y + 9} Z`} fill="#C9962C" />
      <circle cx={x} cy={y + 10} r="1.4" fill="#8A6414" />
    </motion.g>
  );
}

function building(id: string, u: string, a: boolean): ReactNode {
  switch (id) {
    case "san-lazaro":
      // Templo de una sola nave, muros encalados de adobe, espadaña con dos campanas.
      return (
        <g>
          <path d="M70 118 L150 100 L250 118 L250 124 L70 124Z" fill={`url(#tejas${u})`} />
          <rect x="74" y="122" width="172" height="66" fill={`url(#adobe${u})`} stroke="#E4D7C2" />
          {[100, 140, 180, 220].map((x) => (
            <rect key={x} x={x} y="140" width="8" height="16" rx="4" fill="#6B4A2E" opacity=".85" />
          ))}
          <rect x="70" y="182" width="180" height="6" fill="#E9DCC6" />
          {/* fachada con espadaña */}
          <path d="M58 188 V112 L86 96 L114 112 V188Z" fill="#FFFDF8" stroke="#E4D7C2" />
          <path d="M66 98 H106 V84 Q86 62 66 84Z" fill="#FFFDF8" stroke="#E4D7C2" />
          <path d="M72 96 V86 a5 5 0 0 1 10 0 V96Z M90 96 V86 a5 5 0 0 1 10 0 V96Z" fill="#3E3328" />
          <Bell x={77} y={86} a={a} />
          <Bell x={95} y={86} a={a} delay={0.4} />
          <path d="M86 62 V52 M82 56 H90" stroke="#5A4632" strokeWidth="2" strokeLinecap="round" />
          <circle cx="86" cy="122" r="6" fill="#E4D7C2" />
          <circle cx="86" cy="122" r="3.5" fill="#6B4A2E" />
          <path d="M74 188 V152 a12 12 0 0 1 24 0 V188Z" fill="#7A4E2A" />
          <path d="M86 140 V188" stroke="#5E3B1F" strokeWidth="1" />
        </g>
      );
    case "catedral":
      return (
        <g>
          {/* nave lateral */}
          <path d="M150 116 L270 116 L270 188 L150 188Z" fill="#F4ECDD" stroke="#E0D2BB" />
          <path d="M146 116 L208 100 L274 116Z" fill={`url(#tejas${u})`} />
          {[164, 192, 220, 248].map((x) => (
            <path key={x} d={`M${x} 160 V140 a6 6 0 0 1 12 0 V160Z`} fill="#5E6B5A" opacity=".75" />
          ))}
          {/* cúpula */}
          <path d="M196 100 a22 22 0 0 1 44 0Z" fill="#EADFCB" stroke="#D3C2A6" />
          <path d="M218 78 V70 M215 73 H221" stroke="#6C5A42" strokeWidth="1.8" strokeLinecap="round" />
          {/* torre con reloj */}
          <rect x="60" y="74" width="46" height="114" fill="#F8F2E6" stroke="#E0D2BB" />
          <rect x="56" y="70" width="54" height="8" fill="#E7DAC2" />
          <rect x="64" y="40" width="38" height="32" fill="#F8F2E6" stroke="#E0D2BB" />
          <path d="M70 70 V54 a6 6 0 0 1 12 0 V70Z M84 70 V54 a6 6 0 0 1 12 0 V70Z" fill="#3D3A33" />
          <Bell x={76} y={56} a={a} />
          <Bell x={90} y={56} a={a} delay={0.5} />
          <path d="M60 40 L83 18 L106 40Z" fill="#E7DAC2" stroke="#D3C2A6" />
          <path d="M83 18 V8 M79 12 H87" stroke="#6C5A42" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="83" cy="96" r="11" fill="#fff" stroke="#9C8A6E" strokeWidth="2" />
          <motion.line x1="83" y1="96" x2="83" y2="88" stroke="#3a3a3a" strokeWidth="1.6" strokeLinecap="round" animate={a ? { rotate: 360 } : undefined} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} style={{ originX: "83px", originY: "96px" }} />
          <line x1="83" y1="96" x2="89" y2="96" stroke="#3a3a3a" strokeWidth="1.6" strokeLinecap="round" />
          {/* portada barroca */}
          <rect x="106" y="110" width="50" height="78" fill="#F1E5CF" stroke="#E0D2BB" />
          <path d="M112 188 V150 a19 19 0 0 1 38 0 V188Z" fill="#6E4A2C" />
          {[110, 118, 144, 152].map((x) => (
            <rect key={x} x={x - 1.5} y="128" width="3" height="60" fill="#E2D2B4" />
          ))}
          <path d="M106 110 Q131 96 156 110Z" fill="#E2D2B4" />
          <circle cx="131" cy="118" r="4" fill="#C9962C" />
        </g>
      );
    case "casa-libertad":
      return (
        <g>
          <rect x="52" y="108" width="216" height="80" fill="#FFFDF8" stroke="#E4D7C2" />
          <path d="M44 110 L60 98 H260 L276 110Z" fill={`url(#tejas${u})`} />
          {/* balcón corrido de madera */}
          <rect x="62" y="132" width="196" height="5" fill="#7A4E2A" />
          {Array.from({ length: 25 }).map((_, i) => (
            <rect key={i} x={64 + i * 8} y="120" width="2" height="12" fill="#8B5E36" />
          ))}
          <rect x="62" y="118" width="196" height="3" fill="#7A4E2A" />
          {[80, 130, 180, 230].map((x) => (
            <rect key={x} x={x - 9} y="110" width="18" height="8" fill="#5D6B57" opacity=".6" />
          ))}
          {/* portal de arcos */}
          {[88, 136, 184, 232].map((x) => (
            <path key={x} d={`M${x - 14} 188 V160 a14 14 0 0 1 28 0 V188Z`} fill={x === 136 || x === 184 ? "#6E4A2C" : "#EADFCB"} />
          ))}
          <rect x="52" y="186" width="216" height="3" fill="#E4D7C2" />
          {/* bandera de Bolivia */}
          <rect x="159" y="56" width="2.5" height="44" fill="#6C5A42" />
          <motion.g style={{ originX: "161px", originY: "60px" }} animate={a ? { skewY: [0, 4, -3, 0], scaleX: [1, 0.94, 1] } : undefined} transition={{ duration: 2.2, repeat: Infinity }}>
            <rect x="161.5" y="58" width="30" height="6" fill="#D52B1E" />
            <rect x="161.5" y="64" width="30" height="6" fill="#F9E300" />
            <rect x="161.5" y="70" width="30" height="6" fill="#007934" />
          </motion.g>
        </g>
      );
    case "sucre":
    default:
      // La Ciudad Blanca: casas encaladas, techos de teja y torres.
      return (
        <g>
          {[
            [10, 140, 44, 30], [50, 132, 36, 38], [84, 144, 40, 26], [120, 128, 30, 42], [148, 138, 46, 32],
            [190, 130, 34, 40], [222, 142, 42, 28], [262, 134, 50, 36],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h + 18} fill="#FFFDF8" stroke="#E6DAC6" />
              <path d={`M${x - 4} ${y + 2} L${x + w / 2} ${y - 10} L${x + w + 4} ${y + 2}Z`} fill={`url(#tejas${u})`} />
              <rect x={x + 6} y={y + 12} width="6" height="9" rx="3" fill="#5E6B5A" opacity=".7" />
              {w > 36 && <rect x={x + w - 14} y={y + 12} width="6" height="9" rx="3" fill="#5E6B5A" opacity=".7" />}
            </g>
          ))}
          {/* torres */}
          {[[132, 96], [236, 102]].map(([x, y], i) => (
            <g key={`t${i}`}>
              <rect x={x - 9} y={y} width="18" height={150 - y} fill="#FBF5EA" stroke="#E0D2BB" />
              <path d={`M${x - 9} ${y} L${x} ${y - 16} L${x + 9} ${y}Z`} fill="#E7DAC2" />
              <path d={`M${x - 4} ${y + 16} V${y + 8} a4 4 0 0 1 8 0 V${y + 16}Z`} fill="#3D3A33" />
              <Bell x={x} y={y + 8} a={a} delay={i * 0.7} />
            </g>
          ))}
          <path d="M188 96 a14 14 0 0 1 28 0Z" fill="#EADFCB" stroke="#D3C2A6" />
          <rect x="187" y="96" width="30" height="40" fill="#FBF5EA" stroke="#E0D2BB" />
        </g>
      );
  }
}

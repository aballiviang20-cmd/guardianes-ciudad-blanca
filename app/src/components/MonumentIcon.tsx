/** Pictogramas propios de cada monumento (SVG simple, color del trazo = currentColor). */
export function MonumentIcon({ id, size = 40 }: { id: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (id) {
    case "casa-libertad":
      return (
        <svg {...common} aria-hidden>
          <path d="M8 54V26h48v28" fill="#fff" />
          <path d="M4 26L32 12l28 14" />
          <path d="M32 12V4l8 3-8 3" />
          <path d="M26 54V42a6 6 0 0 1 12 0v12" />
          <rect x="12" y="32" width="9" height="8" />
          <rect x="43" y="32" width="9" height="8" />
          <path d="M10 42h13M41 42h13" />
          <path d="M4 54h56" />
        </svg>
      );
    case "catedral":
      return (
        <svg {...common} aria-hidden>
          <path d="M8 56V24l6-10 6 10v32M44 56V24l6-10 6 10v32" fill="#fff" />
          <path d="M20 56V30h24v26" fill="#fff" />
          <path d="M28 56V46a4 4 0 0 1 8 0v10" />
          <circle cx="32" cy="37" r="3.5" />
          <path d="M4 56h56M14 8v6M50 8v6" />
        </svg>
      );
    case "san-felipe-neri":
      return (
        <svg {...common} aria-hidden>
          <path d="M18 34a14 14 0 0 1 28 0" fill="#fff" />
          <path d="M32 20v-8M29 15h6" />
          <path d="M8 56V36h48v20" fill="#fff" />
          <path d="M8 36V26h8v10M48 36V26h8v10" />
          <path d="M12 26a4 4 0 0 1 4-6 4 4 0 0 1 0 6M52 26a4 4 0 0 1-4-6" />
          <path d="M28 56v-9a4 4 0 0 1 8 0v9M4 56h56" />
        </svg>
      );
    case "san-lazaro":
      return (
        <svg {...common} aria-hidden>
          <path d="M14 56V30l10-6 10 6v26" fill="#fff" />
          <path d="M17 24h14v-6a7 7 0 0 0-14 0z" fill="#fff" />
          <path d="M24 11V6M21.5 8.5h5" />
          <path d="M20 20v-2M28 20v-2" />
          <path d="M34 34h22v22H34" fill="#fff" />
          <path d="M32 34l12-6 14 6" />
          <path d="M19 56v-9a5 5 0 0 1 10 0v9" />
          <path d="M8 56h52" />
        </svg>
      );
    case "sucre":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 40c8-10 16-12 24-6s16 4 32-6" />
          <path d="M8 56V44h12v12M24 56V40h12v16M40 56V46h14v10" fill="#fff" />
          <path d="M6 44l8-5 8 5M22 40l8-6 8 6M38 46l9-5 9 5" />
          <path d="M30 34V22M27 25h6" />
          <path d="M4 56h56" />
        </svg>
      );
    case "recoleta":
      return (
        <svg {...common} aria-hidden>
          <path d="M6 56V30h52v26" fill="#fff" />
          <path d="M12 56V44a5 5 0 0 1 10 0v12M27 56V44a5 5 0 0 1 10 0v12M42 56V44a5 5 0 0 1 10 0v12" />
          <path d="M24 30V16l8-8 8 8v14" fill="#fff" />
          <path d="M32 22v4M2 56h60M6 30h52" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect x="12" y="20" width="40" height="34" fill="#fff" />
          <path d="M8 22L32 8l24 14M4 54h56" />
        </svg>
      );
  }
}

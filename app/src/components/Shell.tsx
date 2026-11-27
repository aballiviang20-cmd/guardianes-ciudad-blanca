import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useT } from "../i18n";
import { useStore } from "../store";
import { Icon, useOnline } from "./ui";

function LangToggle() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <button className="lang-toggle" onClick={() => setLang(lang === "es" ? "en" : "es")} aria-label="Cambiar idioma / Change language">
      <span className={lang === "es" ? "on" : ""}>ES</span>
      <span className={lang === "en" ? "on" : ""}>EN</span>
    </button>
  );
}

export function TopBar() {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak.count);
  const progress = useStore((s) => s.progress);
  const cards = Object.values(progress).reduce((n, p) => n + (p.lesson ? 1 : 0) + (p.golden ? 1 : 0), 0);
  return (
    <header className="topbar">
      <LangToggle />
      <div className="stats">
        <motion.span key={`s${streak}`} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="stat stat-flame">
          {Icon.flame()} {streak}
        </motion.span>
        <motion.span key={`x${xp}`} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="stat stat-gem">
          {Icon.gem()} {xp}
        </motion.span>
        <span className="stat stat-card">
          {Icon.card()} {cards}
        </span>
      </div>
    </header>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useT();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div className="offline-banner" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
          ☁️ {t.offline}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BottomNav() {
  const { t } = useT();
  const tabs = [
    { to: "/", label: t.route, icon: Icon.map() },
    { to: "/album", label: t.album, icon: Icon.album() },
    { to: "/liga", label: t.league, icon: Icon.trophy() },
    { to: "/guardian", label: t.guardian, icon: Icon.shield() },
  ];
  return (
    <nav className="bottomnav">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Pantallas principales del alumno: barra superior + contenido animado + navegación inferior. */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <OfflineBanner />
      <TopBar />
      <motion.main className="screen" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {children}
      </motion.main>
      <BottomNav />
    </div>
  );
}

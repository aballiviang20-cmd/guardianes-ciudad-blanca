import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { snappy } from "../motion";
import { useT } from "../i18n";
import { useStore } from "../store";
import { Icon, useOnline } from "./ui";

function LangToggle() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <button className="lang-toggle" onClick={() => setLang(lang === "es" ? "en" : "es")} aria-label="Idioma / Language">
      {(["es", "en"] as const).map((l) => (
        <span key={l} className={lang === l ? "on" : ""}>
          {lang === l && <motion.i layoutId="lang-pill" className="lang-pill" transition={snappy} />}
          <b>{l.toUpperCase()}</b>
        </span>
      ))}
    </button>
  );
}

function Stat({ icon, value, cls }: { icon: ReactNode; value: number; cls: string }) {
  return (
    <span className={`stat ${cls}`}>
      {icon}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b key={value} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={snappy}>
          {value}
        </motion.b>
      </AnimatePresence>
    </span>
  );
}

export function TopBar() {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak.count);
  const muted = useStore((s) => s.muted);
  const toggleMute = useStore((s) => s.toggleMute);
  const progress = useStore((s) => s.progress);
  const cards = Object.values(progress).reduce((n, p) => n + (p.lesson ? 1 : 0) + (p.golden ? 1 : 0), 0);
  return (
    <header className="topbar">
      <LangToggle />
      <div className="stats">
        <Stat icon={Icon.flame()} value={streak} cls="stat-flame" />
        <Stat icon={Icon.gem()} value={xp} cls="stat-gem" />
        <Stat icon={Icon.card()} value={cards} cls="stat-card" />
        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"}>
          {muted ? Icon.mute() : Icon.sound()}
        </button>
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
        <motion.div className="offline-banner" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
          <span>
            {Icon.cloudOff(16)} {t.offline}
          </span>
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
              {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={snappy} />}
              <motion.span className="nav-icon" animate={isActive ? { y: [0, -5, 0], scale: [1, 1.15, 1] } : { y: 0 }} transition={{ duration: 0.35 }}>
                {tab.icon}
              </motion.span>
              <span className="nav-label">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <OfflineBanner />
      <TopBar />
      <main className="screen">{children}</main>
      <BottomNav />
    </div>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CHARACTERS, type CharId } from "../characters";
import { CharPose } from "../components/Character";
import { Scene } from "../components/Scene";
import { Button } from "../components/ui";
import { bouncy } from "../motion";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";

const PARADE: CharId[] = ["mateo", "sofia", "orki", "juanita", "wara", "kusi", "bruno", "julian"];

export function Welcome() {
  const { t, lang } = useT();
  const setProfile = useStore((s) => s.setProfile);
  const setAvatar = useStore((s) => s.setAvatar);
  const setLang = useStore((s) => s.setLang);
  const [alias, setAlias] = useState("");
  const [course, setCourse] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const setAccount = useStore((s) => s.setAccount);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [pending, setPending] = useState<{ username: string; name: string; level: "4to" | "6to" | null; course: string } | null>(null);
  async function doLogin() {
    setLoginErr("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password: pass }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      if (d.user.role !== "alumno") throw new Error(lang === "es" ? "Esta es una cuenta de docente: entra en /docente" : "Teacher account: use /docente");
      sfx.tap();
      setPending({ username: d.user.username, name: d.user.name, level: d.user.level ?? null, course: d.user.course ?? "" });
      setAlias(d.user.name);
      setCourse(d.user.course ?? "");
      setStep(2);
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : "Error");
    }
  }
  const [pick, setPick] = useState<CharId>("mateo");
  const valid = alias.trim().length >= 2 && course.trim().length >= 2;

  return (
    <div className="phone welcome">
      <div className="welcome-hero">
        <Scene id="sucre" />
        {/* Desfile: todos los guardianes caminan por la plaza en bucle (la lista va dos veces para que no haya corte). */}
        <div className="welcome-parade" aria-hidden>
          <motion.div className="parade-track" initial={{ x: "-50%" }} animate={{ x: "0%" }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }}>
            {[...PARADE, ...PARADE].map((c, i) => (
              <span key={i} className="parade-item" style={{ ["--d" as string]: `${(i % PARADE.length) * 0.13}s` }}>
                <CharPose c={c} pose="mueve" size={c === "orki" || c === "kusi" ? 92 : 104} anim="none" />
              </span>
            ))}
          </motion.div>
        </div>
        <button className="lang-toggle small" onClick={() => setLang(lang === "es" ? "en" : "es")}>
          <span className={lang === "es" ? "on" : ""}>
            <b>ES</b>
          </span>
          <span className={lang === "en" ? "on" : ""}>
            <b>EN</b>
          </span>
        </button>
      </div>
      <div className="welcome-body">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" className="welcome-step" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h1 className="serif">{t.appName}</h1>
              <div className="motto">
                {t.motto.map((w, i) => (
                  <motion.span key={w} initial={{ opacity: 0, y: 16, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...bouncy, delay: 0.7 + i * 0.18 }}>
                    {w}
                  </motion.span>
                ))}
              </div>
              <form
                className="welcome-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!valid) return;
                  sfx.tap();
                  setStep(2);
                }}
              >
                <input value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={16} placeholder={t.aliasPh} autoComplete="off" aria-label={t.aliasPh} />
                <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder={t.coursePh} autoComplete="off" aria-label={t.coursePh} />
                <Button type="submit" block disabled={!valid}>
                  {t.continue}
                </Button>
              </form>
              <button className="link-btn account-link" onClick={() => setStep(3)}>
                {lang === "es" ? "🎓 Tengo cuenta de mi colegio" : "🎓 I have a school account"}
              </button>
            </motion.div>
          ) : step === 3 ? (
            <motion.div key="s3" className="welcome-step" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h1 className="serif">{lang === "es" ? "Entra con tu cuenta" : "Sign in"}</h1>
              <p className="muted-line">{lang === "es" ? "Usuario y contraseña que te dio tu profe." : "Username and password from your teacher."}</p>
              <form
                className="welcome-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void doLogin();
                }}
              >
                <input value={user} onChange={(e) => setUser(e.target.value)} placeholder={lang === "es" ? "Usuario" : "Username"} autoComplete="username" aria-label="Usuario" />
                <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder={lang === "es" ? "Contraseña" : "Password"} autoComplete="current-password" aria-label="Contraseña" />
                {loginErr && <p className="error">{loginErr}</p>}
                <Button type="submit" block disabled={!user || !pass}>
                  {lang === "es" ? "Entrar" : "Sign in"}
                </Button>
              </form>
              <button className="link-btn account-link" onClick={() => setStep(1)}>
                {lang === "es" ? "← Entrar sin cuenta" : "← Continue without account"}
              </button>
            </motion.div>
          ) : (
            <motion.div key="s2" className="welcome-step" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h1 className="serif">{lang === "es" ? "Elige tu guardián" : "Choose your guardian"}</h1>
              <div className="char-picker">
                {(Object.keys(CHARACTERS) as CharId[]).map((c) => (
                  <motion.button
                    key={c}
                    className={`char-card ${pick === c ? "on" : ""}`}
                    style={{ ["--accent" as string]: CHARACTERS[c].color }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      sfx.tap();
                      setPick(c);
                    }}
                  >
                    <CharPose c={c} pose="frente" size={96} anim={pick === c ? "jump" : "idle"} pulse={pick === c ? 1 : 0} />
                    <b>{CHARACTERS[c].name}</b>
                    <small>{CHARACTERS[c].tagline[lang]}</small>
                  </motion.button>
                ))}
              </div>
              <Button
                block
                onClick={() => {
                  sfx.reveal();
                  setAvatar(pick, "casual");
                  if (pending) setAccount(pending);
                  else setProfile(alias.slice(0, 16), course.slice(0, 12));
                }}
              >
                {t.start}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

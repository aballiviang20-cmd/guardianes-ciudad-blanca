import { motion } from "motion/react";
import { useState } from "react";
import { CHARACTERS, type CharId } from "../characters";
import { CharFace, CharPose } from "../components/Character";
import { Button } from "../components/ui";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";

const PARADE: CharId[] = ["mateo", "sofia", "orki", "juanita", "wara", "kusi", "bruno", "julian"];
type Step = "home" | "login" | "signup" | "guest" | "pick";
type Pending = { username: string; name: string; level: "4to" | "6to" | null; course: string };

/**
 * Entrada del alumno al estilo Duolingo: "Empezar" (crear cuenta), "Ya tengo una cuenta" (iniciar sesión)
 * o probar sin cuenta. Después se elige el guardián. Los pasos cambian sin esperar animaciones de salida.
 */
export function Welcome() {
  const { lang } = useT();
  const es = lang === "es";
  const setProfile = useStore((s) => s.setProfile);
  const setAvatar = useStore((s) => s.setAvatar);
  const setAccount = useStore((s) => s.setAccount);
  const setLang = useStore((s) => s.setLang);
  const [step, setStep] = useState<Step>("home");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState<"4to" | "6to" | "">("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pick, setPick] = useState<CharId>("mateo");

  const go = (s: Step) => {
    sfx.tap();
    setErr("");
    setStep(s);
  };

  async function auth(kind: "login" | "register") {
    setErr("");
    setBusy(true);
    try {
      const body = kind === "login" ? { username: user, password: pass } : { username: user, password: pass, name, course, level };
      const r = await fetch(`/api/auth/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      if (d.user.role !== "alumno") throw new Error(es ? "Es una cuenta de docente: entre por el panel docente." : "Teacher account: use the teacher panel.");
      sfx.reveal();
      setPending({ username: d.user.username, name: d.user.name, level: d.user.level ?? null, course: d.user.course ?? "" });
      setStep("pick");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <button className="wl-back" onClick={() => go(pending ? "home" : "home")} aria-label={es ? "Volver" : "Back"}>
      ←
    </button>
  );

  return (
    <div className="phone wl">
      <div className={`wl-hero ${step === "home" ? "big" : ""}`}>
        <img src="/fondos/sucre.webp" alt="" />
        <div className="welcome-parade" aria-hidden>
          <motion.div className="parade-track" initial={{ x: "-50%" }} animate={{ x: "0%" }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }}>
            {[...PARADE, ...PARADE].map((c, i) => (
              <span key={i} className="parade-item" style={{ ["--d" as string]: `${(i % PARADE.length) * 0.13}s` }}>
                <CharPose c={c} pose="mueve" size={c === "orki" || c === "kusi" ? 92 : 104} anim="none" />
              </span>
            ))}
          </motion.div>
        </div>
        <button className="lang-toggle small" onClick={() => setLang(es ? "en" : "es")}>
          <span className={es ? "on" : ""}>
            <b>ES</b>
          </span>
          <span className={!es ? "on" : ""}>
            <b>EN</b>
          </span>
        </button>
      </div>

      <div className="wl-body">
        <motion.div key={step} className="wl-step" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          {step === "home" && (
            <>
              <div className="wl-logo">
                <CharFace c="orki" face="alegre" size={58} anim="idle" />
                <b>patrilingo</b>
              </div>
              <h1>{es ? "¡La forma divertida de aprender el patrimonio de tu ciudad!" : "The fun way to learn your city's heritage!"}</h1>
              <div className="wl-actions">
                <Button block onClick={() => go("signup")}>
                  {es ? "Empezar" : "Get started"}
                </Button>
                <Button block variant="secondary" onClick={() => go("login")}>
                  {es ? "Ya tengo una cuenta" : "I already have an account"}
                </Button>
              </div>
              <button className="link-btn" onClick={() => go("guest")}>
                {es ? "Probar sin cuenta" : "Try without an account"}
              </button>
              <a className="link-btn" href="/conoce">
                {es ? "▶ Mira cómo funciona" : "▶ See how it works"}
              </a>
            </>
          )}

          {step === "login" && (
            <>
              {back}
              <h2>{es ? "Inicia sesión" : "Sign in"}</h2>
              <form
                className="wl-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void auth("login");
                }}
              >
                <div className="wl-field">
                  <input value={user} onChange={(e) => setUser(e.target.value)} placeholder={es ? "Usuario" : "Username"} autoComplete="username" autoCapitalize="none" aria-label={es ? "Usuario" : "Username"} />
                  <input value={pass} onChange={(e) => setPass(e.target.value)} type={showPass ? "text" : "password"} placeholder={es ? "Contraseña" : "Password"} autoComplete="current-password" aria-label={es ? "Contraseña" : "Password"} />
                  <button type="button" className="wl-eye" onClick={() => setShowPass(!showPass)} aria-label={es ? "Mostrar contraseña" : "Show password"}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
                {err && (
                  <motion.p className="wl-err" initial={{ x: -8 }} animate={{ x: [0, -6, 6, -3, 0] }}>
                    {err}
                  </motion.p>
                )}
                <Button type="submit" block disabled={!user || !pass || busy}>
                  {busy ? "…" : es ? "Iniciar sesión" : "Sign in"}
                </Button>
              </form>
              <p className="wl-hint">{es ? "¿Olvidaste tu contraseña? Pídele ayuda a tu profe." : "Forgot your password? Ask your teacher."}</p>
              <button className="link-btn" onClick={() => go("signup")}>
                {es ? "¿No tienes cuenta? Créala gratis" : "No account? Create one"}
              </button>
            </>
          )}

          {step === "signup" && (
            <>
              {back}
              <h2>{es ? "Crea tu cuenta" : "Create your account"}</h2>
              <p className="wl-hint">{es ? "Usa un apodo: nunca pedimos tu nombre real." : "Use a nickname: we never ask for your real name."}</p>
              <div className="wl-levels">
                {(["4to", "6to"] as const).map((l) => (
                  <button key={l} className={level === l ? "on" : ""} onClick={() => setLevel(l)}>
                    <b>{l}</b>
                    <small>{es ? "de secundaria" : "grade"}</small>
                  </button>
                ))}
                <button className={level === "" ? "on" : ""} onClick={() => setLevel("")}>
                  <b>{es ? "Otro" : "Other"}</b>
                  <small>{es ? "curso" : "grade"}</small>
                </button>
              </div>
              <form
                className="wl-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void auth("register");
                }}
              >
                <div className="wl-field">
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder={es ? "Apodo (cómo te verán en la liga)" : "Nickname"} aria-label="Apodo" />
                  <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder={es ? "Código de curso · ej. 4TO-A" : "Class code · e.g. 4TO-A"} aria-label="Curso" />
                </div>
                <div className="wl-field">
                  <input value={user} onChange={(e) => setUser(e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder={es ? "Usuario (sin espacios)" : "Username"} autoComplete="username" autoCapitalize="none" aria-label="Usuario" />
                  <input value={pass} onChange={(e) => setPass(e.target.value)} type={showPass ? "text" : "password"} placeholder={es ? "Contraseña (mínimo 6)" : "Password (min 6)"} autoComplete="new-password" aria-label="Contraseña" />
                  <button type="button" className="wl-eye" onClick={() => setShowPass(!showPass)} aria-label={es ? "Mostrar contraseña" : "Show password"}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
                {err && (
                  <motion.p className="wl-err" animate={{ x: [0, -6, 6, -3, 0] }}>
                    {err}
                  </motion.p>
                )}
                <Button type="submit" block disabled={!user || pass.length < 6 || name.trim().length < 2 || course.trim().length < 2 || busy}>
                  {busy ? "…" : es ? "Crear cuenta" : "Create account"}
                </Button>
              </form>
              <button className="link-btn" onClick={() => go("login")}>
                {es ? "Ya tengo una cuenta" : "I already have an account"}
              </button>
            </>
          )}

          {step === "guest" && (
            <>
              {back}
              <h2>{es ? "Probar sin cuenta" : "Try it out"}</h2>
              <p className="wl-hint">{es ? "Tu avance queda solo en este dispositivo." : "Progress stays on this device only."}</p>
              <form
                className="wl-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim().length < 2 || course.trim().length < 2) return;
                  setPending(null);
                  go("pick");
                }}
              >
                <div className="wl-field">
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder={es ? "Tu apodo (no tu nombre real)" : "Nickname"} aria-label="Apodo" />
                  <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder={es ? "Código de curso · 4TO-A" : "Class code"} aria-label="Curso" />
                </div>
                <Button type="submit" block disabled={name.trim().length < 2 || course.trim().length < 2}>
                  {es ? "Continuar" : "Continue"}
                </Button>
              </form>
            </>
          )}

          {step === "pick" && (
            <>
              <h2>
                {pending ? (es ? `¡Hola, ${pending.name}! ` : `Hi, ${pending.name}! `) : ""}
                {es ? "Elige tu guardián" : "Choose your guardian"}
              </h2>
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
              <div className="wl-sticky">
                <Button
                  block
                  onClick={() => {
                    sfx.reveal();
                    setAvatar(pick, "casual");
                    if (pending) setAccount(pending);
                    else setProfile(name.trim().slice(0, 16), course.trim().slice(0, 12));
                  }}
                >
                  {es ? "¡A jugar!" : "Let's play!"}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

import { motion } from "motion/react";
import { useState } from "react";
import { CHARACTERS, type CharId } from "../characters";
import { CharFace, CharPose } from "../components/Character";
import { Button } from "../components/ui";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";

const PARADE: CharId[] = ["mateo", "sofia", "orki", "juanita", "wara", "kusi", "bruno", "julian"];
type Step = "home" | "start" | "pick";

/**
 * Entrada del alumno al estilo Duolingo, sin usuario ni contraseña: apodo, curso y nivel,
 * y luego elige su guardián. El nivel ajusta la dificultad inicial (4to Fácil, 6to Difícil).
 */
export function Welcome() {
  const { lang } = useT();
  const es = lang === "es";
  const setProfile = useStore((s) => s.setProfile);
  const setAvatar = useStore((s) => s.setAvatar);
  const setAccount = useStore((s) => s.setAccount);
  const setLang = useStore((s) => s.setLang);
  const [step, setStep] = useState<Step>("home");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState<"4to" | "6to" | "">("");
  const [pick, setPick] = useState<CharId>("mateo");
  const valid = name.trim().length >= 2 && course.trim().length >= 2;

  const go = (s: Step) => {
    sfx.tap();
    setStep(s);
  };

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
                <b>historybol</b>
              </div>
              <h1>{es ? "¡La forma divertida de aprender la historia y el patrimonio de tu ciudad!" : "The fun way to learn your city's history and heritage!"}</h1>
              <div className="wl-actions">
                <Button block onClick={() => go("start")}>
                  {es ? "Empezar" : "Get started"}
                </Button>
              </div>
              <a className="link-btn" href="/conoce">
                {es ? "▶ Mira cómo funciona" : "▶ See how it works"}
              </a>
            </>
          )}

          {step === "start" && (
            <>
              <button className="wl-back" onClick={() => go("home")} aria-label={es ? "Volver" : "Back"}>
                ←
              </button>
              <h2>{es ? "¿Quién eres?" : "Who are you?"}</h2>
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
                  if (valid) go("pick");
                }}
              >
                <div className="wl-field">
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder={es ? "Tu apodo (cómo te verán en la liga)" : "Nickname"} aria-label="Apodo" />
                  <input value={course} onChange={(e) => setCourse(e.target.value.toUpperCase())} maxLength={12} placeholder={es ? "Código de curso · ej. 4TO-A" : "Class code · e.g. 4TO-A"} aria-label="Curso" />
                </div>
                <Button type="submit" block disabled={!valid}>
                  {es ? "Continuar" : "Continue"}
                </Button>
              </form>
            </>
          )}

          {step === "pick" && (
            <>
              <button className="wl-back" onClick={() => go("start")} aria-label={es ? "Volver" : "Back"}>
                ←
              </button>
              <h2>{es ? `¡Hola, ${name.trim()}! Elige tu guardián` : `Hi, ${name.trim()}! Choose your guardian`}</h2>
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
                    // el nivel solo ajusta la dificultad inicial; no hay cuenta ni contraseña
                    if (level) setAccount({ username: "", name: name.trim().slice(0, 16), level, course: course.trim() });
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

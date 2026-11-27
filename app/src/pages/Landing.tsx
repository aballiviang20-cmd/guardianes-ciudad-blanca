import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CHARACTERS, type CharId } from "../characters";
import { CharFace, CharPose } from "../components/Character";
import { MonumentIcon } from "../components/MonumentIcon";
import { Button } from "../components/ui";

/* ------------------------------------------------------------------------------------------
 * Página pública tipo Duolingo: qué es, cómo se usa (dos tutoriales animados narrados por Orki
 * con voz del navegador y subtítulos), en qué dispositivos funciona y quiénes son los guardianes.
 * ------------------------------------------------------------------------------------------ */

type Scene = { kind: string; text: string };

const ALUMNO: Scene[] = [
  { kind: "intro", text: "¡Hola! Soy Orki, el dinosaurio de Cal Orck'o. En dos minutos te enseño a usar Guardianes de la Ciudad Blanca." },
  { kind: "login", text: "Entra con tu apodo y el código de tu curso, o con la cuenta que te dio tu profe. Nunca te pedimos tu nombre real." },
  { kind: "cast", text: "Elige tu guardián: Mateo, Wara, Sofía, Juanita, Bruno, Tata Julián, la llama Kusi o yo. Y puedes vestirlo con ropa tarabuqueña o de cueca." },
  { kind: "path", text: "Tu ruta en el tiempo empieza en mil quinientos treinta y ocho con San Lázaro, y llega a mil novecientos noventa y uno, cuando Sucre fue Patrimonio de la Humanidad." },
  { kind: "comic", text: "En cada parada primero lees un cómic: la historia contada por nosotros, con datos reales y sin nombres difíciles." },
  { kind: "diff", text: "Después viene el reto. Elige la dificultad: fácil, medio o difícil. Tienes tres vidas, ¡cuídalas!" },
  { kind: "quiz", text: "Responde verdadero o falso, elige la opción correcta u ordena los hechos en el tiempo. Si fallas, te explico por qué." },
  { kind: "source", text: "Cada pregunta trae su fuente. Nada es inventado: todo sale de documentos que revisó tu profe." },
  { kind: "stars", text: "Gana estrellas y experiencia, y figuritas para tu álbum. Si escaneas el código QR del monumento, ¡ganas la figurita dorada!" },
  { kind: "report", text: "Si ves un daño en un monumento, repórtalo en Misión Guardián. Así ayudas de verdad a cuidar tu ciudad." },
  { kind: "league", text: "Tu curso compite en la liga con los demás cursos. ¡Vamos, guardián, Sucre te necesita!" },
];

const DOCENTE: Scene[] = [
  { kind: "intro", text: "Hola, profe. Soy Orki y le muestro el panel docente en dos minutos. Todo está pensado para que sea fácil." },
  { kind: "login", text: "Entre con su usuario y contraseña. El panel ya conoce su materia y sus cursos, por ejemplo cuarto y sexto de secundaria." },
  { kind: "dash", text: "El inicio le dice cuál es el próximo paso recomendado, y cómo va su curso: alumnos activos, retos completados y porcentaje de aciertos." },
  { kind: "upload", text: "Paso uno: cargue información confiable. Elija el lugar, diga de dónde sale el dato, y pegue el texto de su libro o apunte." },
  { kind: "ai", text: "Paso dos: cree la lección con inteligencia artificial. Busca en sus fuentes y escribe preguntas con una cita obligatoria." },
  { kind: "check", text: "Luego, el sistema confirma que la cita exista tal cual, y otra inteligencia artificial revisa que respalde la respuesta. Si no, la pregunta se descarta." },
  { kind: "review", text: "Paso tres: revise una por una. Ve la pregunta como la verá el alumno, y la frase exacta de la fuente. Apruebe, edite o rechace." },
  { kind: "activity", text: "Paso cuatro: asigne una actividad. Elija curso, lugar, dificultad y fecha. Sus alumnos la ven al instante en su ruta." },
  { kind: "progress", text: "En Mi curso verá la liga de cursos y las preguntas que más fallan, para reforzarlas en clase." },
  { kind: "report", text: "Y en Reportes, los daños que sus alumnos encuentran en los monumentos. ¡Gracias por cuidar nuestro patrimonio, profe!" },
];

/** Duración de cada escena: según el largo del texto (si no hay voz) o hasta que la voz termina. */
const sceneMs = (t: string) => Math.max(7000, t.length * 68);

function pickVoice() {
  const vs = window.speechSynthesis?.getVoices() ?? [];
  return vs.find((v) => /es[-_](BO|PE|419|MX|US|AR|CO|CL)/i.test(v.lang)) ?? vs.find((v) => v.lang.toLowerCase().startsWith("es")) ?? null;
}

function SceneArt({ kind, teacher }: { kind: string; teacher: boolean }) {
  const pop = (d = 0) => ({ initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: d, type: "spring" as const, stiffness: 320, damping: 18 } });
  const up = (d = 0) => ({ initial: { y: 30, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: d, type: "spring" as const, stiffness: 220, damping: 22 } });
  switch (kind) {
    case "intro":
      return (
        <div className="sa-intro">
          <motion.div {...pop(0.1)}>
            <CharPose c="orki" pose="salta" size={210} anim="jump" pulse={1} />
          </motion.div>
          <motion.h3 {...up(0.4)}>{teacher ? "Panel docente" : "Guardianes de la Ciudad Blanca"}</motion.h3>
          <motion.p {...up(0.6)}>{teacher ? "Prepare su clase en 3 minutos" : "Conoce · Colecciona · Protege"}</motion.p>
        </div>
      );
    case "login":
      return (
        <motion.div className="sa-card" {...up(0.1)}>
          <b>{teacher ? "Bienvenido, profe" : "Entra con tu cuenta"}</b>
          <span className="sa-input">
            <motion.i initial={{ width: 0 }} animate={{ width: "70%" }} transition={{ delay: 0.5, duration: 1.2 }} />
          </span>
          <span className="sa-input">
            <motion.i initial={{ width: 0 }} animate={{ width: "45%" }} transition={{ delay: 1.8, duration: 0.9 }} />
          </span>
          <motion.span className="sa-btn" initial={{ scale: 1 }} animate={{ scale: [1, 0.94, 1] }} transition={{ delay: 3, duration: 0.4 }}>
            Entrar
          </motion.span>
          {teacher && (
            <motion.div className="sa-chips" {...up(3.4)}>
              <span>4TO-A</span>
              <span>6TO-A</span>
              <span>Ciencias Sociales</span>
            </motion.div>
          )}
        </motion.div>
      );
    case "cast":
      return (
        <div className="sa-cast">
          {(Object.keys(CHARACTERS) as CharId[]).map((c, i) => (
            <motion.div key={c} {...pop(0.15 + i * 0.18)} className="sa-cast-item">
              <CharFace c={c} face="alegre" size={86} anim="idle" />
              <small>{CHARACTERS[c].name}</small>
            </motion.div>
          ))}
        </div>
      );
    case "path":
      return (
        <div className="sa-path">
          <svg viewBox="0 0 400 120" className="sa-path-line">
            <motion.path d="M30 90 C 110 10, 160 110, 210 50 S 330 20, 370 70" fill="none" stroke="#e5a823" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 16" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4 }} />
          </svg>
          {[
            ["san-lazaro", "1538", 8, 62],
            ["catedral", "1552", 30, 22],
            ["casa-libertad", "1825", 56, 40],
            ["sucre", "1991", 84, 28],
          ].map(([id, y, x, top], i) => (
            <motion.div key={id} className="sa-stop" style={{ left: `${x}%`, top: `${top}%` }} {...pop(0.4 + i * 0.55)}>
              <MonumentIcon id={String(id)} size={26} />
              <b>{y}</b>
            </motion.div>
          ))}
        </div>
      );
    case "comic":
      return (
        <div className="sa-comic">
          <motion.div className="sa-panel" {...up(0.1)}>
            <img src="/fondos/san-lazaro.webp" alt="" />
            <div className="sa-panel-char">
              <CharPose c="wara" pose="frente" size={130} anim="idle" />
            </div>
            <motion.div className="sa-bubble" {...pop(0.8)}>
              O sea… ¡la primera iglesia de Sucre era de barro y paja!
            </motion.div>
            <motion.span className="sa-sfx" {...pop(1.6)}>
              ¡1538!
            </motion.span>
          </motion.div>
        </div>
      );
    case "diff":
      return (
        <div className="sa-diff">
          <div className="sa-seg">
            {["Fácil", "Medio", "Difícil"].map((d, i) => (
              <motion.span key={d} className={`d${i}`} animate={{ scale: [1, 1.12, 1] }} transition={{ delay: 0.6 + i * 0.9, duration: 0.5 }}>
                {d}
              </motion.span>
            ))}
          </div>
          <div className="sa-hearts">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} {...pop(2.8 + i * 0.25)}>
                ❤
              </motion.span>
            ))}
          </div>
        </div>
      );
    case "quiz":
      return (
        <motion.div className="sa-card sa-quiz" {...up(0.1)}>
          <b>¿En qué año se firmó el Acta de la Independencia?</b>
          {["1809", "1825", "1991"].map((o, i) => (
            <motion.span key={o} className="sa-opt" initial={{ x: -20, opacity: 0 }} animate={i === 1 ? { x: 0, opacity: 1, backgroundColor: ["#ffffff", "#ffffff", "#e5f7ec"], borderColor: ["#d8cebf", "#d8cebf", "#2e9e5b"] } : { x: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.2, duration: i === 1 ? 2.6 : 0.4, times: i === 1 ? [0, 0.7, 1] : undefined }}>
              {o} {i === 1 && <motion.em {...pop(2.6)}>✓</motion.em>}
            </motion.span>
          ))}
          <motion.div className="sa-face" {...pop(2.8)}>
            <CharFace c="orki" face="alegre" size={70} anim="idle" />
          </motion.div>
        </motion.div>
      );
    case "source":
      return (
        <motion.div className="sa-source" {...up(0.1)}>
          <small>Fuente · Casa de la Libertad</small>
          <p>
            Aquí se firmó el{" "}
            <motion.mark initial={{ backgroundSize: "0% 100%" }} animate={{ backgroundSize: "100% 100%" }} transition={{ delay: 0.9, duration: 1.4 }}>
              Acta de la Independencia de Bolivia, el 6 de agosto de 1825
            </motion.mark>
            .
          </p>
          <motion.span className="sa-badge" {...pop(2.6)}>
            ✓ Cita verificada
          </motion.span>
        </motion.div>
      );
    case "stars":
      return (
        <div className="sa-stars">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + i * 0.35, type: "spring", stiffness: 300, damping: 12 }}>
              ★
            </motion.span>
          ))}
          <motion.b {...up(1.5)}>+28 XP</motion.b>
          <motion.div className="sa-qr" {...pop(2.4)}>
            <svg viewBox="0 0 24 24" width="70" height="70" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3M21 14v7h-4M14 18v3" />
            </svg>
            <small>Figurita dorada</small>
          </motion.div>
        </div>
      );
    case "report":
      return (
        <motion.div className="sa-card sa-report" {...up(0.1)}>
          <motion.span className="sa-shield" {...pop(0.4)}>
            🛡️
          </motion.span>
          <b>{teacher ? "Reportes de alumnos" : "Misión Guardián"}</b>
          <span className="sa-opt">Grafiti en una pared · Catedral</span>
          <motion.span className="sa-badge" {...pop(1.6)}>
            {teacher ? "Nuevo reporte de 4TO-A" : "¡Reporte enviado! +5 XP"}
          </motion.span>
        </motion.div>
      );
    case "league":
      return (
        <div className="sa-league">
          {[
            ["6TO-A", 70],
            ["4TO-A", 95],
            ["5TO-B", 50],
          ].map(([c, h], i) => (
            <div key={String(c)} className="sa-podium">
              <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.3, duration: 0.9 }} className={`p${i}`}>
                <b>{c}</b>
              </motion.div>
            </div>
          ))}
        </div>
      );
    case "dash":
      return (
        <div className="sa-dash">
          <motion.div className="sa-next" {...up(0.1)}>
            Próximo paso: <b>revisar 3 preguntas</b>
          </motion.div>
          <div className="sa-kpis">
            {[
              ["Alumnos", "28"],
              ["Retos", "64"],
              ["Aciertos", "81%"],
            ].map(([l, v], i) => (
              <motion.div key={l} className="sa-kpi" {...pop(0.6 + i * 0.25)}>
                <b>{v}</b>
                <small>{l}</small>
              </motion.div>
            ))}
          </div>
        </div>
      );
    case "upload":
      return (
        <motion.div className="sa-card" {...up(0.1)}>
          <b>Información para la IA</b>
          <div className="sa-chips">
            <motion.span {...pop(0.5)} className="on">
              Casa de la Libertad
            </motion.span>
            <span>San Lázaro</span>
          </div>
          <span className="sa-input">
            <motion.i initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ delay: 1, duration: 1 }} />
          </span>
          <span className="sa-textarea">
            {[0, 1, 2, 3].map((k) => (
              <motion.i key={k} initial={{ width: 0 }} animate={{ width: `${90 - k * 12}%` }} transition={{ delay: 2 + k * 0.4, duration: 0.5 }} />
            ))}
          </span>
          <motion.span className="sa-badge" {...pop(4)}>
            ✓ 12 datos nuevos
          </motion.span>
        </motion.div>
      );
    case "ai":
    case "check":
      return (
        <div className="sa-stages">
          {["Busca en sus fuentes", "La IA escribe", "Revisa la cita", "Segunda opinión"].map((s, i) => (
            <motion.div key={s} className={`sa-stage ${i % 2 ? "ai" : ""}`} initial={{ opacity: 0.35, y: 10 }} animate={{ opacity: kind === "ai" ? (i < 2 ? 1 : 0.35) : 1, y: 0 }} transition={{ delay: (kind === "ai" ? i : i - 2 < 0 ? 0 : i - 1) * 0.8 + 0.2 }}>
              <motion.span className="sa-dot" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: i * 0.8 + 0.4 }}>
                {kind === "check" || i < 2 ? "✓" : i + 1}
              </motion.span>
              <b>{s}</b>
              <small>{i % 2 ? "IA" : "Código"}</small>
            </motion.div>
          ))}
        </div>
      );
    case "review":
      return (
        <div className="sa-review">
          <motion.div className="sa-phone" {...up(0.1)}>
            <b>Ordena la ruta en el tiempo</b>
            <span className="sa-opt">1. San Lázaro (1538)</span>
            <span className="sa-opt">2. Independencia (1825)</span>
            <span className="sa-opt">3. Patrimonio (1991)</span>
          </motion.div>
          <div className="sa-review-side">
            <motion.div className="sa-source small" {...up(0.6)}>
              <mark>Sucre fue declarada Patrimonio de la Humanidad en 1991</mark>
            </motion.div>
            <motion.span className="sa-approve" initial={{ scale: 1 }} animate={{ scale: [1, 0.9, 1.08, 1] }} transition={{ delay: 2.4, duration: 0.6 }}>
              ✓ Aprobar
            </motion.span>
          </div>
        </div>
      );
    case "activity":
      return (
        <motion.div className="sa-act" initial={{ y: -60, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 14 }}>
          <small>Tarea del profe</small>
          <b>San Lázaro · Fácil</b>
          <span>4TO-A · hasta el viernes</span>
          <motion.em {...pop(1.8)}>¡Lean el cuento antes del reto!</motion.em>
        </motion.div>
      );
    case "progress":
      return (
        <div className="sa-bars">
          {[
            ["4TO-A", 82],
            ["6TO-A", 64],
          ].map(([c, w], i) => (
            <div key={String(c)} className="sa-barrow">
              <b>{c}</b>
              <span>
                <motion.i initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.4 + i * 0.4, duration: 1 }} />
              </span>
            </div>
          ))}
          <motion.div className="sa-source small" {...up(1.6)}>
            Para reforzar: <b>¿Cuántas naves tiene la Catedral?</b>
          </motion.div>
        </div>
      );
    default:
      return null;
  }
}

function TutorialPlayer({ title, scenes, teacher }: { title: string; scenes: Scene[]; teacher: boolean }) {
  const [i, setI] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = scenes.reduce((a, s) => a + sceneMs(s.text), 0);

  useEffect(() => {
    if (!playing || i < 0) return;
    const s = scenes[i];
    const next = () => (i < scenes.length - 1 ? setI(i + 1) : setPlaying(false));
    let spoke = false;
    if (voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s.text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang ?? "es-ES";
      u.rate = 1.03;
      u.pitch = 1.15;
      u.onend = () => {
        timer.current = setTimeout(next, 700);
      };
      window.speechSynthesis.speak(u);
      spoke = true;
    }
    // respaldo: si no hay voz (o no termina), avanza por tiempo
    const fallback = setTimeout(next, spoke ? sceneMs(s.text) + 4000 : sceneMs(s.text));
    return () => {
      clearTimeout(fallback);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [i, playing, voice, scenes]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const cur = scenes[Math.max(0, i)];
  const elapsed = scenes.slice(0, Math.max(0, i)).reduce((a, s) => a + sceneMs(s.text), 0);
  return (
    <div className={`tut ${teacher ? "teacher" : ""}`}>
      <div className="tut-stage">
        {i < 0 ? (
          <button
            className="tut-cover"
            onClick={() => {
              setI(0);
              setPlaying(true);
            }}
          >
            <CharPose c="orki" pose={teacher ? "bolivia" : "sucre"} size={170} anim="wave" />
            <span className="tut-play">▶</span>
            <b>{title}</b>
            <small>{Math.round(total / 60000)} min · narrado por Orki</small>
          </button>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <motion.div key={i} className="tut-scene" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.45 }}>
                <SceneArt kind={cur.kind} teacher={teacher} />
              </motion.div>
            </AnimatePresence>
            <div className="tut-narrator">
              <CharFace c="orki" face={i % 3 === 0 ? "alegre" : i % 3 === 1 ? "pensativo" : "sorprendido"} size={64} anim="talk" />
              <motion.p key={`t${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {cur.text}
              </motion.p>
            </div>
          </>
        )}
      </div>
      <div className="tut-bar">
        <button
          onClick={() => {
            if (i < 0) setI(0);
            if (playing) window.speechSynthesis?.cancel();
            setPlaying(!playing);
          }}
          aria-label={playing ? "Pausa" : "Reproducir"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="tut-progress">
          {scenes.map((s, k) => (
            <button
              key={k}
              className={k < i ? "past" : k === i ? "now" : ""}
              style={{ flex: sceneMs(s.text) }}
              onClick={() => {
                window.speechSynthesis?.cancel();
                setI(k);
                setPlaying(true);
              }}
              aria-label={`Escena ${k + 1}`}
            />
          ))}
        </div>
        <span className="tut-time">
          {Math.floor(elapsed / 60000)}:{String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")} / {Math.floor(total / 60000)}:{String(Math.floor((total % 60000) / 1000)).padStart(2, "0")}
        </span>
        <button
          onClick={() => {
            window.speechSynthesis?.cancel();
            setVoice(!voice);
          }}
          aria-label="Voz"
        >
          {voice ? "🔊" : "🔇"}
        </button>
      </div>
    </div>
  );
}

const PARADE: CharId[] = ["mateo", "sofia", "orki", "juanita", "wara", "kusi", "bruno", "julian"];

export function LandingPage() {
  const [tab, setTab] = useState<"alumno" | "docente">("alumno");
  return (
    <div className="ld">
      <header className="ld-nav">
        <Link to="/conoce" className="ld-logo">
          <CharFace c="orki" face="alegre" size={40} anim="idle" />
          <b>guardianes</b>
        </Link>
        <nav>
          <a href="#como">Cómo funciona</a>
          <a href="#tutoriales">Tutoriales</a>
          <a href="#dispositivos">Dispositivos</a>
          <Link to="/docente" className="ld-ghost">
            Soy docente
          </Link>
        </nav>
      </header>

      <section className="ld-hero">
        <div className="ld-hero-art">
          <img src="/fondos/sucre.webp" alt="Sucre, la Ciudad Blanca" />
          <div className="ld-parade" aria-hidden>
            <motion.div className="parade-track" initial={{ x: "-50%" }} animate={{ x: "0%" }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
              {[...PARADE, ...PARADE].map((c, k) => (
                <span key={k} className="parade-item" style={{ ["--d" as string]: `${(k % PARADE.length) * 0.13}s` }}>
                  <CharPose c={c} pose="mueve" size={c === "orki" || c === "kusi" ? 110 : 124} anim="none" />
                </span>
              ))}
            </motion.div>
          </div>
        </div>
        <div className="ld-hero-txt">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            La forma divertida de conocer y cuidar tu ciudad.
          </motion.h1>
          <p>Cómics, retos y figuritas sobre el patrimonio de Sucre, con contenido verificado por tu profe.</p>
          <div className="ld-ctas">
            <Link to="/">
              <Button block>Empezar ahora</Button>
            </Link>
            <Link to="/docente">
              <Button variant="secondary" block>
                Soy docente
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="ld-sec" id="como">
        <h2>Cómo funciona</h2>
        <div className="ld-cards">
          {[
            { c: "wara" as CharId, t: "Cómics antes del reto", d: "Clase invertida: primero la historia contada por los personajes, después el reto." },
            { c: "mateo" as CharId, t: "Retos a tu nivel", d: "Fácil, medio o difícil. Cuarto y sexto de secundaria tienen su propio camino." },
            { c: "juanita" as CharId, t: "Nada inventado", d: "Cada pregunta trae su cita de la fuente. La IA propone; el docente aprueba." },
            { c: "bruno" as CharId, t: "Cuidar de verdad", d: "Misión Guardián: reporta daños en los monumentos y tu curso suma puntos." },
          ].map((x, k) => (
            <motion.div key={x.t} className="ld-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.1 }}>
              <CharFace c={x.c} face="alegre" size={90} anim="idle" />
              <b>{x.t}</b>
              <p>{x.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="ld-sec alt" id="tutoriales">
        <h2>Aprende a usarla en 2 minutos</h2>
        <p className="ld-sub">Orki te lo explica con voz y subtítulos.</p>
        <div className="ld-tabs">
          <button className={tab === "alumno" ? "on" : ""} onClick={() => setTab("alumno")}>
            Soy estudiante
          </button>
          <button className={tab === "docente" ? "on" : ""} onClick={() => setTab("docente")}>
            Soy docente
          </button>
        </div>
        {tab === "alumno" ? <TutorialPlayer key="a" title="Tutorial para estudiantes" scenes={ALUMNO} teacher={false} /> : <TutorialPlayer key="d" title="Tutorial para docentes" scenes={DOCENTE} teacher />}
      </section>

      <section className="ld-sec" id="dispositivos">
        <h2>En tu celular, tablet o computadora</h2>
        <p className="ld-sub">Se instala como app y funciona sin internet una vez abierta.</p>
        <div className="ld-devices">
          <div className="dev laptop">
            <div className="dev-screen">
              <iframe src="/docente" title="Panel docente en computadora" loading="lazy" />
            </div>
            <span className="dev-base" />
            <small>Computadora · panel docente</small>
          </div>
          <div className="dev tablet">
            <div className="dev-screen">
              <iframe src="/historia/sucre" title="Cómic en tablet" loading="lazy" />
            </div>
            <small>Tablet · cómic de la parada</small>
          </div>
          <div className="dev phone">
            <div className="dev-screen">
              <iframe src="/" title="App del alumno en celular" loading="lazy" />
            </div>
            <small>Celular · app del alumno</small>
          </div>
        </div>
      </section>

      <section className="ld-sec alt">
        <h2>Conoce a los guardianes</h2>
        <div className="ld-cast">
          {(Object.keys(CHARACTERS) as CharId[]).map((c, k) => (
            <motion.div key={c} className="ld-char" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: k * 0.06 }}>
              <CharPose c={c} pose="frente" size={140} anim="idle" />
              <b>{CHARACTERS[c].name}</b>
              <small>{CHARACTERS[c].tagline.es}</small>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="ld-foot">
        <CharPose c="orki" pose="bolivia" size={110} anim="wave" />
        <div>
          <b>Guardianes de la Ciudad Blanca</b>
          <p>Hecho en Sucre para la Hackathon Regional 2026 · Patrimonio y educación.</p>
          <a href="https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca" target="_blank" rel="noreferrer">
            Código abierto en GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

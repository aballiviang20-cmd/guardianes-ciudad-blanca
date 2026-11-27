import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../api";
import { MonumentIcon } from "../components/MonumentIcon";
import { Button } from "../components/ui";
import { buildClassifier, embed, evaluate, loadVision, OTHER, predict, type Example, type Metrics } from "../vision";

type Monument = { id: string; name: { es: string }; color: string };

/**
 * Entrenamiento del reconocimiento (código versionado en el repo, no una herramienta externa):
 * se capturan ejemplos con la cámara o se suben fotos por clase, se evalúa con ejemplos separados
 * y se guarda el conjunto de vectores en el servidor. Las fotos nunca se guardan.
 */
export function TrainPage() {
  const pin = sessionStorage.getItem("teacher-pin") ?? "";
  const video = useRef<HTMLVideoElement>(null);
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [cls, setCls] = useState<string>("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [status, setStatus] = useState("Cargando modelo base (MobileNet)…");
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [live, setLive] = useState<{ label: string; confidence: number } | null>(null);
  const [camError, setCamError] = useState("");

  useEffect(() => {
    fetch("/api/monuments").then((r) => r.json()).then((m: Monument[]) => {
      setMonuments(m);
      setCls(m[0]?.id ?? OTHER);
    });
    fetch("/api/classifier").then((r) => r.json()).then((d) => d.available && setExamples(d.examples));
    loadVision()
      .then(() => {
        setReady(true);
        setStatus("Modelo base listo.");
      })
      .catch((e) => setStatus(`No se pudo cargar MobileNet: ${e.message}`));
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setCamError("Sin cámara (requiere HTTPS o localhost y permiso). Puedes subir fotos."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // Captura continua mientras se mantiene presionado.
  useEffect(() => {
    if (!capturing || !ready || !video.current) return;
    let alive = true;
    const loop = async () => {
      while (alive && video.current && video.current.readyState >= 2) {
        const vec = await embed(video.current);
        setExamples((xs) => [...xs, { label: cls, vec }]);
        await new Promise((r) => setTimeout(r, 150));
      }
    };
    void loop();
    return () => {
      alive = false;
    };
  }, [capturing, ready, cls]);

  // Prueba en vivo con el modelo actual.
  useEffect(() => {
    if (!ready || examples.length < 5 || !video.current || camError) return;
    let alive = true;
    let c: Awaited<ReturnType<typeof buildClassifier>> | null = null;
    void (async () => {
      c = await buildClassifier(examples);
      while (alive && video.current) {
        if (video.current.readyState >= 2 && !capturing) setLive(await predict(c, await embed(video.current)));
        await new Promise((r) => setTimeout(r, 500));
      }
    })();
    return () => {
      alive = false;
      c?.dispose();
    };
  }, [ready, examples.length, capturing, camError]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      // createImageBitmap + lienzo chico: funciona en cualquier navegador y reduce fotos grandes del celular.
      const bmp = await createImageBitmap(f);
      const canvas = document.createElement("canvas");
      const scale = 256 / Math.max(bmp.width, bmp.height);
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      const vec = await embed(canvas);
      setExamples((xs) => [...xs, { label: cls, vec }]);
    }
  }

  async function runEval() {
    setStatus("Evaluando con ejemplos separados…");
    const m = await evaluate(examples);
    setMetrics(m);
    setStatus(`Precisión ${Math.round(m.accuracy * 100)}% en ${m.nTest} ejemplos de prueba.`);
  }

  async function save() {
    setStatus("Guardando…");
    const r = await teacherApi(pin).post<{ saved: number }>("/classifier", { examples, metrics });
    setStatus(`Modelo guardado (${r.saved} ejemplos). Ya funciona en Escanear.`);
  }

  if (!pin) return <div className="evidence-page"><p>Primero entra al <Link to="/docente">panel docente</Link>.</p></div>;

  const classes = [...monuments.map((m) => ({ id: m.id, label: m.name.es, color: m.color })), { id: OTHER, label: "Otro (cualquier otra cosa)", color: "#7b7168" }];
  const count = (id: string) => examples.filter((e) => e.label === id).length;
  const nameOf = (id: string) => classes.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="evidence-page train">
      <header className="label-head">
        <h1>Entrenar reconocimiento</h1>
        <span className="note">{status}</span>
        <Link to="/docente">Panel docente</Link>
      </header>
      <div className="label-grid">
        <div className="card">
          <div className="train-video">
            <video ref={video} autoPlay playsInline muted />
            {live && (
              <motion.span key={live.label} className="train-live" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                {nameOf(live.label)} · {Math.round(live.confidence * 100)}%
              </motion.span>
            )}
          </div>
          {camError && <p className="error">{camError}</p>}
          <div className="chips">
            {classes.map((c) => (
              <button key={c.id} className={`chip-btn ${cls === c.id ? "on" : ""}`} style={{ ["--accent" as string]: c.color }} onClick={() => setCls(c.id)}>
                {c.id !== OTHER && <MonumentIcon id={c.id} size={18} />} {c.label} <b>{count(c.id)}</b>
              </button>
            ))}
          </div>
          <div className="row-gap">
            <Button
              disabled={!ready || !!camError}
              onPointerDown={() => setCapturing(true)}
              onPointerUp={() => setCapturing(false)}
              onPointerLeave={() => setCapturing(false)}
            >
              {capturing ? "Capturando…" : "Mantén para capturar"}
            </Button>
            <label className="btn btn-secondary file-btn">
              Subir fotos
              <input type="file" accept="image/*" multiple hidden disabled={!ready} onChange={(e) => void addFiles(e.target.files)} />
            </label>
            <button className="link" onClick={() => setExamples((xs) => xs.filter((x) => x.label !== cls))}>
              Borrar ejemplos de esta clase
            </button>
          </div>
          <small className="note-muted">Sugerencia: 20 o más ejemplos por monumento desde varios ángulos y luces, y 30 de "otro" (calles, otras casas, personas no, mejor fachadas).</small>
        </div>
        <div className="card">
          <h3>Evaluación</h3>
          <div className="row-gap">
            <Button variant="secondary" disabled={examples.length < 10} onClick={runEval}>
              Evaluar
            </Button>
            <Button variant="success" disabled={!metrics} onClick={save}>
              Guardar modelo
            </Button>
          </div>
          {metrics && (
            <>
              <p>
                Precisión: <b>{Math.round(metrics.accuracy * 100)}%</b> · entrenamiento {metrics.nTrain} · prueba {metrics.nTest}
                {metrics.falsePositiveOther != null && (
                  <>
                    {" "}· falsos positivos en "otro": <b>{Math.round(metrics.falsePositiveOther * 100)}%</b>
                  </>
                )}
              </p>
              <table className="confusion">
                <thead>
                  <tr>
                    <th>real \ predicho</th>
                    {metrics.classes.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.matrix.map((row, i) => (
                    <tr key={i}>
                      <th>{metrics.classes[i]}</th>
                      {row.map((v, j) => (
                        <td key={j} className={i === j ? "diag" : v ? "miss" : ""}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <small className="note-muted">{metrics.note}</small>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Burst, Rays } from "../components/Burst";
import { Figurita } from "../components/Figurita";
import { Mascot } from "../components/Mascot";
import { Button, Icon } from "../components/ui";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import { useContent } from "../useContent";
import { buildClassifier, embed, loadVision, OTHER, predict, STREAK, THRESHOLD, type Example } from "../vision";

type Phase = "loading" | "nomodel" | "scanning" | "found" | "error";

/** Escanear: reconoce el monumento en el celular y entrega la figurita dorada. La cámara requiere HTTPS. */
export function ScanPage() {
  const { id } = useParams();
  const content = useContent();
  const m = content?.monuments.find((x) => x.id === id) ?? null;
  const { t, lang } = useT();
  const navigate = useNavigate();
  const unlockGolden = useStore((s) => s.unlockGolden);
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [guess, setGuess] = useState<{ label: string; confidence: number } | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    let classifier: Awaited<ReturnType<typeof buildClassifier>> | null = null;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (video.current) video.current.srcObject = stream;
      } catch {
        setError("No se pudo abrir la cámara (requiere HTTPS y permiso).");
        setPhase("error");
        return;
      }
      const data = (await fetch("/api/classifier").then((r) => r.json()).catch(() => ({ examples: [] }))) as { examples: Example[] };
      if (!data.examples?.length) {
        setPhase("nomodel");
        return;
      }
      await loadVision();
      classifier = await buildClassifier(data.examples);
      setPhase("scanning");
      let run = 0;
      while (alive && video.current) {
        if (video.current.readyState >= 2) {
          const p = await predict(classifier, await embed(video.current));
          if (!alive) break;
          setGuess(p);
          run = p.label === id && p.confidence >= THRESHOLD ? run + 1 : 0;
          setStreak(run);
          if (run >= STREAK) {
            setPhase("found");
            sfx.reveal();
            if (id) unlockGolden(id);
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 350));
      }
    })();
    return () => {
      alive = false;
      classifier?.dispose();
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [id, unlockGolden]);

  const nameOf = (mid: string) => content?.monuments.find((x) => x.id === mid)?.name[lang] ?? mid;
  const message =
    phase === "loading"
      ? "Preparando reconocimiento…"
      : phase === "nomodel"
        ? "El reconocimiento aún no fue entrenado por el equipo."
        : !guess || guess.confidence < THRESHOLD || guess.label === OTHER
          ? "No reconozco este lugar todavía"
          : guess.label !== id
            ? `Parece ${nameOf(guess.label)}`
            : `¡Es ${nameOf(guess.label)}!`;

  return (
    <div className="phone scan">
      <button className="close-btn light" onClick={() => navigate("/")} aria-label={t.back}>
        {Icon.close()}
      </button>
      <h2>{t.scanTitle}</h2>
      <p className="scan-name">{m?.name[lang]}</p>

      <AnimatePresence mode="wait">
        {phase === "found" && m ? (
          <motion.div key="found" className="scan-found" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="reward">
              <Rays />
              <Burst count={18} radius={140} />
              <Figurita monumentId={m.id} name={m.name[lang]} year={m.year} color={m.color} golden unlocked reveal size="lg" rarityLabel={t.golden} />
            </div>
            <h2 className="serif">+15 XP</h2>
            <Button variant="gold" block onClick={() => navigate("/album")}>
              {t.viewAlbum}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="cam" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={`scan-frame ${streak ? "locking" : ""}`}>
              <video ref={video} autoPlay playsInline muted />
              <motion.span className="scan-line" animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
              {["tl", "tr", "bl", "br"].map((c) => (
                <motion.span key={c} className={`corner ${c}`} animate={{ scale: streak ? 0.9 : 1 }} />
              ))}
              <div className="scan-meter">
                {Array.from({ length: STREAK }).map((_, i) => (
                  <span key={i} className={i < streak ? "on" : ""} />
                ))}
              </div>
            </div>
            <div className="scan-status">
              <Mascot size={64} mood={streak ? "happy" : "idle"} pulse={streak} />
              <p>{error || message}</p>
            </div>
            <p className="scan-lead">{t.scanLead}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

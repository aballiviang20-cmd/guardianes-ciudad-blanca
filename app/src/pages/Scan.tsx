import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mascot } from "../components/Mascot";
import { Button, Icon } from "../components/ui";
import { useT } from "../i18n";
import { useMonument } from "../useContent";

/**
 * Escanear monumento (Nivel 2). La cámara funciona solo en HTTPS o localhost.
 * El reconocimiento (MobileNet + KNN en el dispositivo) se conecta cuando el equipo entrene el modelo
 * con sus fotos: hasta entonces esta pantalla NO desbloquea nada (no simulamos el reconocimiento).
 */
export function ScanPage() {
  const { id } = useParams();
  const m = useMonument(id);
  const { t, lang } = useT();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError("No se pudo abrir la cámara (¿HTTPS y permiso?)."));
    return () => stream?.getTracks().forEach((tr) => tr.stop());
  }, []);

  return (
    <div className="phone scan">
      <button className="close-btn light" onClick={() => navigate("/")} aria-label={t.back}>
        {Icon.close()}
      </button>
      <h2>{t.scanTitle}</h2>
      <p className="scan-name">{m?.name[lang]}</p>
      <div className="scan-frame">
        <video ref={video} autoPlay playsInline muted />
        <motion.span className="scan-line" animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
        {["tl", "tr", "bl", "br"].map((c) => (
          <span key={c} className={`corner ${c}`} />
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <p className="scan-lead">🔒 {t.scanLead}</p>
      <div className="scan-status">
        <Mascot size={70} />
        <p>Modelo de reconocimiento: pendiente de entrenamiento con las fotos del equipo.</p>
      </div>
      <Button variant="secondary" block onClick={() => navigate("/")}>
        {t.back}
      </Button>
    </div>
  );
}

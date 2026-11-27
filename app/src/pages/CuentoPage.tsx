import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Rays } from "../components/Burst";
import { CharPose } from "../components/Character";
import { ComicReader } from "../components/Comic";
import { useT } from "../i18n";
import { sfx } from "../sfx";
import { useStore } from "../store";
import { useContent } from "../useContent";
import { useCuentos } from "../useCuentos";

/** Cuento dentro de la app (clase invertida): primero se cuenta, luego se pregunta. */
export function CuentoPage() {
  const { id } = useParams();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const cuentos = useCuentos();
  const content = useContent();
  const completeCuento = useStore((s) => s.completeCuento);
  const cuento = id ? cuentos?.[id] : undefined;
  const m = content?.monuments.find((x) => x.id === id);
  if (!id || !cuento) return <div className="phone"><p className="empty">…</p></div>;
  return (
    <div className="phone comic-wrap">
      <ComicReader
        id={id}
        cuento={cuento}
        lang={lang}
        onClose={() => navigate("/")}
        finishLabel={m?.questions.length ? t.finish : t.continue}
        onFinish={() => {
          completeCuento(id);
          navigate(m?.questions.length ? `/reto/${id}` : "/");
        }}
      />
    </div>
  );
}

/**
 * Página web pública del cuento (sin cuenta): es a donde llevan los códigos QR de los carteles.
 * Si el visitante ya usa la app en este celular, escanear el QR en el lugar le da la figurita dorada.
 */
export function PublicCuentoPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, lang } = useT();
  const cuentos = useCuentos();
  const profile = useStore((s) => s.profile);
  const unlockGolden = useStore((s) => s.unlockGolden);
  const golden = useStore((s) => (id ? s.progress[id]?.golden : false));
  const [finished, setFinished] = useState(false);
  const fromQr = params.has("qr");

  useEffect(() => {
    if (fromQr && profile && id && !golden) {
      unlockGolden(id);
      sfx.reveal();
    }
  }, [fromQr, profile, id, golden, unlockGolden]);

  const cuento = id ? cuentos?.[id] : undefined;
  if (!id || !cuento) return <div className="phone"><p className="empty">…</p></div>;
  if (finished) {
    return (
      <div className="phone public-end">
        <div className="reward">
          <Rays />
          <CharPose c="orki" pose="salta" size={200} anim="jump" pulse={1} />
        </div>
        <h1 className="serif">{lang === "es" ? "¿Te gustó la historia?" : "Did you like the story?"}</h1>
        <p>{lang === "es" ? "Juega los retos, colecciona figuritas y cuida tu ciudad." : "Play the challenges, collect cards and care for your city."}</p>
        {fromQr && profile && <p className="xp-chip">{lang === "es" ? "¡Figurita dorada desbloqueada!" : "Golden card unlocked!"}</p>}
        <Link className="btn btn-primary btn-block" to="/">
          {profile ? t.continue : t.start}
        </Link>
      </div>
    );
  }
  return (
    <div className="phone comic-wrap">
      <motion.div className="public-brand" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {t.appName}
      </motion.div>
      <ComicReader id={id} cuento={cuento} lang={lang} onClose={() => setFinished(true)} finishLabel={t.continue} onFinish={() => setFinished(true)} />
    </div>
  );
}

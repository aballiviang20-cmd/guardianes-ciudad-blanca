import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CharPose } from "../components/Character";
import { MonumentIcon } from "../components/MonumentIcon";
import { Scene } from "../components/Scene";
import type { MonumentContent } from "../types";
import { useContent } from "../useContent";

/**
 * Carteles imprimibles con código QR. Cada QR abre la página web del cuento (/historia/:id?qr=1).
 * Pensados para el aula o para paneles informativos autorizados (nunca pegados sobre fachadas patrimoniales).
 */
function Poster({ m, base }: { m: MonumentContent; base: string }) {
  const [qr, setQr] = useState("");
  const url = `${base}/historia/${m.id}?qr=1`;
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#2b2622", light: "#ffffff" } }).then(setQr);
  }, [url]);
  return (
    <article className="poster" style={{ ["--accent" as string]: m.color }}>
      <div className="poster-art">
        <Scene id={m.id} animated={false} />
        <span className="poster-year serif">{m.year}</span>
      </div>
      <div className="poster-body">
        <h2 className="serif">
          <MonumentIcon id={m.id} size={28} /> {m.name.es}
        </h2>
        <p>Escanea y descubre su historia en cómic. Si juegas Guardianes, ¡ganas la figurita dorada!</p>
        <div className="poster-qr">
          {qr && <img src={qr} alt={`QR ${m.name.es}`} />}
          <CharPose c="orki" pose="mueve" size={120} anim="none" />
        </div>
        <small>{url}</small>
      </div>
    </article>
  );
}

export function PostersPage() {
  const content = useContent();
  const [base, setBase] = useState(window.location.origin);
  return (
    <div className="evidence-page posters-page">
      <header className="no-print">
        <h1>Carteles con QR</h1>
        <p>Imprime y coloca en el aula o en paneles autorizados. El QR abre el cuento en cualquier celular.</p>
        <label className="base-url">
          Dirección pública (túnel HTTPS o despliegue)
          <input value={base} onChange={(e) => setBase(e.target.value.replace(/\/$/, ""))} />
        </label>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={() => window.print()}>
            Imprimir
          </button>
          <Link to="/docente">Panel docente</Link>
        </div>
      </header>
      <div className="posters">
        {(content?.monuments ?? []).map((m) => (
          <Poster key={m.id} m={m} base={base} />
        ))}
      </div>
    </div>
  );
}

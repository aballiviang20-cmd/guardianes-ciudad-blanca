/**
 * Chequeo de cita (capa 1 de verificación, SIN IA).
 * La IA debe copiar literalmente una frase del fragmento que respalda su respuesta.
 * Este código comprueba que esa frase exista de verdad en el fragmento citado.
 */

const MIN_QUOTE_CHARS = 15;

/** Normaliza para comparar: minúsculas, sin tildes, comillas unificadas, sin marcas [A], espacios colapsados. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\[[a-z]\]/g, " ")
    .replace(/[“”«»„"]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type QuoteCheck =
  | { ok: true }
  | { ok: false; reason: "cita_vacia" | "cita_muy_corta" | "fragmento_inexistente" | "cita_inexistente" };

export function checkQuote(quote: string | undefined | null, fragmentText: string | undefined | null): QuoteCheck {
  if (!quote || !quote.trim()) return { ok: false, reason: "cita_vacia" };
  if (!fragmentText) return { ok: false, reason: "fragmento_inexistente" };
  // Se toleran puntos o comas finales que el modelo agregue o quite.
  const q = normalize(quote).replace(/[.,;:]+$/, "");
  if (q.length < MIN_QUOTE_CHARS) return { ok: false, reason: "cita_muy_corta" };
  return normalize(fragmentText).includes(q) ? { ok: true } : { ok: false, reason: "cita_inexistente" };
}

/**
 * Siembra contenido ESCRITO A MANO (mode = "manual") para probar la app sin API key.
 * Es la línea base "sin IA" y es contenido de prueba: reemplazarlo con las fichas verificadas del equipo.
 * Cada ítem cita literalmente una frase de data/fichas/casa-libertad.md.
 */
import { randomUUID } from "node:crypto";
import { db, now } from "./db";
import { loadFichas } from "./fichas";
import { checkQuote } from "./verify";

type Seed = { monumentId: string; kind: "question" | "story"; payload: Record<string, unknown>; quote: string };

const SEED: Seed[] = [
  {
    monumentId: "casa-libertad",
    kind: "story",
    payload: {
      title_es: "Un salón que cambió la historia",
      title_en: "A hall that changed history",
      text_es: "¿Sabías que Bolivia nació en un edificio frente a la Plaza 25 de Mayo? Ahí se firmó el Acta de la Independencia el 6 de agosto de 1825.",
      text_en: "Did you know Bolivia was born in a building facing Plaza 25 de Mayo? The Declaration of Independence was signed there on August 6, 1825.",
    },
    quote: "En este edificio se firmó el Acta de la Independencia de Bolivia el 6 de agosto de 1825.",
  },
  {
    monumentId: "casa-libertad",
    kind: "story",
    payload: {
      title_es: "Antes de 1825 hubo un grito",
      title_en: "Before 1825 there was a cry",
      text_es: "Dieciséis años antes, el 25 de mayo de 1809, Chuquisaca se levantó en lo que en Bolivia se conoce como el Primer Grito Libertario.",
      text_en: "Sixteen years earlier, on May 25, 1809, Chuquisaca rose up in what Bolivia calls the First Cry for Freedom.",
    },
    quote: "El 25 de mayo de 1809 ocurrió en Chuquisaca el levantamiento conocido en Bolivia como el Primer Grito Libertario.",
  },
  {
    monumentId: "casa-libertad",
    kind: "story",
    payload: {
      title_es: "Patrimonio del mundo",
      title_en: "World heritage",
      text_es: "Tu ciudad no es cualquier ciudad: en 1991 la UNESCO declaró a Sucre Patrimonio Cultural de la Humanidad.",
      text_en: "Your city is not just any city: in 1991 UNESCO declared Sucre a World Cultural Heritage site.",
    },
    quote: "fue declarada Patrimonio Cultural de la Humanidad por la UNESCO en 1991",
  },
  {
    monumentId: "casa-libertad",
    kind: "question",
    payload: {
      type: "mcq",
      prompt_es: "¿Qué documento se firmó en la Casa de la Libertad?",
      prompt_en: "Which document was signed at the House of Freedom?",
      options_es: ["El Acta de la Independencia de Bolivia", "La primera Constitución de Perú", "El tratado de paz con Chile", "La fundación de La Plata"],
      options_en: ["Bolivia's Declaration of Independence", "Peru's first Constitution", "The peace treaty with Chile", "The founding of La Plata"],
      answer: 0,
      explanation_es: "En la Casa de la Libertad se firmó el Acta de la Independencia de Bolivia, el 6 de agosto de 1825.",
      explanation_en: "Bolivia's Declaration of Independence was signed at the House of Freedom on August 6, 1825.",
      juvenil_es: "Aquí literalmente nació Bolivia: en este edificio se firmó el Acta de la Independencia en 1825.",
    },
    quote: "En este edificio se firmó el Acta de la Independencia de Bolivia el 6 de agosto de 1825.",
  },
  {
    monumentId: "casa-libertad",
    kind: "question",
    payload: {
      type: "tf",
      prompt_es: "Sucre fue declarada Patrimonio Cultural de la Humanidad por la UNESCO en 1991.",
      prompt_en: "Sucre was declared a World Cultural Heritage site by UNESCO in 1991.",
      options_es: ["Verdadero", "Falso"],
      options_en: ["True", "False"],
      answer: 0,
      explanation_es: "Es verdadero: la UNESCO declaró a Sucre Patrimonio Cultural de la Humanidad en 1991.",
      explanation_en: "True: UNESCO declared Sucre a World Cultural Heritage site in 1991.",
      juvenil_es: "¡Correcto! Desde 1991 tu ciudad está en la lista mundial de lugares que hay que cuidar.",
    },
    quote: "fue declarada Patrimonio Cultural de la Humanidad por la UNESCO en 1991",
  },
  {
    monumentId: "casa-libertad",
    kind: "question",
    payload: {
      type: "order",
      prompt_es: "Ordena estos hechos del más antiguo al más reciente.",
      prompt_en: "Put these events in order, from oldest to most recent.",
      options_es: ["Primer Grito Libertario en Chuquisaca (1809)", "Firma del Acta de la Independencia (1825)", "Sucre, Patrimonio de la Humanidad (1991)"],
      options_en: ["First Cry for Freedom in Chuquisaca (1809)", "Signing of the Declaration of Independence (1825)", "Sucre, World Heritage Site (1991)"],
      answer: -1,
      explanation_es: "Primero el levantamiento de 1809, luego el Acta de 1825 y, mucho después, la declaratoria de la UNESCO en 1991.",
      explanation_en: "First the 1809 uprising, then the 1825 Declaration and, much later, UNESCO's 1991 declaration.",
      juvenil_es: "1809 el grito, 1825 el país, 1991 el mundo reconoce a tu ciudad. ¡En ese orden!",
    },
    quote: "El 25 de mayo de 1809 ocurrió en Chuquisaca el levantamiento conocido en Bolivia como el Primer Grito Libertario.",
  },
  {
    monumentId: "casa-libertad",
    kind: "question",
    payload: {
      type: "mcq",
      prompt_es: "¿Frente a qué plaza está la Casa de la Libertad?",
      prompt_en: "Which square does the House of Freedom face?",
      options_es: ["Plaza 25 de Mayo", "Plaza Murillo", "Plaza Libertad", "Plaza de la Recoleta"],
      options_en: ["Plaza 25 de Mayo", "Plaza Murillo", "Plaza Libertad", "Plaza de la Recoleta"],
      answer: 0,
      explanation_es: "La Casa de la Libertad está frente a la Plaza 25 de Mayo, en el centro histórico de Sucre.",
      explanation_en: "The House of Freedom faces Plaza 25 de Mayo, in Sucre's historic center.",
      juvenil_es: "Si alguna vez esperaste a alguien en la Plaza 25 de Mayo, la tenías al frente.",
    },
    quote: "La Casa de la Libertad se encuentra frente a la Plaza 25 de Mayo, en el centro histórico de Sucre.",
  },
];

const { fichas } = loadFichas();
db.exec("DELETE FROM items WHERE mode = 'manual'");
const batchId = `seed-${Date.now()}`;
const insert = db.prepare(`INSERT INTO items
  (id, batch_id, monument_id, kind, mode, payload, evidence_quote, fragment_id, status, reviewer, prompt_version, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, 'approved', 'seed-equipo', 'manual', ?, ?)`);

let ok = 0;
for (const s of SEED) {
  const fragment = fichas.get(s.monumentId)?.fragments.find((f) => checkQuote(s.quote, f.text).ok);
  if (!fragment) {
    console.warn(`⚠ Cita no encontrada en la ficha, se omite: "${s.quote.slice(0, 50)}..."`);
    continue;
  }
  insert.run(randomUUID(), batchId, s.monumentId, s.kind, JSON.stringify(s.payload), s.quote, fragment.id, now(), now());
  ok++;
}
console.log(`Semilla: ${ok}/${SEED.length} ítems aprobados (contenido de prueba escrito a mano).`);

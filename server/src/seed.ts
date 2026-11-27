/**
 * Carga el contenido base de data/seed.json (mode = "manual").
 * Por defecto entra como "pending": un docente del equipo lo revisa y aprueba en el panel.
 * Con --approve entra aprobado (solo para pruebas locales).
 * Cada ítem debe citar literalmente una frase de su ficha; si la cita no existe, no se carga.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, now } from "./db";
import { loadFichas } from "./fichas";
import { DATA_DIR } from "./paths";
import { checkQuote } from "./verify";

type Seed = { monumentId: string; kind: "question" | "story"; payload: Record<string, unknown>; quote: string };

const approve = process.argv.includes("--approve");
const seeds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "seed.json"), "utf8")) as Seed[];
const { fichas } = loadFichas();

db.exec("DELETE FROM items WHERE mode = 'manual'");
const batchId = `seed-${Date.now()}`;
const insert = db.prepare(`INSERT INTO items
  (id, batch_id, monument_id, kind, mode, payload, evidence_quote, fragment_id, status, reviewer, prompt_version, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, 'manual', ?, ?)`);

let ok = 0;
for (const s of seeds) {
  const fragment = fichas.get(s.monumentId)?.fragments.find((f) => checkQuote(s.quote, f.text).ok);
  if (!fragment) {
    console.warn(`⚠ [${s.monumentId}] cita no encontrada en la ficha, se omite: "${s.quote.slice(0, 60)}..."`);
    continue;
  }
  insert.run(randomUUID(), batchId, s.monumentId, s.kind, JSON.stringify(s.payload), s.quote, fragment.id,
    approve ? "approved" : "pending", approve ? "prueba-local" : null, now(), now());
  ok++;
}
console.log(`Contenido base: ${ok}/${seeds.length} ítems cargados como ${approve ? "APROBADOS (prueba local)" : "PENDIENTES de revisión docente"}.`);

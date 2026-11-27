import fs from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";
import { DATA_DIR, FICHAS_DIR } from "./paths";

export type Monument = { id: string; order: number; name: { es: string; en: string }; color: string };
export type Fragment = { id: string; monumentId: string; text: string };
export type Ficha = { monumentId: string; title: string; sources: string[]; fragments: Fragment[]; draft: boolean };

export function loadMonuments(): Monument[] {
  const list = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "monuments.json"), "utf8")) as Monument[];
  return list.sort((a, b) => a.order - b.order);
}

const SENTENCES_PER_FRAGMENT = 2;

/**
 * Formato de ficha (.md):
 *   # Título
 *   ## Fuentes   -> líneas "- [A] ..."
 *   ## Texto     -> prosa; cada oración idealmente termina con [A] o [A][B]
 * El texto se divide en fragmentos de 2 oraciones con id "{monumento}#{n}".
 */
export function parseFicha(monumentId: string, markdown: string): Ficha {
  const lines = markdown.split(/\r?\n/);
  const title = (lines.find((l) => l.startsWith("# ")) ?? monumentId).replace(/^#\s*/, "").trim();
  const sources: string[] = [];
  const body: string[] = [];
  let section = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      section = line.slice(3).toLowerCase();
      continue;
    }
    if (!line || line.startsWith("# ")) continue;
    if (section.startsWith("fuente")) {
      if (line.startsWith("-")) sources.push(line.replace(/^-\s*/, ""));
    } else if (section.startsWith("texto")) {
      body.push(line);
    }
  }
  const sentences = body
    .join(" ")
    .split(/(?<=[.!?](?:\s*\[[A-Z]\])*)\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const fragments: Fragment[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_FRAGMENT) {
    fragments.push({
      id: `${monumentId}#${fragments.length + 1}`,
      monumentId,
      text: sentences.slice(i, i + SENTENCES_PER_FRAGMENT).join(" "),
    });
  }
  return { monumentId, title, sources, fragments, draft: /BORRADOR/i.test(markdown) };
}

let cache: { fichas: Map<string, Ficha>; index: MiniSearch<Fragment> } | null = null;

/** Carga (y recarga) todas las fichas y arma el índice BM25. */
export function loadFichas() {
  const fichas = new Map<string, Ficha>();
  if (fs.existsSync(FICHAS_DIR)) {
    for (const file of fs.readdirSync(FICHAS_DIR).filter((f) => f.endsWith(".md"))) {
      const id = file.replace(/\.md$/, "");
      fichas.set(id, parseFicha(id, fs.readFileSync(path.join(FICHAS_DIR, file), "utf8")));
    }
  }
  const index = new MiniSearch<Fragment>({
    fields: ["text"],
    storeFields: ["id", "monumentId", "text"],
    searchOptions: { fuzzy: 0.2, prefix: true },
  });
  index.addAll([...fichas.values()].flatMap((f) => f.fragments));
  cache = { fichas, index };
  return cache;
}

export function getFichas() {
  return cache ?? loadFichas();
}

export function findFragment(fragmentId: string): Fragment | undefined {
  const monumentId = fragmentId.split("#")[0];
  return getFichas().fichas.get(monumentId)?.fragments.find((f) => f.id === fragmentId);
}

/**
 * Recupera los k fragmentos más relevantes de un monumento con BM25 (MiniSearch).
 * Si el tema no encuentra suficientes, completa con los primeros fragmentos de la ficha.
 */
export function retrieve(monumentId: string, topic: string | undefined, k = 4): (Fragment & { score: number })[] {
  const { fichas, index } = getFichas();
  const ficha = fichas.get(monumentId);
  if (!ficha) return [];
  const query = topic?.trim() || ficha.title;
  const hits = index
    .search(query, { filter: (r) => r.monumentId === monumentId })
    .map((r) => ({ id: r.id as string, monumentId, text: r.text as string, score: Number(r.score.toFixed(2)) }));
  const chosen = hits.slice(0, k);
  for (const f of ficha.fragments) {
    if (chosen.length >= k) break;
    if (!chosen.some((c) => c.id === f.id)) chosen.push({ ...f, score: 0 });
  }
  return chosen;
}

/** Resumen de lo que "sabe" la IA de cada lugar (para el panel docente). */
export function fichasSummary() {
  const { fichas } = getFichas();
  return loadMonuments().map((m) => {
    const f = fichas.get(m.id);
    return { id: m.id, name: m.name.es, color: m.color, sources: f?.sources ?? [], fragments: f?.fragments.length ?? 0, draft: f?.draft ?? false };
  });
}

/**
 * Agrega información subida por el docente a la ficha de un lugar: se registra como una fuente nueva
 * ([D], [E]...) y cada oración queda marcada con esa letra para que la IA la cite y el docente la rastree.
 */
export function addSource(monumentId: string, sourceTitle: string, rawText: string) {
  const monument = loadMonuments().find((m) => m.id === monumentId);
  if (!monument) throw new Error("Lugar desconocido");
  const title = sourceTitle.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  if (title.length < 3) throw new Error("Escriba de dónde sale la información (libro, página, sitio web...)");
  const text = rawText
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*#+\s*/, "").replace(/^\s*[-*•]\s+/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
  const sentences = text
    .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9«"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25)
    .slice(0, 300);
  if (sentences.length === 0) throw new Error("El texto es muy corto: pegue al menos una oración completa");

  const file = path.join(FICHAS_DIR, `${monumentId}.md`);
  const md = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : `# ${monument.name.es}\nid: ${monumentId}\n\n## Fuentes\n\n## Texto\n`;
  const used = new Set([...md.matchAll(/^- \[([A-Z])\]/gm)].map((m) => m[1]));
  const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !used.has(l));
  if (!letter) throw new Error("Este lugar ya tiene demasiadas fuentes");

  const lines = md.split(/\r?\n/);
  let fIdx = lines.findIndex((l) => /^##\s+Fuentes/i.test(l));
  if (fIdx < 0) {
    lines.push("", "## Fuentes");
    fIdx = lines.length - 1;
  }
  // inserta la fuente después de la última línea "- [X]" de la sección Fuentes
  let insertAt = fIdx + 1;
  for (let i = fIdx + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) if (/^- \[/.test(lines[i])) insertAt = i + 1;
  const date = new Date().toISOString().slice(0, 10);
  lines.splice(insertAt, 0, `- [${letter}] ${title} (subida por docente, ${date}).`);
  let tIdx = lines.findIndex((l) => /^##\s+Texto/i.test(l));
  if (tIdx < 0) {
    lines.push("", "## Texto");
    tIdx = lines.length - 1;
  }
  let end = lines.length;
  for (let i = tIdx + 1; i < lines.length; i++)
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  while (end > tIdx + 1 && lines[end - 1].trim() === "") end--;
  lines.splice(end, 0, ...sentences.map((s) => `${s} [${letter}]`));
  fs.mkdirSync(FICHAS_DIR, { recursive: true });
  fs.writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"));
  loadFichas();
  return { letter, sentences: sentences.length, fragments: getFichas().fichas.get(monumentId)?.fragments.length ?? 0 };
}

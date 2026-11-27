import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fichas-"));
process.env.FICHAS_DIR = tmp;

describe("addSource: información subida por el docente", () => {
  let mod: typeof import("../src/fichas");
  beforeAll(async () => {
    fs.copyFileSync(path.join(__dirname, "..", "..", "data", "fichas", "catedral.md"), path.join(tmp, "catedral.md"));
    mod = await import("../src/fichas");
  });

  it("agrega una fuente nueva con letra libre y marca cada oración", () => {
    const before = mod.loadFichas().fichas.get("catedral")!;
    const r = mod.addSource(
      "catedral",
      "Guía municipal de Sucre, pág. 12",
      "# Datos\nLa torre de la Catedral tiene un reloj visible desde la plaza. Los visitantes pueden subir al mirador en horario de museo.",
    );
    expect(r.letter).toBe("C");
    expect(r.sentences).toBe(2);
    const after = mod.getFichas().fichas.get("catedral")!;
    expect(after.sources.some((s) => s.startsWith("[C] Guía municipal de Sucre"))).toBe(true);
    expect(after.fragments.length).toBeGreaterThan(before.fragments.length);
    const md = fs.readFileSync(path.join(tmp, "catedral.md"), "utf8");
    expect(md).toContain("visible desde la plaza. [C]");
    expect(md).not.toContain("# Datos");
  });

  it("rechaza textos vacíos y lugares desconocidos", () => {
    expect(() => mod.addSource("catedral", "Libro", "corto")).toThrow();
    expect(() => mod.addSource("no-existe", "Libro", "Una oración suficientemente larga para pasar el filtro.")).toThrow();
  });
});

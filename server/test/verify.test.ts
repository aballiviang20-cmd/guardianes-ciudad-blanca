import { describe, expect, it } from "vitest";
import { checkQuote, normalize } from "../src/verify";
import { redactPII } from "../src/pii";
import { parseFicha } from "../src/fichas";
import { xpForEvent } from "../src/league";

const FRAGMENT =
  "La Casa de la Libertad se encuentra frente a la Plaza 25 de Mayo, en el centro histórico de Sucre. [A] En este edificio se firmó el Acta de la Independencia de Bolivia el 6 de agosto de 1825. [A][B]";

describe("chequeo de cita (capa 1, sin IA)", () => {
  it("acepta una cita literal", () => {
    expect(checkQuote("En este edificio se firmó el Acta de la Independencia de Bolivia", FRAGMENT)).toEqual({ ok: true });
  });
  it("tolera tildes, mayúsculas, espacios y punto final distintos", () => {
    expect(checkQuote("en este  EDIFICIO se firmo el acta de la independencia de bolivia.", FRAGMENT).ok).toBe(true);
  });
  it("ignora las marcas de fuente [A][B]", () => {
    expect(checkQuote("6 de agosto de 1825. En este", "el 6 de agosto de 1825. [A][B] En este").ok).toBe(true);
  });
  it("rechaza una cita inventada", () => {
    expect(checkQuote("En este edificio se firmó la Constitución de 1826", FRAGMENT)).toEqual({ ok: false, reason: "cita_inexistente" });
  });
  it("rechaza citas demasiado cortas o vacías", () => {
    expect(checkQuote("Sucre", FRAGMENT)).toEqual({ ok: false, reason: "cita_muy_corta" });
    expect(checkQuote("", FRAGMENT)).toEqual({ ok: false, reason: "cita_vacia" });
  });
  it("rechaza si el fragmento no existe", () => {
    expect(checkQuote("En este edificio se firmó el Acta", undefined)).toEqual({ ok: false, reason: "fragmento_inexistente" });
  });
  it("normaliza comillas tipográficas", () => {
    expect(normalize("“Hola”")).toBe('"hola"');
  });
});

describe("filtro de datos personales", () => {
  it("quita correos, teléfonos y documentos", () => {
    const out = redactPII("Soy ana@mail.com, mi cel 71234567 y CI 1234567 CH");
    expect(out).not.toMatch(/ana@mail\.com|71234567|1234567/);
    expect(out).toContain("[correo]");
  });
});

describe("fichas", () => {
  it("divide la ficha en fragmentos con id y lee las fuentes", () => {
    const f = parseFicha("x", "# X\n## Fuentes\n- [A] Libro\n## Texto\nUno. [A]\nDos. [A]\nTres. [B]");
    expect(f.sources).toEqual(["[A] Libro"]);
    expect(f.fragments.map((x) => x.id)).toEqual(["x#1", "x#2"]);
  });
});

describe("XP calculado en el servidor", () => {
  it("no confía en valores exagerados del cliente", () => {
    expect(xpForEvent("lesson_completed", { correct: 999 })).toBe(30);
    expect(xpForEvent("desconocido", {})).toBe(0);
  });
});

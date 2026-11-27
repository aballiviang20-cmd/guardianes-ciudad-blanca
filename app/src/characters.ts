/** Personajes del equipo: todos dibujados en el mismo estilo vectorial 2D y recortados de sus hojas de personaje. */
export type CharId = "orki" | "mateo" | "wara" | "sofia" | "kusi" | "julian" | "juanita" | "bruno";
export type Face = "alegre" | "sorprendido" | "enojado" | "triste" | "pensativo" | "chistoso";
export type Pose = "frente" | "mueve" | "sucre" | "bolivia" | "salta";
export type Outfit = "casual" | "tarabuco" | "cueca" | "bolivar";

export type Character = {
  id: CharId;
  name: string;
  tagline: { es: string; en: string };
  color: string;
  outfits: Outfit[];
};

export const CHARACTERS: Record<CharId, Character> = {
  orki: { id: "orki", name: "Orki", tagline: { es: "Dinosaurio de Cal Orck'o", en: "Cal Orck'o dinosaur" }, color: "#4CAF6E", outfits: ["casual", "tarabuco", "cueca", "bolivar"] },
  mateo: { id: "mateo", name: "Mateo", tagline: { es: "Skater y curioso", en: "Curious skater" }, color: "#2D6CA8", outfits: ["casual", "tarabuco", "cueca"] },
  wara: { id: "wara", name: "Wara", tagline: { es: "Nada la sorprende… casi", en: "Hard to impress… almost" }, color: "#6B3FA0", outfits: ["casual", "tarabuco", "cueca"] },
  sofia: { id: "sofia", name: "Sofía", tagline: { es: "Carisma y estilo propio", en: "Charisma and her own style" }, color: "#C0532D", outfits: ["casual", "tarabuco", "cueca"] },
  kusi: { id: "kusi", name: "Kusi", tagline: { es: "Llama con aguayo, pura alegría", en: "Llama with an aguayo, pure joy" }, color: "#B0479A", outfits: ["casual", "tarabuco", "cueca"] },
  julian: { id: "julian", name: "Tata Julián", tagline: { es: "El abuelo cuentacuentos", en: "The storytelling grandpa" }, color: "#8A5A2B", outfits: ["casual", "tarabuco", "cueca"] },
  juanita: { id: "juanita", name: "Juanita", tagline: { es: "Cholita chuquisaqueña con orgullo", en: "Proud Chuquisaca cholita" }, color: "#C2185B", outfits: ["casual", "tarabuco", "cueca"] },
  bruno: { id: "bruno", name: "Bruno", tagline: { es: "Deportista y entrenador del barrio", en: "Athlete and neighborhood coach" }, color: "#1E8A4C", outfits: ["casual", "tarabuco", "cueca"] },
};

export const OUTFITS: Record<Outfit, { es: string; en: string; xp: number }> = {
  casual: { es: "Casual", en: "Casual", xp: 0 },
  tarabuco: { es: "Tarabuqueño", en: "Tarabuco", xp: 30 },
  cueca: { es: "Cueca chuquisaqueña", en: "Chuquisaca cueca", xp: 60 },
  bolivar: { es: "Libertador", en: "Liberator", xp: 100 },
};

const img = (name: string) => `/personajes/${name}.webp`;

/** Si un perfil guardado trae un personaje que ya no existe (p. ej. "vale"), se usa uno válido. */
export function safeChar(c: string | undefined): CharId {
  if (c && c in CHARACTERS) return c as CharId;
  return c === "vale" ? "sofia" : "mateo";
}

export function faceImg(c: CharId, f: Face) {
  return img(`${safeChar(c)}-cara-${f}`);
}

export function poseImg(c: CharId, p: Pose) {
  const id = safeChar(c);
  if (id === "orki" && p === "mueve") return img("orki-explora");
  return img(`${id}-${p}`);
}

export function outfitImg(c: CharId, o: Outfit) {
  const id = safeChar(c);
  if (o === "bolivar" && id !== "orki") return img(`${id}-casual`);
  return img(`${id}-${o}`);
}

/** Precarga para que las expresiones cambien sin parpadeo. */
export function preloadCharacters() {
  const all: string[] = [];
  (Object.keys(CHARACTERS) as CharId[]).forEach((c) => {
    (["alegre", "sorprendido", "enojado", "triste", "pensativo", "chistoso"] as Face[]).forEach((f) => all.push(faceImg(c, f)));
    (["frente", "mueve", "sucre", "bolivia", "salta"] as Pose[]).forEach((p) => all.push(poseImg(c, p)));
  });
  all.forEach((src) => {
    const i = new Image();
    i.src = src;
  });
}

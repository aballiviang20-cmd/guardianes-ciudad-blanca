/** Personajes del equipo (ilustraciones propias recortadas de sus hojas de personaje). */
export type CharId = "orki" | "mateo" | "wara" | "vale";
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
  vale: { id: "vale", name: "Vale", tagline: { es: "Siempre a la moda", en: "Always in style" }, color: "#C0532D", outfits: ["casual", "tarabuco", "cueca"] },
};

export const OUTFITS: Record<Outfit, { es: string; en: string; xp: number }> = {
  casual: { es: "Casual", en: "Casual", xp: 0 },
  tarabuco: { es: "Tarabuqueño", en: "Tarabuco", xp: 30 },
  cueca: { es: "Cueca chuquisaqueña", en: "Chuquisaca cueca", xp: 60 },
  bolivar: { es: "Libertador", en: "Liberator", xp: 100 },
};

const img = (name: string) => `/personajes/${name}.webp`;

export function faceImg(c: CharId, f: Face) {
  const face = c === "orki" && f === "chistoso" ? "guino" : f;
  return img(`${c}-cara-${face}`);
}

export function poseImg(c: CharId, p: Pose) {
  if (c === "orki") return img(p === "frente" ? "orki-explora" : p === "mueve" ? "orki-explora" : `orki-${p}`);
  return img(`${c}-${p}`);
}

export function outfitImg(c: CharId, o: Outfit) {
  if (c === "orki") return img(o === "casual" ? "orki-explora" : `orki-${o}`);
  if (o === "bolivar") return img(`${c}-casual`);
  return img(`${c}-${o}`);
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

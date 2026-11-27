export type Lang = "es" | "en";

export type Question = {
  id: string;
  type: "mcq" | "tf" | "order";
  prompt_es: string;
  prompt_en: string;
  options_es: string[];
  options_en: string[];
  answer: number;
  explanation_es: string;
  explanation_en: string;
  juvenil_es: string;
  fragmentId?: string | null;
  cite?: string;
  difficulty?: Difficulty;
};

export type Difficulty = "facil" | "medio" | "dificil";

export type Story = {
  id: string;
  title_es: string;
  title_en: string;
  text_es: string;
  text_en: string;
  fragmentId?: string | null;
  cite?: string;
};

export type MonumentContent = {
  id: string;
  order: number;
  year?: number;
  tagline?: { es: string; en: string };
  name: { es: string; en: string };
  color: string;
  sources: string[];
  stories: Story[];
  questions: Question[];
};

export type LessonsResponse = { updatedAt: string; monuments: MonumentContent[] };

export type LeagueCourse = { course: string; xp: number; members: number; lessons: number; reports: number; golden: number };

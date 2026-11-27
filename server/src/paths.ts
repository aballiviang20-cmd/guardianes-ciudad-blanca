import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del monorepo (server/src -> ../..). */
export const ROOT_DIR = path.resolve(here, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const FICHAS_DIR = path.join(DATA_DIR, "fichas");
export const EVAL_DIR = path.join(ROOT_DIR, "eval");
export const APP_DIST = path.join(ROOT_DIR, "app", "dist");

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { DATA_DIR } from "./paths";

/**
 * Cuentas de demostración (data/usuarios.json): contraseñas guardadas con scrypt + sal, nunca en texto plano.
 * El token es un HMAC firmado por el servidor con vencimiento; no se guarda estado de sesión.
 */
export type Role = "docente" | "alumno";
export type User = {
  username: string;
  name: string;
  role: Role;
  subject?: string;
  courses?: string[];
  course?: string;
  level?: "4to" | "6to";
  salt: string;
  hash: string;
};
export type PublicUser = Omit<User, "salt" | "hash">;

const USERS_FILE = process.env.USERS_FILE || path.join(DATA_DIR, "usuarios.json");
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex");
const TTL_MS = 12 * 60 * 60 * 1000;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 32).toString("hex") };
}

function loadUsers(): User[] {
  const base = fs.existsSync(USERS_FILE) ? (JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as { users: User[] }).users : [];
  const created = db.prepare("SELECT username, name, course, level, salt, hash FROM students").all() as { username: string; name: string; course: string; level: string | null; salt: string; hash: string }[];
  return [...base, ...created.map((s) => ({ ...s, role: "alumno" as const, level: (s.level === "4to" || s.level === "6to" ? s.level : undefined) as User["level"] }))];
}

/** Crea una cuenta de alumno. Usuario: 3-24 letras/números/punto; contraseña de al menos 6 caracteres. */
export function register(input: { username: string; password: string; name: string; course: string; level?: string }) {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,24}$/.test(username)) throw new Error("El usuario debe tener de 3 a 24 letras, números o puntos (sin espacios)");
  if (input.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
  const name = input.name.trim().slice(0, 16);
  if (name.length < 2) throw new Error("Escribe tu apodo");
  const course = input.course.trim().toUpperCase().slice(0, 12);
  if (course.length < 2) throw new Error("Escribe el código de tu curso");
  if (loadUsers().some((u) => u.username.toLowerCase() === username)) throw new Error("Ese usuario ya existe, elige otro");
  const level = input.level === "4to" || input.level === "6to" ? input.level : null;
  const { salt, hash } = hashPassword(input.password);
  db.prepare("INSERT INTO students (username, name, course, level, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(username, name, course, level, salt, hash, new Date().toISOString());
  return login(username, input.password)!;
}

export function publicUser(u: User): PublicUser {
  const { salt: _s, hash: _h, ...rest } = u;
  return rest;
}

export function login(username: string, password: string): { token: string; user: PublicUser } | null {
  const u = loadUsers().find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u) {
    hashPassword(password); // mismo costo aunque el usuario no exista
    return null;
  }
  const got = Buffer.from(hashPassword(password, u.salt).hash, "hex");
  const want = Buffer.from(u.hash, "hex");
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  const exp = Date.now() + TTL_MS;
  const body = `${u.username}|${u.role}|${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return { token: `${Buffer.from(body).toString("base64url")}.${sig}`, user: publicUser(u) };
}

/** Devuelve el usuario si el token es válido y no venció. */
export function verifyToken(token: string | undefined): PublicUser | null {
  if (!token || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  const [username, , expStr] = body.split("|");
  if (Number(expStr) < Date.now()) return null;
  const u = loadUsers().find((x) => x.username === username);
  return u ? publicUser(u) : null;
}

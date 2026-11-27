import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR } from "./paths";

const dbDir = path.join(DATA_DIR, "db");
fs.mkdirSync(dbDir, { recursive: true });

/** SQLite nativo de Node (sin dependencias compiladas). */
export const db = new DatabaseSync(path.join(dbDir, "app.db"));

db.exec(`
  PRAGMA journal_mode = WAL;

  -- Contenido generado (preguntas e historias) con su trazabilidad.
  CREATE TABLE IF NOT EXISTS items (
    id             TEXT PRIMARY KEY,
    batch_id       TEXT NOT NULL,
    monument_id    TEXT NOT NULL,
    kind           TEXT NOT NULL CHECK (kind IN ('question', 'story')),
    mode           TEXT NOT NULL DEFAULT 'rag',      -- rag | norag | manual
    payload        TEXT NOT NULL,                    -- JSON del ítem
    evidence_quote TEXT,
    fragment_id    TEXT,
    status         TEXT NOT NULL,                    -- draft | verified | pending | approved | rejected
    reason         TEXT,                             -- cita_inexistente | juez | docente
    judge_reason   TEXT,
    model          TEXT,
    prompt_version TEXT,
    usage          TEXT,                             -- JSON {input_tokens, output_tokens}
    latency_ms     INTEGER,
    reviewer       TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_items_status ON items(status, monument_id);
  CREATE INDEX IF NOT EXISTS idx_items_batch ON items(batch_id);

  -- Eventos del alumno: idempotentes por event_id (la cola offline puede reenviar).
  CREATE TABLE IF NOT EXISTS events (
    event_id   TEXT PRIMARY KEY,
    alias      TEXT NOT NULL,
    course     TEXT NOT NULL,
    type       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    ts         TEXT NOT NULL,
    received_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_course ON events(course);

  -- Reportes de la Misión guardián y errores de contenido.
  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    course      TEXT NOT NULL,
    monument_id TEXT,
    item_id     TEXT,
    kind        TEXT NOT NULL,   -- dano | error_contenido
    damage_type TEXT,
    text        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'nuevo',
    created_at  TEXT NOT NULL
  );
`);

export const now = () => new Date().toISOString();

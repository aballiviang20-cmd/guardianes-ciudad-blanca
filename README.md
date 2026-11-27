# Guardianes de la Ciudad Blanca

**Conoce. Colecciona. Protege.** App educativa gamificada sobre el patrimonio de Sucre para estudiantes de secundaria (13–17 años) y sus docentes de Ciencias Sociales.
Hackathon Regional 2026 · Sede Sucre · Problemática 2.

| Lo que dice el reto | Lo que hace la app |
|---|---|
| Desconocen las historias y acontecimientos | **Conoce:** historias cortas y retos de 2 minutos |
| No se identifican ni valoran su legado | **Colecciona:** álbum de figuritas; la dorada se gana en el lugar |
| No se involucran en su preservación | **Protege:** Misión guardián para reportar daños |

## Cómo correrlo

Requisitos: Node 22.5 o superior (usa `node:sqlite`, sin dependencias nativas).

```bash
npm run install:all          # instala raíz, server y app
cp server/.env.example server/.env   # y completa ANTHROPIC_API_KEY
npm run seed                 # carga data/seed.json como PENDIENTE: un docente lo aprueba en /docente
npm run dev                  # API en :8787 y app en :5173
npm test                     # tests del verificador de cita, filtro de datos y XP
```

Para la demo (un solo origen HTTPS, necesario para offline y cámara): `npm start` y exponer el puerto 8787 con un túnel HTTPS.

## Evaluación (criterio B)

```bash
npm run eval                 # genera preguntas con RAG + cita y sin RAG (requiere ANTHROPIC_API_KEY)
EVAL_ALT_MODEL=claude-haiku-5-5 npm run eval   # opcional: compara un segundo modelo
```

Luego dos personas etiquetan a ciegas en `/evidencia/etiquetar` (P3 y P4) y se pulsa **Recalcular** en `/evidencia`.
Los minutos del docente y el clasificador se completan en `eval/manual.json`.

## Arquitectura

```
app/      PWA del alumno + /docente + /evidencia (React + Vite, offline con service worker)
server/   API Express + SQLite (node:sqlite) + pipeline de IA
data/     fichas de monumentos (.md con fuentes) y monuments.json
eval/     resultados de la evaluación (results.json)
docs/     plan, arquitectura, declaración de IA y fuentes
```

**Pipeline de contenido** (la IA trabaja al crear contenido, nunca mientras el alumno juega):

1. **Recuperar** (sin IA): BM25 (MiniSearch) elige los fragmentos de la ficha.
2. **Borrador** (IA): Claude genera preguntas e historias en JSON con `evidence_quote` y `fragment_id`.
3. **Chequeo de cita** (sin IA): el código comprueba que la cita exista literal en el fragmento.
4. **Juez** (IA): Claude verifica que la cita respalde la respuesta.
5. **Docente** (humano): aprueba, edita o rechaza. Solo lo aprobado llega al alumno.

Detalles y decisiones: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Uso de IA: [docs/AI_DECLARATION.md](docs/AI_DECLARATION.md). Fuentes: [docs/SOURCES.md](docs/SOURCES.md).

## Créditos

Patrones de experiencia gamificada (ruta de lecciones, barra de progreso, retroalimentación) inspirados en
[react-duolingo](https://github.com/bryanjenningz/react-duolingo) (MIT). No se usa su código ni ningún recurso gráfico de Duolingo: la identidad visual y la mascota son propias.

Licencia: MIT.

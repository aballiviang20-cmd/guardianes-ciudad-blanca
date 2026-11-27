# HistoryBol · Guardianes de la Ciudad Blanca

**Conoce. Colecciona. Protege.** App educativa gamificada sobre el patrimonio de Sucre para estudiantes de secundaria (13–17 años) y sus docentes de Ciencias Sociales.
Hackathon Regional 2026 · Sede Sucre · Problemática 2.

| Lo que dice el reto | Lo que hace la app |
|---|---|
| Desconocen las historias y acontecimientos | **Conoce:** historias cortas y retos de 2 minutos |
| No se identifican ni valoran su legado | **Colecciona:** álbum de figuritas; la dorada se gana en el lugar |
| No se involucran en su preservación | **Protege:** Misión guardián para reportar daños |

## Entrega final · proyecto-Pichones

**Equipo Pichones:** Ballivián Goytia Augusto · Cepeda Muruchi Matius Franco · Picha Basilio Bryan Rodrigo

| Entregable | Descarga |
|---|---|
| Video de presentación (1:58) | [01_HistoryBol_video.mp4](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/01_HistoryBol_video.mp4) |
| Documento del proyecto | [02_HistoryBol_documento.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/02_HistoryBol_documento.pdf) |
| Guía de elaboración | [03_HistoryBol_guia_de_elaboracion.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/03_HistoryBol_guia_de_elaboracion.pdf) |
| Documento de la convocatoria (declaración de IA y rúbrica) | [04_HistoryBol_documento_convocatoria.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/04_HistoryBol_documento_convocatoria.pdf) |
| Enlaces y guía rápida | [entrega/00_LEEME_enlaces.html](entrega/00_LEEME_enlaces.html) |
| Código | Botón verde **Code → Download ZIP** |

### English version

**Team Pichones:** Ballivián Goytia Augusto · Cepeda Muruchi Matius Franco · Picha Basilio Bryan Rodrigo

| Deliverable | Download |
|---|---|
| Project document | [02_HistoryBol_document_EN.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/english/02_HistoryBol_document_EN.pdf) |
| Production guide | [03_HistoryBol_production_guide_EN.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/english/03_HistoryBol_production_guide_EN.pdf) |
| Call document (AI declaration and rubric evidence) | [04_HistoryBol_call_document_EN.pdf](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/english/04_HistoryBol_call_document_EN.pdf) |
| Links and quick start | [entrega/english/00_README_links.html](entrega/english/00_README_links.html) |
| Video (Spanish, subtitled) | [01_HistoryBol_video.mp4](https://github.com/aballiviang20-cmd/guardianes-ciudad-blanca/raw/main/entrega/01_HistoryBol_video.mp4) |

**Quick start:** Node.js 22+ · `npm run install:all` · `npm run seed` · `npm start` → http://localhost:8787 (student app with ES/EN switch), `/docente` (teacher panel: Review → Approve all), `/conoce` (presentation).

> El desarrollo terminó con el commit de las 14:26 (code freeze 14:30). La carpeta `entrega/` solo agrega documentos y el video; no cambia el código.

## Publicarla e instalarla en celulares, tablets y PC

1. `npm start` (app + API en el puerto 8787).
2. `npm run publicar` → crea un enlace público **HTTPS** (Pinggy por SSH, sin cuenta ni descargas; dura 60 min y la primera vez muestra un aviso: tocar *Continuar*). Alternativa: `npm run publicar:alt` (localhost.run). Los enlaces gratuitos cambian y funcionan mientras esta computadora esté encendida; en la misma red Wi-Fi también sirve `http://IP-de-la-PC:8787`. Para algo permanente, desplegar `npm start` en un servidor (Render, Railway, una VM) con `AUTH_SECRET` y `TEACHER_PIN` propios.
3. **Instalar como app:** en Android, Chrome → menú ⋮ → *Instalar app* (Chrome genera la app instalada, como un APK); en iPhone/iPad, Safari → Compartir → *Agregar a inicio*; en PC, el ícono de instalar en la barra de direcciones de Chrome/Edge. Funciona sin internet una vez abierta.

## Usarla desde GitHub (sin instalar nada)

[![Abrir en GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/aballiviang20-cmd/guardianes-ciudad-blanca)

1. Toque el botón: GitHub crea el entorno, instala, compila, carga el contenido y abre la app en el puerto 8787.
2. **Página pública con tutoriales:** `/conoce` (presentación con tutoriales de 2 min narrados por Orki).
3. **Docente:** `/docente` → usuario `profe.vargas` (ver contraseña en [docs/CUENTAS_DEMO.md](docs/CUENTAS_DEMO.md)) → *Revisar* → *Aprobar todas* para publicar el contenido base.
4. **Alumno:** «Empezar» → apodo, código de curso y nivel (4to empieza en Fácil, 6to en Difícil) → elegir guardián. Sin usuario ni contraseña.

Funciona en celular, tablet y computadora (PWA instalable, offline una vez abierta).

## Qué hay en la app

| Para | Qué puede hacer |
|---|---|
| Estudiante | Ruta en el tiempo (1538 → 1991), cómic antes de cada reto, retos Fácil / Medio / Difícil con 3 vidas, estrellas, álbum y figurita dorada por QR, Misión guardián, liga de cursos, 8 personajes animados (parpadean, respiran, gesticulan) |
| Docente | Tablero con próximo paso y actividad en vivo, **subir información** propia por lugar, **crear lección con IA** (con cita obligatoria y doble verificación), **revisar una por una** viendo el celular del alumno, **asignar actividades** a 4TO / 6TO con dificultad y fecha, progreso y reportes |

Niveles: 4to de secundaria empieza en *Fácil* (verdadero/falso y elegir, explicaciones juveniles, relato más corto); 6to en *Difícil* (ordenar en el tiempo y elegir entre años). Cada estudiante puede cambiar la dificultad.

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

## Reconocimiento en el celular (Nivel 2)

1. Abrir `/entrenar` (con el PIN docente) **por HTTPS o localhost** para que funcione la cámara.
2. Elegir un monumento y **mantener presionado** apuntando a él (o a sus fotos), o **subir fotos**. Repetir con varios ángulos y luces. Agregar ejemplos de **Otro** (calles, otras fachadas).
3. **Evaluar**: separa 1 de cada 5 ejemplos como prueba, muestra precisión y matriz de confusión.
4. **Guardar modelo**: se guardan solo los vectores en `data/classifier/knn.json` (nunca fotos) y las métricas en `eval/manual.json`.

En Escanear, el monumento se acepta con 4 de 5 vecinos de acuerdo (umbral 0,8) en 3 cuadros seguidos; si no, la app dice "No reconozco este lugar".

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
Diseño de interacción propio del equipo, basado en principios de aprendizaje gamificado.

Licencia: MIT.

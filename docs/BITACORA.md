# Bitácora de desarrollo

Registro del proceso durante la Hackathon Regional 2026 (sede Sucre). Cada commit se sube a GitHub
automáticamente al crearse (`.githooks/post-commit`), así el historial del repositorio oficial es continuo
y con hora real. Zona horaria: Bolivia (UTC-4).

## Cómo verlo
- Historial con horas: pestaña **Commits** del repositorio en GitHub.
- En la terminal: `git log --date=format:"%H:%M" --format="%ad %h %s"`

## Hitos
| Hora | Qué se hizo | Quién decidió / hizo |
|---|---|---|
| 10:00 | Plan de acción y alcance (problemática 2), arquitectura en 3 capas | Equipo + Claude Code |
| 10:16 | Estructura del repo, backend Express + SQLite, verificador de cita | Claude Code, revisado por el equipo |
| 10:25 | PWA del alumno: ruta, historias, retos, álbum, liga, misión guardián | Claude Code |
| 10:52 | Fichas de San Lázaro, Catedral y Sucre con las fuentes del equipo | Documentos del equipo; redacción de fichas con Claude Code |
| 10:55 | Evaluación con RAG vs sin RAG y etiquetado a ciegas | Claude Code; el etiquetado lo hace el equipo |
| 11:08 | Reconocimiento de monumentos en el celular (MobileNet + KNN) | Claude Code |
| 11:34 | Personajes del equipo, cómics de clase invertida, vidas, estrellas, sonidos andinos, QR | Personajes del equipo (ChatGPT); integración con Claude Code |
| 11:45 | Fondos de los 4 lugares y llama Kusi | Generados con ChatGPT a pedido del equipo |
| 11:56 | Modo offline completo y avatar en la ruta | Claude Code |
| 12:20 | Arte unificado en estilo vectorial 2D: Sofía (antes Vale), Orki, Kusi y nuevos Tata Julián, Juanita (cholita) y Bruno (deportista); fondos redibujados; desfile animado | El equipo eligió personajes y estilo; hojas con ChatGPT; recorte e integración con Claude Code |
| 12:35 | Mateo y Wara redibujados con la misma calidad; diversidad de tonos de piel (Mateo, Wara, Juanita, Tata Julián); personajes animados todo el tiempo | Pedido del equipo; hojas con ChatGPT; integración con Claude Code |
| 12:45 | Animación suave con parpadeo real (detección automática de ojos) y gestos; panel docente paso a paso con subida de información nueva por lugar | Pedido del equipo; implementación con Claude Code; el equipo prueba el flujo docente |
| 12:53 | Panel docente rehecho como tablero: menú lateral, próximo paso recomendado, indicadores del curso, avance por lugar, actividad en vivo y revisión una por una con vista previa del celular del alumno | Pedido del equipo; implementación con Claude Code |
| 13:36 | Cuentas con usuario y contraseña (docente de Sociales 4TO/6TO y dos alumnas), niveles y dificultad, actividades asignadas, IA adaptada al curso, página /conoce con tutoriales narrados por Orki, Codespaces | Pedido del equipo; implementación con Claude Code |
| 13:44 | Nuevo nombre Patrilingo; inicio de sesión y registro de alumnos; enlace público HTTPS (localhost.run) e instalación como app | Pedido del equipo; implementación con Claude Code |
| 13:56 | Documento de entrega en PDF con capturas reales y tutorial | Claude Code, revisado por el equipo |
| 14:05 | Nombre final HistoryBol; los alumnos entran sin usuario ni contraseña; enlace público con Pinggy | Pedido del equipo |

## Historial de commits (generado desde git)
- 10:16 · chore: estructura del proyecto, plan, declaración de IA y fichas de prueba
- 10:16 · feat(server): API Express con SQLite, fichas con BM25 y pipeline de IA en 3 capas
- 10:25 · feat(app): PWA del alumno con ruta gamificada, historias, retos, álbum, liga y misión guardián
- 10:28 · fix(app): barajar opciones de opción múltiple, centrar mascota y acortar barra de historias
- 10:29 · fix(app): pestaña activa visible en el panel docente
- 10:52 · feat(contenido): fichas de San Lázaro, Catedral y Sucre con fuentes del equipo; ruta en el tiempo 1538-1991
- 10:52 · feat(app): rediseño visual y de movimiento
- 10:55 · feat(eval): evaluación con RAG vs sin RAG, etiquetado humano a ciegas y métricas
- 10:56 · docs: fuentes por parada, discrepancia de fechas, documentos descartados y pasos de evaluación
- 10:56 · chore: versionar eval/results.json (es evidencia para el jurado)
- 11:08 · feat(vision): reconocimiento de monumentos en el celular con MobileNet + KNN
- 11:34 · feat: personajes del equipo, cuentos tipo cómic, vidas, estrellas, sonidos andinos y QR
- 11:35 · chore: personajes del equipo en todas las pantallas y declaración de ilustraciones hechas con ChatGPT
- 11:50 · feat(arte): fondos ilustrados de San Lázaro, Catedral, Casa de la Libertad y Sucre generados con ChatGPT en el estilo de los personajes
- 11:53 · feat(personajes): Kusi, la llama con aguayo, como quinto guardián; aparece en la portada y en los cuentos
- 11:56 · feat(app): personajes y fondos disponibles sin conexión y avatar esperando en la parada actual

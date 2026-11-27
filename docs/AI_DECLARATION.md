# Declaración de uso de IA

## Herramientas de IA usadas para programar
- **Claude Code** (Anthropic): generación de código, revisión y documentación, siempre revisado por el equipo.
- _(Agregar cualquier otra herramienta que el equipo use: Cursor, Copilot, ChatGPT, etc.)_

## Diseñado y decidido por el equipo
- Definición del problema, público objetivo y alcance (Conoce · Colecciona · Protege).
- Arquitectura: PWA offline + API Express + SQLite; la IA solo en el servidor y solo al crear contenido.
- Pipeline de verificación en 3 capas (cita literal comprobada por código, juez LLM, aprobación docente).
- Criterios éticos: alias en vez de nombres, sin GPS, sin fotos subidas, sin azar ni compras, filtro de datos personales.
- Fichas de monumentos y sus fuentes; etiquetado humano del set de evaluación.
- Diseño de juego: álbum de figuritas, misiones, liga por curso.

## Generado con IA y revisado por el equipo
- Código de componentes, endpoints y tests.
- Borradores de traducción al inglés.
- Borradores de preguntas e historias: **ninguno llega al alumno sin aprobación de un docente**.

## IA dentro del producto
| Módulo | Modelo | Dónde corre | Supervisión |
|---|---|---|---|
| Generación de preguntas e historias | Claude (`CLAUDE_MODEL`) | Servidor | Chequeo de cita + juez + docente |
| Juez de respaldo | Claude (`JUDGE_MODEL`) | Servidor | Medido contra etiquetado humano |
| Reconocimiento de monumentos | MobileNet v2 (TensorFlow.js) + KNN entrenado por el equipo en /entrenar | Celular del alumno (offline tras la primera carga) | Umbral 0,8 en 3 cuadros, clase "otro", evaluación con ejemplos separados |

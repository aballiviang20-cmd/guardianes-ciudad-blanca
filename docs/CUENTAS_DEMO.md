# Cuentas de demostración

Solo para la demo de la hackatón (datos ficticios). Las contraseñas se guardan cifradas con scrypt en `data/usuarios.json`.

| Rol | Usuario | Contraseña | Datos |
|---|---|---|---|
| Docente | `profe.vargas` | `Sucre1538` | Prof. Ramiro Vargas · Ciencias Sociales · cursos 4TO-A y 6TO-A |
| Alumna 4to de secundaria | `camila.4to` | `guardiana4` | Camila · 4TO-A · empieza en dificultad Fácil, explicaciones juveniles |
| Alumna 6to de secundaria | `lucia.6to` | `guardiana6` | Lucía · 6TO-A · empieza en dificultad Difícil |

- Docente: entrar en `/docente` con usuario y contraseña (el PIN `TEACHER_PIN` queda como respaldo).
- Alumnas: en la pantalla de bienvenida, «Tengo cuenta de mi colegio».
- Para producción: cambiar estas cuentas y definir `AUTH_SECRET` en `server/.env`.

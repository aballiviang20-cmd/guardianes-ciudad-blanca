/**
 * Filtro de datos personales para los reportes de alumnos (sin IA: pocos reportes y un docente los revisa igual).
 * Quita correos, teléfonos y números de documento antes de guardar.
 */
export function redactPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo]")
    .replace(/\b\d{5,}\s?(lp|cb|sc|ch|or|pt|tj|bn|pa)\b/gi, "[documento]")
    .replace(/(\+?\d[\d\s-]{5,}\d)/g, "[número]")
    .slice(0, 200);
}

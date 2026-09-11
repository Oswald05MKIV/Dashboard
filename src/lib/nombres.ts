/**
 * Utilidades para casar los nombres cortos que se usan en Teams
 * ("Pily González", "Gis García", "Chris Díaz") con los nombres canónicos
 * que trae dashboard.json ("Pilar González Ávila", "Nidia Gisela García Trujillo").
 *
 * Regla: todos los apellidos del nombre corto deben aparecer en el canónico y
 * el primer nombre debe coincidir por prefijo/contención o por apodo conocido.
 */

export const normalizar = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Apodos que no se resuelven por prefijo. Clave y valor ya normalizados. */
const APODOS: Record<string, string> = {
  pily: "pilar",
  angie: "angeles",
  noe: "noel",
  liz: "lizbeth",
  chris: "christian",
  lore: "lorena",
  gis: "gisela",
  adri: "adriana",
  sol: "marisol",
};

export function coincideNombre(corto: string, canonico: string): boolean {
  const c = normalizar(corto).split(/\s+/).filter(Boolean);
  const k = normalizar(canonico);
  if (!c.length || !k) return false;
  if (normalizar(corto) === k) return true;
  const tokens = k.split(/\s+/);
  const [primero, ...apellidos] = c;
  if (!apellidos.length) return tokens.includes(primero);
  if (!apellidos.every((a) => tokens.includes(a))) return false;
  const objetivo = APODOS[primero] ?? primero;
  return tokens.some((t) => t.startsWith(objetivo) || t.includes(objetivo));
}

/** Devuelve el primer elemento cuya propiedad `nombre` coincide con el nombre corto. */
export function buscarPorNombre<T extends { nombre: string }>(lista: readonly T[], corto: string): T | undefined {
  return lista.find((x) => coincideNombre(corto, x.nombre));
}

import dashboard from "../generated/dashboard.json";
import { buscarPorNombre } from "./nombres";

/**
 * Bloque `leadsCuatrimestre` que genera scripts/build-data.mjs:
 * los cuatro meses completos anteriores al mes en curso, con el mes en curso aparte.
 * Se lee de forma opcional para que el dashboard siga compilando y funcionando
 * aunque el bloque no exista en una versión anterior del JSON.
 */
export interface LeadsCuatrimestreFila {
  nombre: string;
  meses: number[];
  total: number;
  promedio: number;
  mesEnCurso: number;
}

export interface LeadsCuatrimestre {
  meses: number[];
  etiquetas: string[];
  total: number;
  mesEnCurso: { etiqueta: string; total?: number };
  porAsesor: LeadsCuatrimestreFila[];
}

const bloque = (dashboard as unknown as { leadsCuatrimestre?: LeadsCuatrimestre }).leadsCuatrimestre;

export function leadsCuatrimestre(): LeadsCuatrimestre | null {
  return bloque?.porAsesor?.length ? bloque : null;
}

/** Fila del asesor; acepta nombre canónico o nombre corto (como en Teams). */
export function leadsCuatrimestreDe(nombre: string): LeadsCuatrimestreFila | null {
  const c = leadsCuatrimestre();
  if (!c) return null;
  return buscarPorNombre(c.porAsesor, nombre) ?? null;
}

/** Promedio mensual por asesor de toda la oficina en el cuatrimestre. */
export function promedioOficinaCuatrimestre(): number {
  const c = leadsCuatrimestre();
  if (!c || !c.porAsesor.length || !c.meses.length) return 0;
  return c.total / c.porAsesor.length / c.meses.length;
}

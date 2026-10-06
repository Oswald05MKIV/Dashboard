/**
 * Metas anuales escalonadas (360K → 500K → 1M) y escuderos en formación.
 *
 * Todo se calcula en el navegador con la fecha del día (zona America/Mexico_City),
 * no en el build: el "debería llevar" avanza solo cada mes aunque no haya datos
 * nuevos. Los montos sí son los del último corte de dashboard.json.
 *
 * Reglas de tiempo:
 *  - Año calendario (1 ene – 31 dic). Solo cuentan cierres del año en curso
 *    (eso ya lo filtra build-data.mjs con FECHA OPERACION).
 *  - Fracción del año = mes en curso ÷ 12 (la meta va por mes, no por día).
 *  - Debería llevar = meta × fracción. % de ritmo = lleva ÷ debería llevar.
 *  - Si cambió el año y todavía no hay datos del año nuevo, todos regresan al
 *    nivel 360K con $0.
 *
 * Constantes ajustables: src/config.ts (META_NIVELES, UMBRAL_CASI, PCT_CASI,
 * META_OPCIONADAS_NOVATO, PESOS_INDICE, MEZCLA_PARTICIPACION, ZONA_HORARIA).
 */
import { useEffect, useState } from "react";
import {
  MEZCLA_PARTICIPACION,
  META_NIVELES,
  META_OPCIONADAS_NOVATO,
  PCT_CASI,
  PESOS_INDICE,
  UMBRAL_CASI,
  ZONA_HORARIA,
} from "../config";
import type { Advisor, CapacitacionAsesor, DashboardData } from "../types";

/* ------------------------------------------------------------------ */
/* Fecha de hoy y fracción del año                                      */
/* ------------------------------------------------------------------ */

export type HoyMx = { anio: number; mes: number; dia: number };

/** Fecha de hoy en la zona horaria de la oficina. */
export function hoyMexico(ahora: Date = new Date()): HoyMx {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(ahora);
  const valor = (t: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return { anio: valor("year"), mes: valor("month"), dia: valor("day") };
}

/** Fracción del año transcurrida: mes en curso ÷ 12. */
export const fraccionAnio = (mes: number) => Math.min(Math.max(mes, 1), 12) / 12;

export type ContextoMetas = {
  hoy: HoyMx;
  /** Mes en curso (1–12): "Mes X de 12". */
  mes: number;
  fraccion: number;
  /** El año cambió y dashboard.json sigue siendo del año anterior: todos en 360K con $0. */
  anioNuevoSinDatos: boolean;
  /** Última fecha del archivo de cierres (YYYY-MM-DD). */
  fechaCorte: string | null;
};

export function contextoMetas(data: Pick<DashboardData, "year" | "fechaCorte">, ahora: Date = new Date()): ContextoMetas {
  const hoy = hoyMexico(ahora);
  return {
    hoy,
    mes: hoy.mes,
    fraccion: fraccionAnio(hoy.mes),
    anioNuevoSinDatos: hoy.anio > data.year,
    fechaCorte: data.fechaCorte ?? null,
  };
}

/** Igual que contextoMetas, pero se refresca solo mientras la página está abierta. */
export function useContextoMetas(data: Pick<DashboardData, "year" | "fechaCorte">): ContextoMetas {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return contextoMetas(data, ahora);
}

/* ------------------------------------------------------------------ */
/* Niveles                                                              */
/* ------------------------------------------------------------------ */

export type ClaveNivel = "360" | "500" | "1M";

export type InfoNivel = {
  clave: ClaveNivel;
  meta: number;
  etiqueta: string;
  /** Nombre del territorio en El Reino / encabezado del torneo. */
  territorio: string;
  titulo: string;
  medicion: string;
};

export const NIVELES: Record<ClaveNivel, InfoNivel> = {
  "360": {
    clave: "360",
    meta: META_NIVELES.N360,
    etiqueta: "360K",
    territorio: "Camino de los Caballeros",
    titulo: "Caballeros",
    medicion: "Comisión oficina + asesor (X + Y)",
  },
  "500": {
    clave: "500",
    meta: META_NIVELES.N500,
    etiqueta: "500K",
    territorio: "Feudo de los Señores",
    titulo: "Señores",
    medicion: "Comisión total de la operación, incluidas las compartidas",
  },
  "1M": {
    clave: "1M",
    meta: META_NIVELES.N1M,
    etiqueta: "1M",
    territorio: "Ciudadela de la Corona",
    titulo: "Corona",
    medicion: "Comisión total de la operación, incluidas las compartidas",
  },
};

export const ORDEN_NIVELES: ClaveNivel[] = ["360", "500", "1M"];

/** En capacitación: forzado en CAPACITACION.xlsx (Sí/No) o, en Auto,
 *  antigüedad 0 con la regla actual (mes actual − Fecha Sir − 2 meses). */
export function enCapacitacion(a: Advisor): boolean {
  const forzado = a.capacitacion?.enCapacitacion ?? "auto";
  if (forzado === "si") return true;
  if (forzado === "no") return false;
  return a.fechaSir != null && a.mesesAntiguedad === 0;
}

export type MetaIndividual = {
  nivel: InfoNivel;
  meta: number;
  deberiaLlevar: number;
  lleva: number;
  /** lleva ÷ debería llevar × 100, redondeado a 2 decimales. */
  pctRitmo: number;
  /** lleva ÷ meta × 100. */
  pctMeta: number;
  falta: number;
  /** Le falta ≤ UMBRAL_CASI o ya lleva ≥ PCT_CASI de la meta. */
  yaCasi: boolean;
};

const dosDecimales = (n: number) => Math.round(n * 100) / 100;

/** Calcula meta, ritmo y faltante para un nivel y un monto dados. */
export function calcularMeta(nivel: InfoNivel, lleva: number, fraccion: number): MetaIndividual {
  const deberiaLlevar = nivel.meta * fraccion;
  const pctRitmo = deberiaLlevar > 0 ? dosDecimales((lleva / deberiaLlevar) * 100) : 0;
  const pctMeta = (lleva / nivel.meta) * 100;
  const falta = Math.max(0, nivel.meta - lleva);
  return {
    nivel,
    meta: nivel.meta,
    deberiaLlevar,
    lleva,
    pctRitmo,
    pctMeta,
    falta,
    yaCasi: falta > 0 && (falta <= UMBRAL_CASI || pctMeta >= PCT_CASI),
  };
}

/**
 * Nivel y avance de un asesor (fuera de capacitación):
 *  - 360K mientras su X + Y no supere $360,000.
 *  - 500K al superar 360K; desde aquí se mide con la comisión total de la operación.
 *  - 1M al superar 500K (comisión total de la operación).
 */
export function metaIndividual(a: Advisor, ctx: ContextoMetas): MetaIndividual {
  const xy = ctx.anioNuevoSinDatos ? 0 : a.totales.comTotal;
  const operacion = ctx.anioNuevoSinDatos ? 0 : a.totales.comOperacion ?? 0;
  if (xy <= META_NIVELES.N360) return calcularMeta(NIVELES["360"], xy, ctx.fraccion);
  if (operacion <= META_NIVELES.N500) return calcularMeta(NIVELES["500"], operacion, ctx.fraccion);
  return calcularMeta(NIVELES["1M"], operacion, ctx.fraccion);
}

/* ------------------------------------------------------------------ */
/* Escuderos en formación — índice de avance 0–100                      */
/* ------------------------------------------------------------------ */

export type ComponenteIndice = "opcionadas" | "asistencia" | "participacion";

export type IndiceCapacitacion = {
  indice: number;
  opcionadas: { valor: number; meta: number; pct: number; meses: number; desdeMes: number };
  /** 0–100 o null si no hay datos. */
  asistencia: number | null;
  participacion: number | null;
  /** Pesos realmente usados (redistribuidos si falta algún componente). */
  pesos: Record<ComponenteIndice, number>;
  sinDatos: ComponenteIndice[];
  fuente: CapacitacionAsesor["fuente"];
  notas: string | null;
  mensaje: string;
};

const NOMBRE_COMPONENTE: Record<ComponenteIndice, string> = {
  opcionadas: "las opcionadas",
  asistencia: "la asistencia",
  participacion: "la participación",
};
const SIGUIENTE_PASO: Record<ComponenteIndice, string> = {
  opcionadas: "opcionar tu siguiente propiedad",
  asistencia: "llegar puntual a la próxima sesión",
  participacion: "levantar la mano en la próxima sesión",
};

/** Mes (1–12) desde el que se cuenta la capacitación: inicio de capacitación,
 *  si no la fecha de ingreso, y si ninguna es de este año, enero. */
function mesInicio(a: Advisor, anio: number): number {
  const fechas = [a.capacitacion?.inicio ?? null, a.fechaSir];
  for (const f of fechas) {
    if (!f) continue;
    const [y, m] = f.split("-").map(Number);
    if (y === anio && m >= 1 && m <= 12) return m;
    if (y > anio) return 12;
  }
  return 1;
}

export function indiceCapacitacion(a: Advisor, data: Pick<DashboardData, "year" | "currentMonth">, ctx: ContextoMetas): IndiceCapacitacion {
  const cap = a.capacitacion;
  const desde = Math.min(mesInicio(a, data.year), data.currentMonth);
  const meses = Math.max(1, data.currentMonth - desde + 1);
  const valor = ctx.anioNuevoSinDatos ? 0 : a.actividad.opcionadas.slice(desde - 1, data.currentMonth).reduce((x, y) => x + (y || 0), 0);
  const metaOpc = META_OPCIONADAS_NOVATO * meses;
  const pctOpc = metaOpc > 0 ? Math.min(100, (valor / metaOpc) * 100) : 0;

  const asistencia = cap?.asistencia != null ? Math.min(1, Math.max(0, cap.asistencia)) * 100 : null;

  const cal = cap?.calificacion != null ? Math.min(1, Math.max(0, cap.calificacion / 5)) : null;
  const frec = cap?.frecuencia != null ? Math.min(1, Math.max(0, cap.frecuencia)) : null;
  let participacion: number | null = null;
  if (cal != null && frec != null) participacion = (MEZCLA_PARTICIPACION.calificacion * cal + MEZCLA_PARTICIPACION.frecuencia * frec) * 100;
  else if (cal != null) participacion = cal * 100;
  else if (frec != null) participacion = frec * 100;

  const valores: Record<ComponenteIndice, number | null> = { opcionadas: pctOpc, asistencia, participacion };
  const presentes = (Object.keys(valores) as ComponenteIndice[]).filter((k) => valores[k] != null);
  const sumaPesos = presentes.reduce((s, k) => s + PESOS_INDICE[k], 0);
  const pesos = { opcionadas: 0, asistencia: 0, participacion: 0 } as Record<ComponenteIndice, number>;
  presentes.forEach((k) => { pesos[k] = sumaPesos > 0 ? PESOS_INDICE[k] / sumaPesos : 0; });
  const indice = presentes.reduce((s, k) => s + pesos[k] * (valores[k] ?? 0), 0);

  // Mensaje motivante: reconoce lo mejor y sugiere el siguiente paso en lo más bajo.
  const orden = [...presentes].sort((x, y) => (valores[y] ?? 0) - (valores[x] ?? 0));
  const fuerte = orden[0];
  const debil = orden[orden.length - 1];
  let mensaje: string;
  if (indice >= 80) mensaje = "¡Listo para tomar el Camino de los Caballeros! Sigue con este ritmo.";
  else if (indice >= 60) mensaje = `Vas tomando ritmo: ${NOMBRE_COMPONENTE[fuerte]} es tu fuerte. Tu siguiente paso: ${SIGUIENTE_PASO[debil]}.`;
  else if (indice >= 35) mensaje = `Buen arranque. Cada paso cuenta: ${SIGUIENTE_PASO[debil]}.`;
  else mensaje = `Tu escudo apenas empieza a forjarse. Tu siguiente paso: ${SIGUIENTE_PASO[debil]}.`;

  return {
    indice,
    opcionadas: { valor, meta: metaOpc, pct: pctOpc, meses, desdeMes: desde },
    asistencia,
    participacion,
    pesos,
    sinDatos: (["asistencia", "participacion"] as ComponenteIndice[]).filter((k) => valores[k] == null),
    fuente: cap?.fuente ?? "sin-datos",
    notas: cap?.notas ?? null,
    mensaje,
  };
}

/* ------------------------------------------------------------------ */
/* Listas listas para las vistas                                        */
/* ------------------------------------------------------------------ */

export type FilaNivel = { a: Advisor; m: MetaIndividual };
export type FilaEscudero = { a: Advisor; ind: IndiceCapacitacion };

/** Separa a los asesores activos en escuderos y en los tres niveles, cada grupo
 *  ordenado de mejor a peor (% de ritmo / índice). */
export function agruparPorNivel(data: DashboardData, ctx: ContextoMetas) {
  const activos = data.advisors.filter((a) => a.activo);
  const escuderos: FilaEscudero[] = activos
    .filter(enCapacitacion)
    .map((a) => ({ a, ind: indiceCapacitacion(a, data, ctx) }))
    .sort((x, y) => y.ind.indice - x.ind.indice);
  const porNivel: Record<ClaveNivel, FilaNivel[]> = { "360": [], "500": [], "1M": [] };
  activos
    .filter((a) => !enCapacitacion(a))
    .forEach((a) => {
      const m = metaIndividual(a, ctx);
      porNivel[m.nivel.clave].push({ a, m });
    });
  ORDEN_NIVELES.forEach((k) => porNivel[k].sort((x, y) => y.m.pctRitmo - x.m.pctRitmo || y.m.lleva - x.m.lleva));
  return { escuderos, porNivel };
}

/** "2026-10-02" → "2 oct 2026". */
export function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}

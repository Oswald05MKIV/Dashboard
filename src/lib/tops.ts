/**
 * Tops del mes calculados desde dashboard.json.
 * Actividad del mes + operaciones cerradas en ese mes (por FECHA OPERACION).
 *
 * Reglas (oct 2026):
 *  - Rentas y ventas NO muestran montos. Para aparecer en el cuadro hay un mínimo
 *    del total de operaciones cerradas en el mes: $2,000,000 en ventas y $40,000
 *    en rentas (desde octubre 2026). Se ordena por ese total, pero no se publica.
 *  - Verónica (Alma Verónica Flores) no entra en recorridos, opciones ni opcionadas.
 *  - Marcas de color de la hoja OPCIONES: naranja = no opcionó (advertencia);
 *    verde = situación personal (no sale en las listas de advertencia).
 *  - Angel Gabriel Martínez va como "Periodo de prueba".
 * Las bajas no aparecen porque ya no vienen en `advisors`.
 */
import type { Advisor, DashboardData } from "../types";
import { MESES_LARGOS } from "../config";

export type TopItem = {
  lugar: number;
  nombre: string;
  valor: number;
  ops?: number;
  detalle?: string;
  leads?: number;
  recorridos?: number;
  etiqueta?: string;
};
export type TopBloque = {
  titulo: string;
  unidad: string;
  /** Rentas/ventas: se ordena por monto pero NO se muestra. */
  sinMonto?: boolean;
  /** Mínimo del mes para aparecer (solo rentas/ventas). */
  minimo?: number;
  nota: string;
  items: TopItem[];
  total?: number;
  totalEtiqueta?: string;
};
export type ClaveTop = "recorridos" | "mostradas" | "opcionadas" | "rentas" | "ventas";
export type ClaveLista = "recorridosLeads" | "sinRecorridos" | "noOpcionaron";
export type DatosTops = {
  periodo: string;
  mes: string;
  mesNum: number;
  orden: ClaveTop[];
  tops: Partial<Record<ClaveTop, TopBloque>>;
  listas: Record<ClaveLista, TopItem[]>;
  /** Asesores en periodo de prueba que se muestran aparte en las listas. */
  prueba: TopItem[];
};

/** Mínimos para salir en el cuadro (total de operaciones cerradas en el mes). */
export const MINIMO_VENTAS = 2_000_000;
export const MINIMO_RENTAS = 40_000;
const MINIMOS_DESDE = { year: 2026, month: 10 };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/** No cuentan para recorridos / opciones / opcionadas. */
const FUERA_DE_ACTIVIDAD = new Set(["alma veronica flores guzman", "oswaldo sanchez"]);
/** Periodo de prueba: no entran en las advertencias, se muestran con su etiqueta. */
const PERIODO_PRUEBA = new Set(["angel gabriel martinez"]);

const NOMBRES_CORTOS: Record<string, string> = {
  "maria de los angeles bostal": "Ángeles Bostal",
  "angel gabriel martinez": "Angel Martínez",
};

const PARTICULAS = /^(de|del|la|las|los|y)$/i;
/** Nombre corto para las tarjetas: primer nombre + primer apellido. */
export function nombreCorto(n: string): string {
  const fijo = NOMBRES_CORTOS[norm(n)];
  if (fijo) return fijo;
  const t = n.split(/\s+/);
  // "Héctor de la Peña" se queda completo; solo "María de los …" se recorta.
  if (t.length >= 3 && PARTICULAS.test(t[1]) && !/^maria$/i.test(norm(t[0]))) return n;
  if (t.length >= 3 && PARTICULAS.test(t[1])) {
    let i = 1;
    while (i < t.length && PARTICULAS.test(t[i])) i++;
    return t.slice(i, i + 2).join(" ");
  }
  if (/^maria$/i.test(norm(t[0])) && t.length > 3) return `${t[0]} ${t[1]}`;
  if (t.length >= 4) return `${t[0]} ${t[2]}`;
  if (t.length === 3) return `${t[0]} ${t[1]}`;
  return n;
}

type Entrada = { a: Advisor; valor: number; ops?: number; detalle?: string; leads?: number; recorridos?: number; etiqueta?: string };

/** Ranking con empates (1, 1, 3…). Solo valores > 0. */
function rankear(lista: Entrada[]): TopItem[] {
  const orden = lista.filter((x) => x.valor > 0).sort((x, y) => y.valor - x.valor || x.a.nombre.localeCompare(y.a.nombre));
  return orden.map((x) => ({
    lugar: orden.findIndex((o) => o.valor === x.valor) + 1,
    nombre: nombreCorto(x.a.nombre),
    valor: x.valor,
    ops: x.ops,
    detalle: x.detalle,
    leads: x.leads,
    recorridos: x.recorridos,
    etiqueta: x.etiqueta,
  }));
}

/** Podio: lugares 1 a 3; si un empate se desborda (más de 6 nombres) se corta. */
function podio(items: TopItem[]): TopItem[] {
  const sel = items.filter((it) => it.lugar <= 3);
  if (sel.length <= 6) return sel;
  let corte: TopItem[] = [];
  for (const l of [...new Set(sel.map((it) => it.lugar))]) {
    const grupo = sel.filter((it) => it.lugar === l);
    if (corte.length && corte.length + grupo.length > 6) break;
    corte = corte.concat(grupo);
  }
  return corte;
}

const detalleRV = (renta: number, venta: number) =>
  [venta ? `${venta} venta` : "", renta ? `${renta} renta` : ""].filter(Boolean).join(" · ");

/** Mes que se muestra por defecto: el anterior si el mes en curso apenas empieza (primeros 10 días). */
export function mesPorDefecto(data: DashboardData): number {
  const g = new Date(data.generadoEl);
  const mesGen = g.getMonth() + 1;
  if (data.previousMonth && mesGen === data.currentMonth && g.getDate() <= 10) return data.previousMonth;
  return data.currentMonth;
}

export function topsDelMes(data: DashboardData, m: number): DatosTops {
  const i = m - 1;
  const mes = MESES_LARGOS[i].toLowerCase();
  const periodo = `${MESES_LARGOS[i]} ${data.year}`;
  const enCurso = m === data.currentMonth ? " (mes en curso)" : "";
  const S = data.totals.series;
  const conMinimos = data.year > MINIMOS_DESDE.year || (data.year === MINIMOS_DESDE.year && m >= MINIMOS_DESDE.month);

  const todos = data.advisors;
  // Actividad: sin Verónica ni el coordinador, y solo quien viene en la hoja del mes.
  const enHoja = (a: Advisor) => a.enHojaMes?.[i] ?? true;
  const act = todos.filter((a) => !FUERA_DE_ACTIVIDAD.has(norm(a.nombre)) && enHoja(a));
  const esPrueba = (a: Advisor) => PERIODO_PRUEBA.has(norm(a.nombre));
  const marca = (a: Advisor) => a.marcaMes?.[i] ?? null;
  const rec = (a: Advisor) => a.actividad.recorridos[i] || 0;
  const leads = (a: Advisor) => a.actividad.leads[i] || 0;

  const recItems = rankear(act.map((a) => ({ a, valor: rec(a), leads: leads(a) })));
  const mos = rankear(act.map((a) => ({ a, valor: a.actividad.opciones[i] || 0 })));
  const opc = rankear(act.map((a) => ({
    a,
    valor: a.actividad.opcionadas[i] || 0,
    detalle: detalleRV(a.actividad.opcionadasRenta[i] || 0, a.actividad.opcionadasVenta[i] || 0),
  })));

  const minR = conMinimos ? MINIMO_RENTAS : 1;
  const minV = conMinimos ? MINIMO_VENTAS : 1;
  const ren = rankear(todos
    .filter((a) => (a.volRentaMes?.[i] || 0) >= minR)
    .map((a) => ({ a, valor: a.volRentaMes?.[i] || 0, ops: a.opsRentaMes?.[i] || 0 })));
  const ven = rankear(todos
    .filter((a) => (a.volVentaMes?.[i] || 0) >= minV)
    .map((a) => ({ a, valor: a.volVentaMes?.[i] || 0, ops: a.opsVentaMes?.[i] || 0 })));

  // Listas completas
  const recorridosLeads = recItems; // todos los que hicieron al menos 1 recorrido
  const sinRecorridos = act
    .filter((a) => rec(a) === 0 && marca(a) !== "verde" && !esPrueba(a))
    .map((a) => ({ lugar: 0, nombre: nombreCorto(a.nombre), valor: leads(a), leads: leads(a), recorridos: 0 }))
    .sort((x, y) => y.valor - x.valor || x.nombre.localeCompare(y.nombre));
  const noOpcionaron = act
    .filter((a) => marca(a) === "naranja" && !esPrueba(a))
    .map((a) => ({ lugar: 0, nombre: nombreCorto(a.nombre), valor: a.actividad.opcionadas[i] || 0, leads: leads(a), recorridos: rec(a) }))
    .sort((x, y) => (y.leads ?? 0) - (x.leads ?? 0) || x.nombre.localeCompare(y.nombre));
  const prueba = act
    .filter(esPrueba)
    .map((a) => ({ lugar: 0, nombre: nombreCorto(a.nombre), valor: 0, leads: leads(a), recorridos: rec(a), etiqueta: "Periodo de prueba" }));

  const opsR = S.opsRenta?.[i] || 0;
  const opsV = S.opsVenta?.[i] || 0;

  return {
    periodo,
    mes,
    mesNum: m,
    orden: ["recorridos", "mostradas", "opcionadas", "rentas", "ventas"],
    tops: {
      recorridos: { titulo: "Recorridos", unidad: "recorridos", items: podio(recItems), total: S.recorridos[i] || 0, totalEtiqueta: "recorridos en la oficina",
        nota: `Recorridos registrados en ${mes}${enCurso}, con los leads que recibió cada quien.` },
      mostradas: { titulo: "Opciones mostradas", unidad: "opciones", items: podio(mos), total: S.opciones[i] || 0, totalEtiqueta: "opciones mostradas en la oficina",
        nota: `Opciones mostradas a clientes en ${mes}${enCurso}.` },
      opcionadas: { titulo: "Propiedades opcionadas", unidad: "propiedades", items: podio(opc), total: S.opcionadas[i] || 0, totalEtiqueta: "propiedades opcionadas en la oficina",
        nota: `Propiedades captadas / opcionadas en ${mes}${enCurso}.` },
      rentas: { titulo: "Rentas cerradas", unidad: "rentas", sinMonto: true, minimo: conMinimos ? MINIMO_RENTAS : undefined, items: podio(ren), total: opsR, totalEtiqueta: `renta${opsR === 1 ? "" : "s"} cerrada${opsR === 1 ? "" : "s"} en la oficina`,
        nota: conMinimos ? `Quienes sumaron al menos $40,000 en rentas cerradas en ${mes}.` : `Rentas cerradas en ${mes}.` },
      ventas: { titulo: "Ventas cerradas", unidad: "ventas", sinMonto: true, minimo: conMinimos ? MINIMO_VENTAS : undefined, items: podio(ven), total: opsV, totalEtiqueta: `venta${opsV === 1 ? "" : "s"} cerrada${opsV === 1 ? "" : "s"} en la oficina`,
        nota: conMinimos ? `Quienes sumaron al menos $2,000,000 en ventas cerradas en ${mes}.` : `Ventas cerradas en ${mes}.` },
    },
    listas: { recorridosLeads, sinRecorridos, noOpcionaron },
    prueba,
  };
}

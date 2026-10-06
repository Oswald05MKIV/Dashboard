/**
 * Tops del mes calculados desde dashboard.json (antes eran un archivo escrito a mano).
 * Actividad del mes + operaciones cerradas en ese mes (por FECHA OPERACION).
 * Montos de renta/venta = total de la operación, atribuido al Asesor 1.
 * Las bajas no aparecen porque ya no vienen en `advisors`; sí cuentan en el total
 * de la oficina que se menciona en cada nota.
 */
import type { Advisor, DashboardData } from "../types";
import { MESES_LARGOS } from "../config";

export type TopItem = { lugar: number; nombre: string; valor: number; ops?: number; detalle?: string };
export type TopBloque = { titulo: string; unidad: string; moneda?: boolean; nota: string; completo?: boolean; items: TopItem[] };
export type ClaveTop = "recorridos" | "mostradas" | "opcionadas" | "rentas" | "ventas" | "opcionadasTodos";
export type DatosTops = { periodo: string; mes: string; orden: ClaveTop[]; tops: Partial<Record<ClaveTop, TopBloque>> };

const mxn = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** Nombre corto para las tarjetas: primer nombre + primer apellido. */
export function nombreCorto(n: string): string {
  const t = n.split(/\s+/);
  if (/^maria$/i.test(t[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "")) && t.length > 3) return `${t[0]} ${t[1]}`;
  if (t.length >= 4) return `${t[0]} ${t[2]}`;
  if (t.length === 3) return `${t[0]} ${t[1]}`;
  return n;
}

/** Ranking con empates (1, 1, 3…). Solo valores > 0. */
function rankear(lista: { a: Advisor; valor: number; ops?: number; detalle?: string }[]): TopItem[] {
  const orden = lista.filter((x) => x.valor > 0).sort((x, y) => y.valor - x.valor || x.a.nombre.localeCompare(y.a.nombre));
  return orden.map((x) => ({
    lugar: orden.findIndex((o) => o.valor === x.valor) + 1,
    nombre: nombreCorto(x.a.nombre),
    valor: x.valor,
    ops: x.ops,
    detalle: x.detalle,
  }));
}

/** Podio: los lugares 1 a 3; si un empate se desborda (más de 5 nombres) se corta y se avisa. */
function podio(items: TopItem[]): { items: TopItem[]; extra: string } {
  let sel = items.filter((it) => it.lugar <= 3);
  let extra = "";
  if (sel.length > 5) {
    const lugares = [...new Set(sel.map((it) => it.lugar))];
    let corte: TopItem[] = [];
    for (const l of lugares) {
      const grupo = sel.filter((it) => it.lugar === l);
      if (corte.length && corte.length + grupo.length > 5) {
        extra = ` Detrás vienen ${grupo.length} asesores empatados con ${grupo[0].valor} (ver la lista completa).`;
        break;
      }
      corte = corte.concat(grupo);
    }
    sel = corte;
  }
  return { items: sel, extra };
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
  const ads = data.advisors;
  const S = data.totals.series;

  const rec = podio(rankear(ads.map((a) => ({ a, valor: a.actividad.recorridos[i] || 0 }))));
  const mos = podio(rankear(ads.map((a) => ({ a, valor: a.actividad.opciones[i] || 0 }))));
  const opcAll = rankear(ads.map((a) => ({
    a,
    valor: a.actividad.opcionadas[i] || 0,
    detalle: detalleRV(a.actividad.opcionadasRenta[i] || 0, a.actividad.opcionadasVenta[i] || 0),
  })));
  const opc = podio(opcAll);
  const ren = podio(rankear(ads.map((a) => ({ a, valor: a.volRentaMes?.[i] || 0, ops: a.opsRentaMes?.[i] || 0 }))));
  const ven = podio(rankear(ads.map((a) => ({ a, valor: a.volVentaMes?.[i] || 0, ops: a.opsVentaMes?.[i] || 0 }))));

  return {
    periodo,
    mes,
    orden: ["recorridos", "mostradas", "opcionadas", "rentas", "ventas", "opcionadasTodos"],
    tops: {
      recorridos: { titulo: "Más recorridos", unidad: "recorridos", items: rec.items,
        nota: `Recorridos registrados en ${mes}${enCurso}. La oficina lleva ${S.recorridos[i] || 0}.${rec.extra}` },
      mostradas: { titulo: "Más opciones mostradas", unidad: "opciones", items: mos.items,
        nota: `Opciones mostradas a clientes en ${mes}${enCurso}. La oficina lleva ${S.opciones[i] || 0}.${mos.extra}` },
      opcionadas: { titulo: "Más propiedades opcionadas", unidad: "propiedades", items: opc.items,
        nota: `Propiedades captadas / opcionadas en ${mes}${enCurso}. La oficina lleva ${S.opcionadas[i] || 0}.${opc.extra}` },
      rentas: { titulo: "Acumulado en rentas", unidad: "MXN", moneda: true, items: ren.items,
        nota: `Suma del total de la operación de las rentas cerradas en ${mes}. Total de la oficina: ${mxn(S.volRenta?.[i] || 0)}.${ren.extra}` },
      ventas: { titulo: "Acumulado en ventas", unidad: "MXN", moneda: true, items: ven.items,
        nota: `Suma del total de la operación de las ventas cerradas en ${mes}. Total de la oficina: ${mxn(S.volVenta?.[i] || 0)}.${ven.extra}` },
      opcionadasTodos: { titulo: `Todos los que opcionaron en ${mes}`, unidad: "propiedades", completo: true, items: opcAll,
        nota: `${opcAll.length} asesores opcionaron al menos una propiedad en ${mes}${enCurso}, de más a menos. Mismo número = mismo lugar.` },
    },
  };
}

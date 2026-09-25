export type Pagado = "SI" | "NO" | "SIN_REGISTRO";
export type TipoOp = "VENTA" | "RENTA";

export interface OperacionPendiente {
  propiedad: string;
  tipo: TipoOp;
  monto: number;
  comEsperada: number;
  apartadoM: number | null;
  apartadoY: number | null;
}

export interface CierreDetalle {
  propiedad: string;
  tipo: TipoOp;
  monto: number;
  comOficina: number;
  comAsesor: number;
  mes: number;
  pagado: Pagado;
  apartadoM: number | null;
  apartadoY: number | null;
}

export interface AdvisorTotals {
  recorridos: number;
  opciones: number;
  opcionadas: number;
  leads: number;
  opcionadasRenta: number;
  opcionadasVenta: number;
  cierres: number;
  apartados: number;
  pendientes: number;
  porCobrar: number;
  comOficina: number;
  comAsesor: number;
  comTotal: number;
}

export interface Advisor {
  nombre: string;
  enRoster: boolean;
  activo: boolean;
  fechaSir: string | null;
  mesesAntiguedad: number;
  /** Años calendario desde el ingreso (criterio de la hoja "Antiguedad"). null = sin fecha. */
  aniosAntiguedad?: number | null;
  /** Meses reales desde el ingreso, sin descontar capacitación. */
  mesesDesdeIngreso?: number | null;
  metaAntiguedad: number | null;
  tarifaMesActual: number;
  metaAnio: number;
  actividad: {
    recorridos: number[];
    opciones: number[];
    opcionadas: number[];
    opcionadasRenta: number[];
    opcionadasVenta: number[];
    leads: number[];
  };
  cierresMes: number[];
  apartadosMes: number[];
  comOficinaMes: number[];
  comAsesorMes: number[];
  totales: AdvisorTotals;
  operacionesPendientes: OperacionPendiente[];
  cierresDetalle: CierreDetalle[];
}

export interface Cohorte {
  metaMensual: number;
  esperadoAcumulado: number;
  realAcumulado: number;
  asesoresConMeta: number;
  diferencia: number;
  avancePct: number;
}

export interface DashboardData {
  year: number;
  cohorte: Cohorte;
  currentMonth: number;
  previousMonth: number | null;
  mesesDisponibles: number[];
  generadoEl: string;
  advisors: Advisor[];
  totals: {
    recorridos: number;
    opciones: number;
    opcionadas: number;
    opcionadasRenta: number;
    opcionadasVenta: number;
    leads: number;
    apartados: number;
    cierres: number;
    pendientes: number;
    porCobrar: number;
    comOficina: number;
    comAsesor: number;
    comTotal: number;
    cierresPagados: number;
    ticketPromedio: number;
    series: {
      recorridos: number[];
      opciones: number[];
      opcionadas: number[];
      leads: number[];
      apartados: number[];
      cierres: number[];
      comOficina: number[];
      comAsesor: number[];
    };
  };
}

export interface ValidationReport {
  generadoEl: string;
  archivos: { opciones: string; apartado: string; membresias: string | null };
  duplicadosEliminados: string[];
  fechasCorregidas: string[];
  nombresNormalizados: string[];
  advertencias: string[];
  asesoresFueraDeRoster: string[];
}

export type SectionId =
  | "resumen"
  | "asesores"
  | "operaciones"
  | "actividad"
  | "comisiones"
  | "metas"
  | "ranking"
  | "configuracion";

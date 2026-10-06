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
  /** Comisión total completa de las operaciones en las que participó (metas 500K / 1M). */
  comOperacion: number;
}

/** Datos de CAPACITACION.xlsx (o de la estimación provisional) de un asesor. */
export interface CapacitacionAsesor {
  /** "auto" = regla de antigüedad; "si" / "no" = forzado en la hoja ASESORES. */
  enCapacitacion: "auto" | "si" | "no";
  /** Inicio de capacitación (YYYY-MM-DD) o null. */
  inicio: string | null;
  notas: string | null;
  fuente: "excel" | "provisional" | "sin-datos";
  sesiones: number | null;
  asistio: number | null;
  retardo: number | null;
  justificada: number | null;
  falto: number | null;
  participaciones: number | null;
  /** (Sí + 0.5 × Retardo) ÷ (sesiones − Justificadas), 0–1. */
  asistencia: number | null;
  /** Promedio de calificación, 1–5. */
  calificacion: number | null;
  /** Participaciones ÷ sesiones asistidas, tope 1. */
  frecuencia: number | null;
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
  /** Comisión total completa de la operación por mes de cierre (metas 500K / 1M). */
  comOperacionMes: number[];
  capacitacion: CapacitacionAsesor | null;
  cierresPropiosMes?: number[];
  /** Total de la operación de cierres propios (Asesor 1) por mes. */
  volRentaMes: number[];
  volVentaMes: number[];
  opsRentaMes: number[];
  opsVentaMes: number[];
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

export interface TeamsData {
  inicioMes: number;
  equipos: {
    nombre: string;
    color: "red" | "blue" | "white" | "green" | "purple" | "orange";
    integrantes: {
      nombre: string;
      canonico: string;
      sinDatos: boolean;
      meses: Record<"recorridos" | "mostradas" | "opcionadas" | "leads" | "rentas" | "ventas", number[]>;
    }[];
  }[];
  sinEquipo: string[];
}

export interface DashboardData {
  year: number;
  /** Última FECHA OPERACION del año en el archivo de cierres (YYYY-MM-DD). */
  fechaCorte: string | null;
  /** Nombre del archivo de capacitación usado, o null si no hay. */
  capacitacionArchivo: string | null;
  teams: TeamsData;
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
      volRenta: number[];
      volVenta: number[];
      opcionadasRenta: number[];
      opcionadasVenta: number[];
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

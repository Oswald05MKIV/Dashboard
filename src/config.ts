/**
 * Configuración de negocio del dashboard.
 * Estos son los únicos valores que la oficina puede querer ajustar;
 * el resto se calcula automáticamente desde los archivos Excel.
 */

/** Meta anual individual por asesor, año calendario (1 ene – 31 dic).
 *  Se mide contra la comisión total del asesor (Oficina + Asesor, X + Y).
 *  Es el primer nivel de META_NIVELES (360K → 500K → 1M), más abajo. */
export const META_ANUAL_ASESOR = 360_000;

/**
 * Meta del COHORTE por antigüedad. Se calcula en el pipeline (build-data.mjs)
 * a partir de la "Fecha Sir" del archivo de membresías, restando los meses de
 * capacitación inicial y acumulando la tarifa de cada mes activo por tramo.
 * El cohorte se mide contra la columna Y (Comisión Asesor).
 * Esta tabla es solo de referencia para la sección Configuración; el cálculo real
 * vive en el pipeline. Si cambias las tarifas, actualiza AMBOS lugares.
 */
export const MESES_CAPACITACION = 2;
export const TABLA_META_ANTIGUEDAD = [
  { rango: "1 a 3 meses", monto: 3_000 },
  { rango: "4 a 6 meses", monto: 5_000 },
  { rango: "7 a 9 meses", monto: 8_000 },
  { rango: "10 a 12 meses", monto: 12_000 },
  { rango: "13 a 18 meses", monto: 16_000 },
  { rango: "19+ meses", monto: 20_000 },
] as const;


/* ------------------------------------------------------------------ */
/* Metas anuales escalonadas (año calendario, se reinician cada 1 ene)  */
/* ------------------------------------------------------------------ */

/** Niveles de la meta anual individual. 360K se mide con X + Y (comisión
 *  oficina + asesor); 500K y 1M con la comisión total de la operación,
 *  incluidas las compartidas. Se sube de nivel al superar la meta anterior. */
export const META_NIVELES = { N360: META_ANUAL_ASESOR, N500: 500_000, N1M: 1_000_000 } as const;

/** "Ya casi": se destaca a quien le falte esto o menos para su meta… */
export const UMBRAL_CASI = 50_000;
/** …o quien ya lleve este % (o más) de su meta anual. */
export const PCT_CASI = 85;

/** Zona horaria para calcular el mes en curso en el navegador. */
export const ZONA_HORARIA = "America/Mexico_City";

/** Escuderos en formación: opcionadas esperadas por mes de capacitación. */
export const META_OPCIONADAS_NOVATO = 4;

/** Pesos del índice de avance de capacitación (suman 1). Si falta un
 *  componente, su peso se reparte proporcionalmente entre los demás. */
export const PESOS_INDICE = { opcionadas: 0.4, asistencia: 0.4, participacion: 0.2 } as const;

/** Mezcla dentro de Participación: calificación promedio vs frecuencia. */
export const MEZCLA_PARTICIPACION = { calificacion: 0.7, frecuencia: 0.3 } as const;

/** Umbrales del semáforo (% de avance): rojo < 50, ámbar 50–74, verde ≥ 75. */
export const SEMAFORO = { AMBAR: 50, VERDE: 75 } as const;

export const NOMBRE_OFICINA = "RE/MAX Terra";

export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

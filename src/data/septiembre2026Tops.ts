// Tops de septiembre 2026 para la pestaña "Tops del mes".
//
// Fuentes (corte al 28 de septiembre de 2026):
//   · Recorridos, opciones mostradas y propiedades opcionadas → OPCIONES_RENTA_VENTA,
//     hoja SEPTIEMBRE 2026 (columnas RECORRIDOS, NO. OPCIONES MOSTRADAS y
//     PROPIEDADES OPCIONADAS; el desglose sale de las columnas RENTA y VENTA).
//   · Acumulado de rentas y ventas → APARTADO_Y_CIERRE, operaciones CERRADA con
//     FECHA OPERACION dentro de septiembre 2026. Los montos son el TOTAL DE LA
//     OPERACIÓN, no la comisión.
//
// Atribución: primer asesor de la operación (Asesor 1), igual que el resto del dashboard.
// Los asesores dados de baja (y Oswaldo) no aparecen en los tops, aunque sus números
// sí cuentan en el total de la oficina que se menciona en cada nota.
//
// El orden y la lista de tarjetas se controlan desde `orden`: si algún mes falta
// una métrica, basta con sacarla de ese arreglo.

export type TopItem = {
  lugar: number;
  nombre: string;
  valor: number;
  ops?: number;
  /** Texto chico debajo del nombre (p. ej. "2 venta · 1 renta"). */
  detalle?: string;
};

export type TopBloque = {
  titulo: string;
  unidad: string;
  moneda?: boolean;
  nota: string;
  /** true = la tarjeta ocupa todo el ancho y muestra la lista completa en dos columnas. */
  completo?: boolean;
  items: TopItem[];
};

export type ClaveTop = 'recorridos' | 'mostradas' | 'opcionadas' | 'rentas' | 'ventas' | 'opcionadasTodos';

export type DatosTops = {
  periodo: string;
  mes: string;
  actualizado: string;
  orden: ClaveTop[];
  tops: Partial<Record<ClaveTop, TopBloque>>;
};

export const septiembre2026: DatosTops = {
  periodo: 'Septiembre 2026',
  mes: 'septiembre',
  actualizado: '2026-09-28',
  orden: ['recorridos', 'mostradas', 'opcionadas', 'rentas', 'ventas', 'opcionadasTodos'],
  tops: {
    recorridos: {
      titulo: 'Más recorridos',
      unidad: 'recorridos',
      nota: 'Recorridos registrados en septiembre 2026 (corte al 28). La oficina lleva 90.',
      items: [
        { lugar: 1, nombre: 'Mariana Vega', valor: 19 },
        { lugar: 2, nombre: 'Christian Díaz', valor: 10 },
        { lugar: 3, nombre: 'Judith Diosdado', valor: 9 },
      ],
    },
    mostradas: {
      titulo: 'Más opciones mostradas',
      unidad: 'opciones',
      nota: 'Opciones mostradas a clientes en septiembre 2026 (corte al 28). La oficina lleva 159.',
      items: [
        { lugar: 1, nombre: 'Mariana Vega', valor: 43 },
        { lugar: 2, nombre: 'Christian Díaz', valor: 17 },
        { lugar: 3, nombre: 'Daniela Morales', valor: 15 },
        { lugar: 3, nombre: 'Sol Huerta', valor: 15 },
      ],
    },
    opcionadas: {
      titulo: 'Más propiedades opcionadas',
      unidad: 'propiedades',
      nota: 'Propiedades captadas / opcionadas en septiembre 2026 (corte al 28). La oficina lleva 29. Detrás vienen 7 asesores empatados con 2 (ver la lista completa).',
      items: [
        { lugar: 1, nombre: 'Erick Rosales', valor: 3, detalle: '3 venta' },
        { lugar: 1, nombre: 'Angie Bostal', valor: 3, detalle: '2 venta · 1 renta' },
      ],
    },
    rentas: {
      titulo: 'Acumulado en rentas',
      unidad: 'MXN',
      moneda: true,
      nota: 'Suma del total de la operación de las rentas cerradas en septiembre 2026. Total de la oficina: $69,000.',
      items: [
        { lugar: 1, nombre: 'Pily González', valor: 21000, ops: 1 },
        { lugar: 2, nombre: 'Erik Trotter', valor: 19000, ops: 1 },
        { lugar: 3, nombre: 'Adri Calva', valor: 13500, ops: 1 },
      ],
    },
    ventas: {
      titulo: 'Acumulado en ventas',
      unidad: 'MXN',
      moneda: true,
      nota: 'Suma del total de la operación de las ventas cerradas en septiembre 2026. Total de la oficina: $4,670,000.',
      items: [
        { lugar: 1, nombre: 'Erik Trotter', valor: 3100000, ops: 1 },
        { lugar: 2, nombre: 'Mariana Vega', valor: 1020000, ops: 1 },
        { lugar: 3, nombre: 'Christian Díaz', valor: 550000, ops: 1 },
      ],
    },
    opcionadasTodos: {
      titulo: 'Todos los que opcionaron en septiembre',
      unidad: 'propiedades',
      completo: true,
      nota: '16 asesores opcionaron al menos una propiedad en septiembre 2026 (corte al 28), ordenados de más a menos. Mismo número = mismo lugar.',
      items: [
        { lugar: 1, nombre: 'Erick Rosales', valor: 3, detalle: '3 venta' },
        { lugar: 1, nombre: 'Angie Bostal', valor: 3, detalle: '2 venta · 1 renta' },
        { lugar: 3, nombre: 'Adri Calva', valor: 2, detalle: '2 venta' },
        { lugar: 3, nombre: 'Christian Díaz', valor: 2, detalle: '2 venta' },
        { lugar: 3, nombre: 'Héctor de la Peña', valor: 2, detalle: '2 venta' },
        { lugar: 3, nombre: 'Lore Ramos', valor: 2, detalle: '1 venta · 1 renta' },
        { lugar: 3, nombre: 'Mariana Vega', valor: 2, detalle: '2 renta' },
        { lugar: 3, nombre: 'Gis García', valor: 2, detalle: '2 renta' },
        { lugar: 3, nombre: 'Sophie de la Torre', valor: 2, detalle: '2 renta' },
        { lugar: 10, nombre: 'Erik Trotter', valor: 1, detalle: '1 renta' },
        { lugar: 10, nombre: 'Lesley García', valor: 1, detalle: '1 venta' },
        { lugar: 10, nombre: 'Luis Fernando Alcántar', valor: 1, detalle: '1 venta' },
        { lugar: 10, nombre: 'Elena Romano', valor: 1, detalle: '1 venta' },
        { lugar: 10, nombre: 'Sol Huerta', valor: 1, detalle: '1 venta' },
        { lugar: 10, nombre: 'Rocío Ávalos', valor: 1, detalle: '1 renta' },
        { lugar: 10, nombre: 'Pily González', valor: 1, detalle: '1 venta' },
      ],
    },
  },
};

export default septiembre2026;

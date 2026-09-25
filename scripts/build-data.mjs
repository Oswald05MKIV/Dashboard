/**
 * build-data.mjs — Pipeline de datos del Dashboard Ejecutivo RE/MAX Terra
 * ----------------------------------------------------------------------
 * Lee los archivos Excel de /data, valida, normaliza y genera:
 *   - src/generated/dashboard.json   (datos agregados para la app)
 *   - src/generated/validation.json  (reporte de inconsistencias)
 *
 * Se ejecuta automáticamente antes de `dev` y `build` (ver package.json).
 * Para actualizar cada mes: reemplazar los .xlsx en /data y volver a compilar.
 * No se requiere modificar código.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const OUT_DIR = join(ROOT, "src", "generated");
const YEAR = 2026;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MES_IDX = Object.fromEntries(MESES.map((m, i) => [m, i + 1]));
MES_IDX["setiembre"] = 9;

const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Parsea fechas: Date de Excel, serial numérico o texto en español
 *  (tolera errores como "ded 2026", "15 diciembre de 2025"). */
function parseFecha(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? { y: d.y, m: d.m, d: d.d } : null;
  }
  const s = strip(v);
  if (["na", "n/a", "-", "cayo", "pendiente", ""].includes(s)) return null;
  const m = s.match(/(\d{1,2})\s*(?:de\s*)?([a-z]+)\s*(?:de|del|ded)?\s*(\d{4})/);
  if (m && MES_IDX[m[2]]) return { y: +m[3], m: MES_IDX[m[2]], d: +m[1] };
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  return null;
}

const num = (v) => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[$,\s]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

/* ------------------------------------------------------------------ */
/* Localizar archivos fuente por patrón (no por nombre exacto)         */
/* ------------------------------------------------------------------ */
const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"));
const findFile = (kw) => {
  const hit = files.find((f) => strip(f).includes(kw));
  if (!hit) throw new Error(`No se encontró un .xlsx que contenga "${kw}" en /data. Archivos: ${files.join(", ")}`);
  return join(DATA_DIR, hit);
};
const OPCIONES_PATH = findFile("opciones");
const APARTADO_PATH = findFile("apartado");
let MEMBRESIAS_PATH = null;
try { MEMBRESIAS_PATH = findFile("membres"); } catch { /* opcional */ }

const validation = { generadoEl: new Date().toISOString(), archivos: { opciones: OPCIONES_PATH.split("/").pop(), apartado: APARTADO_PATH.split("/").pop(), membresias: null }, duplicadosEliminados: [], fechasCorregidas: [], nombresNormalizados: [], advertencias: [], asesoresFueraDeRoster: [] };

/* ------------------------------------------------------------------ */
/* 1) OPCIONES — hojas mensuales "<MES> 2026"                          */
/*    A=Asesor B=Propiedades opcionadas E=Leads F=Recorridos G=Opciones */
/* ------------------------------------------------------------------ */
const wbOpc = XLSX.read(readFileSync(OPCIONES_PATH), { cellDates: true });
const monthSheets = wbOpc.SheetNames
  .map((name) => {
    const m = strip(name).match(/^([a-z]+)\s+(\d{4})$/);
    return m && MES_IDX[m[1]] && +m[2] === YEAR ? { name, month: MES_IDX[m[1]] } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.month - b.month);

if (!monthSheets.length) throw new Error(`El archivo OPCIONES no contiene hojas del año ${YEAR}.`);

/** actividad[mes][asesorCanonico] = {recorridos, opciones, opcionadas, leads} */
const actividad = {};
const rosterSet = new Map(); // strip(nombre) -> nombre canónico (con acentos)

for (const { name, month } of monthSheets) {
  const ws = wbOpc.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 2, blankrows: false, defval: null });
  actividad[month] = {};
  for (const r of rows) {
    const raw = r[0];
    if (raw == null || String(raw).trim() === "") break; // fin del bloque de asesores
    const key = strip(raw);
    if (!key || key.startsWith("total")) break;
    const canon = rosterSet.get(key) ?? String(raw).replace(/\s+/g, " ").trim();
    if (!rosterSet.has(key)) rosterSet.set(key, canon);
    const prev = actividad[month][canon] ?? { recorridos: 0, opciones: 0, opcionadas: 0, opcionadasRenta: 0, opcionadasVenta: 0, leads: 0 };
    actividad[month][canon] = {
      recorridos: prev.recorridos + num(r[5]),
      opciones: prev.opciones + num(r[6]),
      opcionadas: prev.opcionadas + num(r[1]),
      opcionadasRenta: prev.opcionadasRenta + num(r[2]),
      opcionadasVenta: prev.opcionadasVenta + num(r[3]),
      leads: prev.leads + num(r[4]),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Normalización de nombres (OPCIONES = roster canónico)               */
/* ------------------------------------------------------------------ */
const ALIAS = {
  "gisella garcia": "Nidia Gisela García Trujillo",
  "nidia gisela trujillo": "Nidia Gisela García Trujillo",
  "angie bostal": "Maria de los Angeles Bostal",
  "angeles bostal": "Maria de los Angeles Bostal",
  "cons becerril": "Consuelo Becerril",
  "veronica flores": "Alma Veronica Flores Guzman",
  "joel martinez rodeiguez": "Joel Martínez Rodríguez",
  "cons ramirez": "Consuelo Ramírez",
};

/* ------------------------------------------------------------------ */
/* Asesores dados de baja — ya no aparecen en el dashboard             */
/* Para dar de baja a alguien: agregar su nombre a esta lista.         */
/* Para reactivarlo: quitarlo de aquí. No hay que tocar nada más.      */
/* ------------------------------------------------------------------ */
const ASESORES_BAJA = [
  "Lorena Payan",
  "Ana Escamilla",
  "Marilú Jasso Reinoso",
  "Norma Janet Canaan Enciso",
  "Adriana Cedillo",
  "Eduardo Franco Navarro",
  "Lourdes Rodríguez Bautista",
  "Joel Martínez Rodríguez",
  "Lucía Calderón",
  "Susana Ávila Basalrúa",
  "Luis Eduardo Duval de las Casas",
  "Ivette Camacho",
  "Susana Cruz",
  "Lizbeth Pérez",
  "Consuelo Ramírez",
  "Consuelo Becerril",
  "Oswaldo Sánchez",
];

/** true  = sus operaciones ya cerradas siguen sumando a los totales de la oficina
 *  false = desaparecen también de los totales, como si nunca hubieran estado */
const BAJAS_CUENTAN_EN_TOTALES = true;

const BAJA_KEYS = new Set(ASESORES_BAJA.map(strip));
/** Compara por tokens para aguantar variantes de escritura del mismo nombre. */
const esBaja = (nombre) => {
  const key = strip(nombre);
  if (BAJA_KEYS.has(key)) return true;
  const toks = key.split(" ").filter((t) => t.length > 2);
  if (!toks.length) return false;
  return [...BAJA_KEYS].some((b) => {
    const btoks = b.split(" ").filter((t) => t.length > 2);
    const comunes = btoks.filter((t) => toks.includes(t)).length;
    return comunes >= 2 || (btoks.length === 2 && comunes === 2);
  });
};

function resolveAdvisor(raw) {
  const key = strip(raw);
  if (!key || ["n/a", "-", "na"].includes(key)) return null;
  if (ALIAS[key]) {
    const canonKey = strip(ALIAS[key]);
    return rosterSet.get(canonKey) ?? ALIAS[key];
  }
  if (rosterSet.has(key)) return rosterSet.get(key);
  // Coincidencia por tokens: todos los tokens del nombre corto están en el nombre completo
  const tokens = key.split(" ").filter((t) => t.length > 1);
  const hits = [...rosterSet.entries()].filter(([full]) => tokens.every((t) => full.split(" ").includes(t)));
  if (hits.length === 1) return hits[0][1];
  return null; // no está en roster
}

/* ------------------------------------------------------------------ */
/* 2) APARTADO — hoja maestra CIERRES                                  */
/* ------------------------------------------------------------------ */
const wbAp = XLSX.read(readFileSync(APARTADO_PATH), { cellDates: true });
const wsC = wbAp.Sheets["CIERRES"] ?? wbAp.Sheets[wbAp.SheetNames[0]];
const rawOps = XLSX.utils.sheet_to_json(wsC, { header: 1, range: 1, blankrows: false, defval: null });

const COL = { fechaApartado: 0, montoApartado: 1, operacion: 2, tipo: 3, asesor1: 8, asesor2: 11, comTotal: 20, propiedad: 22, comOficina: 23, comAsesor: 24, estatus: 25, fechaFirma: 26, fechaOperacion: 27, pagado: 28 };

let ops = [];
rawOps.forEach((r, i) => {
  const rowNum = i + 2;
  const asesorRaw = r[COL.asesor1];
  const fApartado = parseFecha(r[COL.fechaApartado]);
  if (!asesorRaw && !fApartado) return;

  const estatusRaw = strip(r[COL.estatus]);
  const estatus = estatusRaw.includes("cerrada") ? "CERRADA" : estatusRaw.includes("abierta") ? "ABIERTA" : estatusRaw.includes("cayo") ? "SE_CAYO" : "OTRO";
  if (estatus === "OTRO" && estatusRaw) validation.advertencias.push(`Fila ${rowNum}: estatus no reconocido "${r[COL.estatus]}"`);

  const pagadoRaw = strip(r[COL.pagado]);
  const pagado = pagadoRaw === "si" ? "SI" : pagadoRaw === "no" ? "NO" : "SIN_REGISTRO";

  let fCierre = parseFecha(r[COL.fechaOperacion]);
  const cierreDirecto = !!fCierre;
  let fuenteCierre = "FECHA OPERACION";
  if (!fCierre && estatus === "CERRADA") {
    fCierre = parseFecha(r[COL.fechaFirma]) ?? fApartado;
    fuenteCierre = parseFecha(r[COL.fechaFirma]) ? "FECHA FIRMA (fallback)" : "FECHA APARTADO (fallback)";
    if (fCierre) validation.fechasCorregidas.push(`Fila ${rowNum} (${asesorRaw}): CERRADA sin fecha de operación válida — se usó ${fuenteCierre}: ${fCierre.y}-${String(fCierre.m).padStart(2, "0")}`);
  }

  const asesorCanon = resolveAdvisor(asesorRaw);
  const asesorFinal = asesorCanon ?? String(asesorRaw ?? "").replace(/\s+/g, " ").trim();
  if (!asesorCanon && asesorFinal) validation.asesoresFueraDeRoster.push(`Fila ${rowNum}: "${asesorFinal}" no está en el roster de OPCIONES (se incluye como asesor independiente)`);
  else if (asesorCanon && strip(asesorRaw) !== strip(asesorCanon)) validation.nombresNormalizados.push(`"${String(asesorRaw).trim()}" → "${asesorCanon}"`);

  ops.push({
    fila: rowNum,
    asesor: asesorFinal,
    asesor2Raw: r[COL.asesor2] ?? null,
    comTotal: num(r[COL.comTotal]),
    esCredito2: false,
    tipo: strip(r[COL.tipo]) === "renta" ? "RENTA" : "VENTA",
    montoOperacion: num(r[COL.operacion]),
    propiedad: String(r[COL.propiedad] ?? "").trim(),
    comOficina: num(r[COL.comOficina]),
    comAsesor: num(r[COL.comAsesor]),
    estatus, pagado, cierreDirecto,
    apartadoY: fApartado?.y ?? null, apartadoM: fApartado?.m ?? null,
    cierreY: fCierre?.y ?? null, cierreM: fCierre?.m ?? null,
  });
});

/* Deduplicación (dos pasadas): misma fecha de apartado + asesor + propiedad + comisiones.
   Se conserva la fila más completa: fecha de operación directa > pagado SI > primera. */
const score = (o) => (o.cierreDirecto ? 2 : 0) + (o.pagado === "SI" ? 1 : 0);
const grupos = new Map();
for (const op of ops) {
  const key = [op.apartadoY, op.apartadoM, strip(op.asesor), strip(op.propiedad).slice(0, 40), op.comOficina, op.comAsesor].join("|");
  if (!grupos.has(key)) grupos.set(key, []);
  grupos.get(key).push(op);
}
ops = [];
for (const grupo of grupos.values()) {
  const keep = grupo.reduce((best, o) => (score(o) > score(best) ? o : best), grupo[0]);
  if (grupo.length > 1) {
    validation.duplicadosEliminados.push(`Filas ${grupo.map((g) => g.fila).join(" y ")} (${keep.asesor}, ${keep.propiedad.slice(0, 40)}…): registro duplicado — se conservó la fila ${keep.fila}`);
  }
  ops.push(keep);
}

/* ------------------------------------------------------------------ */
/* 2.a) ASESOR 2 de la oficina — operaciones compartidas internamente   */
/*                                                                      */
/* Cuando en la columna ASESOR 2 va un asesor de RE/MAX Terra (se marca  */
/* escribiendo "Remax Terra" junto al nombre), esa operación también es  */
/* suya. Se le genera un registro de crédito con lo que le toca:         */
/*   COMISION TOTAL − COMISION OFICINA − COMISION ASESOR                 */
/* La comisión de oficina va en 0 para no contarla dos veces, y el       */
/* crédito no cuenta como apartado ni infla el total de operaciones.     */
/* No se genera si la operación ya trae su propia fila para ese asesor.  */
/* ------------------------------------------------------------------ */
const marcaTerra = (s) => /re\/?max\s+terra/.test(strip(s));
const OTRAS_OFICINAS = /remax\s+(arcos|si|premier|elite|capital|pro)\b/;

/** Devuelve el asesor interno que va en ASESOR 2, o null si es externo. */
function asesor2Interno(raw) {
  if (!raw) return null;
  const s = strip(raw);
  if (["", "-", "n/a", "na"].includes(s)) return null;
  const limpio = String(raw).replace(/re\/?max\s+terra/gi, "").replace(/\s+/g, " ").trim();
  if (!marcaTerra(raw) && OTRAS_OFICINAS.test(s)) return null; // otra oficina RE/MAX
  const canon = resolveAdvisor(limpio);
  if (canon) return canon;
  // Va marcado como Terra pero no aparece en el roster de OPCIONES
  // (pasa con la Broker y con quien no captura actividad): se respeta el nombre.
  if (marcaTerra(raw)) {
    validation.advertencias.push(`"${limpio}" viene marcado como Remax Terra en ASESOR 2 pero no está en el roster de OPCIONES — se le acredita igual`);
    return limpio;
  }
  return null;
}

const claveOperacion = (o) => [o.apartadoY, o.apartadoM, strip(o.propiedad).slice(0, 40), o.montoOperacion].join("|");
const yaTieneFila = new Set(ops.map((o) => `${claveOperacion(o)}::${strip(o.asesor)}`));
const creditos = [];

for (const o of ops) {
  if (o.estatus !== "CERRADA" && o.estatus !== "ABIERTA") continue;
  const a2 = asesor2Interno(o.asesor2Raw);
  if (!a2 || strip(a2) === strip(o.asesor)) continue;
  if (yaTieneFila.has(`${claveOperacion(o)}::${strip(a2)}`)) continue; // ya viene en dos filas
  const residual = Math.max(0, +(o.comTotal - o.comOficina - o.comAsesor).toFixed(2));
  creditos.push({
    ...o,
    asesor: a2,
    asesor2Raw: o.asesor,
    comOficina: 0,
    comAsesor: residual,
    esCredito2: true,
    filaOrigen: o.fila,
    apartadoY: null, apartadoM: null, // el apartado ya se contó en la fila original
  });
  yaTieneFila.add(`${claveOperacion(o)}::${strip(a2)}`);
  validation.nombresNormalizados.push(`Fila ${o.fila}: se acreditó a "${a2}" como ASESOR 2 de la oficina ($${residual.toLocaleString()})`);
}
ops.push(...creditos);
validation.advertencias.push(`Operaciones compartidas con un asesor de la oficina en ASESOR 2: ${creditos.length} créditos generados`);

/* ------------------------------------------------------------------ */
/* 2.b) MEMBRESIAS — fecha de ingreso (columna "Fecha Sir") por asesor   */
/*      De aquí sale la antigüedad para la meta individual escalonada.   */
/* ------------------------------------------------------------------ */
const MESES_CAPACITACION = 2;
/** Tabla de tarifa mensual por tramo de antigüedad (meses activos). */
const TABLA_META = [
  { hasta: 3, monto: 3000 },
  { hasta: 6, monto: 5000 },
  { hasta: 9, monto: 8000 },
  { hasta: 12, monto: 12000 },
  { hasta: 18, monto: 16000 },
  { hasta: Infinity, monto: 20000 },
];
const tarifaMes = (m) => TABLA_META.find((t) => m <= t.hasta).monto;
/** Meta acumulada: suma la tarifa de cada mes activo, de 1 a N. */
function metaAcumulada(mesesActivos) {
  let total = 0;
  for (let m = 1; m <= mesesActivos; m++) total += tarifaMes(m);
  return total;
}

const fechaSirPorAsesor = new Map(); // strip(nombre canónico) -> {y, m}
if (MEMBRESIAS_PATH) {
  validation.archivos.membresias = MEMBRESIAS_PATH.split("/").pop();
  const wbMem = XLSX.read(readFileSync(MEMBRESIAS_PATH), { cellDates: true });
  // Fuente de la fecha de ingreso, en orden de prioridad:
  //  1) Hoja "Antiguedad" (columnas NOMBRE | Ingreso Terra | Antiguedad): es la
  //     que la oficina mantiene revisada.
  //  2) Hoja de registro de membresías del año (columna D "Fecha Sir"), solo
  //     para quien no aparezca en la hoja de antigüedad.
  // Los nombres de las hojas se buscan sin importar mayúsculas ni sufijos
  // ("REGISTRO MEMBRESIAS 2026 RO", "Registro de pagos 2026", etc.).
  const hojaPor = (fn) => wbMem.SheetNames.find((n) => fn(strip(n)));
  const hojaAntig = hojaPor((n) => n.startsWith("antiguedad"));
  const hojaRegistro =
    hojaPor((n) => n.includes("membresias") && n.includes(String(YEAR))) ??
    hojaPor((n) => n.includes("registro") && n.includes(String(YEAR)));
  const memList = [];
  const yaEsta = new Set();
  const agregar = (nombre, fecha) => {
    const fSir = parseFecha(fecha);
    if (!nombre || !fSir) return;
    const key = strip(nombre);
    if (yaEsta.has(key)) return;
    yaEsta.add(key);
    memList.push({ tokens: key.split(" ").filter((t) => t.length > 1), fSir, nombre: String(nombre).trim() });
  };
  if (hojaAntig) {
    const filas = XLSX.utils.sheet_to_json(wbMem.Sheets[hojaAntig], { header: 1, blankrows: false, defval: null });
    const ini = filas.findIndex((r) => strip(r[0]) === "nombre");
    filas.slice(ini + 1).forEach((r) => agregar(r[0], r[1]));
    validation.archivos.membresiasHoja = hojaAntig;
  }
  if (hojaRegistro) {
    const filas = XLSX.utils.sheet_to_json(wbMem.Sheets[hojaRegistro], { header: 1, blankrows: false, defval: null });
    const ini = filas.findIndex((r) => strip(r[1]) === "nombre");
    filas.slice(ini + 1).forEach((r) => agregar(r[1], r[3]));
  }
  if (!memList.length) {
    validation.advertencias.push(`El archivo de membresías no trae hoja "Antiguedad" ni registro ${YEAR} con fechas — antigüedad no calculada`);
  }
  // Asignar la Fecha Sir a cada asesor del roster por coincidencia de tokens
  // (subconjunto: todos los tokens del nombre de membresía están en el nombre canónico).
  const asignar = (canon) => {
    if (esBaja(canon)) return; // las bajas no necesitan fecha de ingreso
    const ctoks = strip(canon).split(" ").filter((t) => t.length > 1);
    let mejor = null, mejorScore = 0;
    for (const m of memList) {
      const overlap = m.tokens.filter((t) => ctoks.includes(t)).length;
      const subset = m.tokens.every((t) => ctoks.includes(t));
      if (subset && overlap > mejorScore) { mejor = m; mejorScore = overlap; }
    }
    if (mejor) fechaSirPorAsesor.set(strip(canon), mejor.fSir);
    else validation.advertencias.push(`Sin fecha de ingreso (Fecha Sir) para "${canon}" en el archivo de membresías — meta individual no calculada`);
  };
  [...rosterSet.values()].forEach(asignar);
  Object.values(ALIAS).forEach((v) => { if (!fechaSirPorAsesor.has(strip(v))) asignar(v); });

  // Correcciones manuales de Fecha Sir (errores de captura en el archivo de membresías)
  const CORRECCIONES_FECHA_SIR = [
    { nombre: "Christian Díaz Padilla", y: 2025, m: 3, motivo: "el archivo indica 2024; ingreso real 2025" },
  ];
  for (const c of CORRECCIONES_FECHA_SIR) {
    const key = strip(c.nombre);
    if (fechaSirPorAsesor.has(key)) {
      fechaSirPorAsesor.set(key, { y: c.y, m: c.m });
      validation.fechasCorregidas.push(`Fecha Sir de ${c.nombre}: corregida a ${c.y}-${String(c.m).padStart(2, "0")} (${c.motivo})`);
    }
  }
} else {
  validation.advertencias.push("No se encontró el archivo de membresías en /data — las metas individuales por antigüedad no se calcularon");
}

/* ------------------------------------------------------------------ */
/* 3) Detección automática de mes actual / anterior                     */
/* ------------------------------------------------------------------ */
const mesesConDatos = new Set(monthSheets.map((s) => s.month));
ops.forEach((o) => { if (o.cierreY === YEAR) mesesConDatos.add(o.cierreM); if (o.apartadoY === YEAR) mesesConDatos.add(o.apartadoM); });
const currentMonth = Math.max(...mesesConDatos);
const previousMonth = currentMonth > 1 ? currentMonth - 1 : null;

/* ------------------------------------------------------------------ */
/* 4) Agregación por asesor                                            */
/* ------------------------------------------------------------------ */
const META_ANIO = 360000; // meta individual anual (X+Y), 1 ene – 31 dic
const advisorNames = new Set([...rosterSet.values()]);
ops.forEach((o) => { if (o.asesor) advisorNames.add(o.asesor); });

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

const advisors = [...advisorNames].sort((a, b) => strip(a).localeCompare(strip(b))).map((name) => {
  const act = { recorridos: emptyMonths(), opciones: emptyMonths(), opcionadas: emptyMonths(), opcionadasRenta: emptyMonths(), opcionadasVenta: emptyMonths(), leads: emptyMonths() };
  for (const [m, byAdv] of Object.entries(actividad)) {
    const row = byAdv[name];
    if (row) {
      act.recorridos[m - 1] = row.recorridos; act.opciones[m - 1] = row.opciones;
      act.opcionadas[m - 1] = row.opcionadas; act.opcionadasRenta[m - 1] = row.opcionadasRenta;
      act.opcionadasVenta[m - 1] = row.opcionadasVenta; act.leads[m - 1] = row.leads;
    }
  }
  const myOps = ops.filter((o) => o.asesor === name);
  const cierres2026 = myOps.filter((o) => o.estatus === "CERRADA" && o.cierreY === YEAR);
  const apartados2026 = myOps.filter((o) => o.apartadoY === YEAR);
  const pendientes = myOps.filter((o) => o.estatus === "ABIERTA");
  const porCobrar = cierres2026.filter((o) => o.pagado !== "SI");

  const cierresMes = emptyMonths(), apartadosMes = emptyMonths(), comOficinaMes = emptyMonths(), comAsesorMes = emptyMonths();
  const cierresPropiosMes = emptyMonths(); // sin los créditos por ir en ASESOR 2 (para no contar la operación dos veces)
  cierres2026.forEach((o) => {
    cierresMes[o.cierreM - 1]++;
    if (!o.esCredito2) cierresPropiosMes[o.cierreM - 1]++;
    comOficinaMes[o.cierreM - 1] += o.comOficina; comAsesorMes[o.cierreM - 1] += o.comAsesor;
  });
  apartados2026.forEach((o) => apartadosMes[o.apartadoM - 1]++);

  const comOficina = comOficinaMes.reduce((a, b) => a + b, 0);
  const comAsesor = comAsesorMes.reduce((a, b) => a + b, 0);
  const enRoster = rosterSet.has(strip(name)) || Object.values(ALIAS).some((v) => strip(v) === strip(name));

  // Antigüedad → meta escalonada esperada (aporte al cohorte, se mide contra columna Y)
  const fSir = fechaSirPorAsesor.get(strip(name)) ?? null;
  let mesesAntiguedad = 0;
  let metaAntiguedad = null; // lo que ESTE asesor debería llevar acumulado (columna Y)
  let tarifaMesActual = 0;   // su aporte mensual del mes en curso
  if (fSir) {
    const bruto = (YEAR - fSir.y) * 12 + (currentMonth - fSir.m);
    mesesAntiguedad = Math.max(0, bruto - MESES_CAPACITACION);
    metaAntiguedad = metaAcumulada(mesesAntiguedad);
    tarifaMesActual = mesesAntiguedad > 0 ? tarifaMes(mesesAntiguedad) : 0;
  }
  // Grupo de antigüedad con el mismo criterio de la hoja "Antiguedad":
  // años calendario desde el ingreso (2024 → 2 años, 2025 → 1 año, 2026 → menos de 1 año).
  const aniosAntiguedad = fSir ? Math.max(0, YEAR - fSir.y) : null;
  // Meses reales desde el ingreso (sin descontar capacitación), para mostrar.
  const mesesDesdeIngreso = fSir ? Math.max(0, (YEAR - fSir.y) * 12 + (currentMonth - fSir.m)) : null;
  const enMesActual = !!actividad[currentMonth]?.[name];
  const con2026 = cierres2026.length + apartados2026.length + pendientes.length + act.recorridos.reduce((a, b) => a + b, 0) + act.opciones.reduce((a, b) => a + b, 0) + act.opcionadas.reduce((a, b) => a + b, 0) > 0;

  return {
    nombre: name,
    enRoster,
    activo: enMesActual || con2026,
    fechaSir: fSir ? `${fSir.y}-${String(fSir.m).padStart(2, "0")}` : null,
    aniosAntiguedad,
    mesesDesdeIngreso,
    mesesAntiguedad,
    metaAntiguedad,        // esperado acumulado en columna Y según antigüedad
    tarifaMesActual,       // aporte mensual del mes en curso
    metaAnio: META_ANIO,   // meta individual $360,000 (X+Y), año calendario
    actividad: act,
    cierresMes, apartadosMes, comOficinaMes, comAsesorMes, cierresPropiosMes,
    totales: {
      cierresPropios: cierres2026.filter((o) => !o.esCredito2).length,
      creditosCompartidos: cierres2026.filter((o) => o.esCredito2).length,
      pendientesPropios: pendientes.filter((o) => !o.esCredito2).length,
      recorridos: act.recorridos.reduce((a, b) => a + b, 0),
      opciones: act.opciones.reduce((a, b) => a + b, 0),
      opcionadas: act.opcionadas.reduce((a, b) => a + b, 0),
      opcionadasRenta: act.opcionadasRenta.reduce((a, b) => a + b, 0),
      opcionadasVenta: act.opcionadasVenta.reduce((a, b) => a + b, 0),
      leads: act.leads.reduce((a, b) => a + b, 0),
      cierres: cierres2026.length,
      apartados: apartados2026.length,
      pendientes: pendientes.length,
      porCobrar: porCobrar.length,
      comOficina, comAsesor, comTotal: comOficina + comAsesor,
    },
    operacionesPendientes: pendientes.map((o) => ({ propiedad: o.propiedad, tipo: o.tipo, monto: o.montoOperacion, comEsperada: o.comOficina + o.comAsesor, apartadoM: o.apartadoM, apartadoY: o.apartadoY })),
    cierresDetalle: cierres2026.map((o) => ({ propiedad: o.propiedad, tipo: o.tipo, monto: o.montoOperacion, comOficina: o.comOficina, comAsesor: o.comAsesor, mes: o.cierreM, pagado: o.pagado, apartadoM: o.apartadoM, apartadoY: o.apartadoY })),
  };
});

/* ------------------------------------------------------------------ */
/* 5) Totales globales                                                 */
/* ------------------------------------------------------------------ */
const advisorsBaja = advisors.filter((a) => esBaja(a.nombre));
const advisorsVigentes = advisors.filter((a) => !esBaja(a.nombre));
const advisorsTotales = BAJAS_CUENTAN_EN_TOTALES ? advisors : advisorsVigentes;

advisorsBaja.forEach((a) => validation.advertencias.push(
  `Asesor dado de baja: "${a.nombre}" — fuera del dashboard` +
  (a.totales.cierres ? ` (tenía ${a.totales.cierres} cierre(s) ${YEAR} por $${(a.totales.comAsesor).toLocaleString()}, ${BAJAS_CUENTAN_EN_TOTALES ? "siguen contando" : "ya no cuentan"} en los totales de la oficina)` : "")
));

const sumBy = (fn) => advisorsTotales.reduce((a, x) => a + fn(x), 0);
const sumMonths = (pick) => Array.from({ length: 12 }, (_, i) => advisorsTotales.reduce((a, x) => a + pick(x)[i], 0));

const cierres2026All = ops.filter((o) => o.estatus === "CERRADA" && o.cierreY === YEAR && !o.esCredito2
  && (BAJAS_CUENTAN_EN_TOTALES || !esBaja(o.asesor)));
const totals = {
  recorridos: sumBy((a) => a.totales.recorridos),
  opciones: sumBy((a) => a.totales.opciones),
  opcionadas: sumBy((a) => a.totales.opcionadas),
  opcionadasRenta: sumBy((a) => a.totales.opcionadasRenta),
  opcionadasVenta: sumBy((a) => a.totales.opcionadasVenta),
  leads: sumBy((a) => a.totales.leads),
  apartados: sumBy((a) => a.totales.apartados),
  cierres: sumBy((a) => a.totales.cierresPropios),      // operaciones, no créditos
  creditosCompartidos: sumBy((a) => a.totales.creditosCompartidos),
  pendientes: sumBy((a) => a.totales.pendientesPropios),
  porCobrar: sumBy((a) => a.totales.porCobrar),
  comOficina: sumBy((a) => a.totales.comOficina),
  comAsesor: sumBy((a) => a.totales.comAsesor),
  comTotal: sumBy((a) => a.totales.comTotal),
  cierresPagados: cierres2026All.filter((o) => o.pagado === "SI").length,
  ticketPromedio: cierres2026All.length ? sumBy((a) => a.totales.comTotal) / cierres2026All.length : 0,
  series: {
    recorridos: sumMonths((a) => a.actividad.recorridos),
    opciones: sumMonths((a) => a.actividad.opciones),
    opcionadas: sumMonths((a) => a.actividad.opcionadas),
    leads: sumMonths((a) => a.actividad.leads),
    apartados: sumMonths((a) => a.apartadosMes),
    cierres: sumMonths((a) => a.cierresPropiosMes),
    comOficina: sumMonths((a) => a.comOficinaMes),
    comAsesor: sumMonths((a) => a.comAsesorMes),
  },
};

const excluidos = advisorsVigentes.filter((a) => !a.enRoster && !a.activo);
excluidos.forEach((a) => validation.advertencias.push(`Asesor externo "${a.nombre}" sin actividad ${YEAR} (solo operaciones de años anteriores) — excluido del dashboard`));
const advisorsFinal = advisorsVigentes.filter((a) => !excluidos.includes(a));

// Desglose del cohorte (meta escalonada por antigüedad, medida vs columna Y)
const cohorte = {
  metaMensual: advisorsFinal.reduce((a, x) => a + (x.tarifaMesActual || 0), 0), // lo que el grupo debe generar este mes
  esperadoAcumulado: advisorsFinal.reduce((a, x) => a + (x.metaAntiguedad || 0), 0), // lo que deberían llevar a la fecha
  realAcumulado: advisorsFinal.reduce((a, x) => a + x.totales.comAsesor, 0), // lo que llevan (columna Y)
  asesoresConMeta: advisorsFinal.filter((x) => x.metaAntiguedad != null && x.metaAntiguedad > 0).length,
};
cohorte.diferencia = cohorte.realAcumulado - cohorte.esperadoAcumulado;
cohorte.avancePct = cohorte.esperadoAcumulado > 0 ? (cohorte.realAcumulado / cohorte.esperadoAcumulado) * 100 : 0;

/* ------------------------------------------------------------------ */
/* 6) Leads — acumulado del último cuatrimestre                        */
/*    Son los 4 meses COMPLETOS anteriores al mes en curso.            */
/*    El mes en curso va aparte porque todavía no termina.             */
/* ------------------------------------------------------------------ */
const mesEnCursoIncompleto = currentMonth;
const mesesCuatrimestre = [];
for (let m = mesEnCursoIncompleto - 4; m < mesEnCursoIncompleto; m++) if (m >= 1) mesesCuatrimestre.push(m);

const leadsDe = (adv, m) => adv.actividad.leads[m - 1] || 0;
const filasCuatrimestre = advisorsFinal
  .map((a) => {
    const meses = mesesCuatrimestre.map((m) => leadsDe(a, m));
    const total = meses.reduce((x, y) => x + y, 0);
    return {
      nombre: a.nombre,
      meses,
      total,
      promedio: mesesCuatrimestre.length ? +(total / mesesCuatrimestre.length).toFixed(1) : 0,
      mesEnCurso: leadsDe(a, mesEnCursoIncompleto),
    };
  })
  .sort((a, b) => b.total - a.total);

const totalCuatrimestre = filasCuatrimestre.reduce((a, x) => a + x.total, 0);
const leadsCuatrimestre = {
  meses: mesesCuatrimestre,
  etiquetas: mesesCuatrimestre.map((m) => MESES[m - 1]),
  total: totalCuatrimestre,
  promedioMensual: mesesCuatrimestre.length ? +(totalCuatrimestre / mesesCuatrimestre.length).toFixed(1) : 0,
  totalPorMes: mesesCuatrimestre.map((m) => filasCuatrimestre.reduce((a, x) => a + x.meses[mesesCuatrimestre.indexOf(m)], 0)),
  mesEnCurso: {
    mes: mesEnCursoIncompleto,
    etiqueta: MESES[mesEnCursoIncompleto - 1],
    total: filasCuatrimestre.reduce((a, x) => a + x.mesEnCurso, 0),
    incompleto: true,
  },
  porAsesor: filasCuatrimestre,
};

const dashboard = {
  year: YEAR,
  cohorte,
  leadsCuatrimestre,
  currentMonth, previousMonth,
  mesesDisponibles: [...mesesConDatos].sort((a, b) => a - b),
  generadoEl: new Date().toISOString(),
  advisors: advisorsFinal, totals,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "dashboard.json"), JSON.stringify(dashboard));
writeFileSync(join(OUT_DIR, "validation.json"), JSON.stringify(validation, null, 2));

console.log(`✔ Datos generados: ${advisorsFinal.length} asesores | mes actual: ${MESES[currentMonth - 1]} ${YEAR}`);
console.log(`  Cierres ${YEAR}: ${totals.cierres} | Apartados: ${totals.apartados} | Pendientes: ${totals.pendientes}`);
console.log(`  Comisión Oficina: $${totals.comOficina.toLocaleString()} | Comisión Asesor: $${totals.comAsesor.toLocaleString()}`);
console.log(`  Duplicados eliminados: ${validation.duplicadosEliminados.length} | Fechas corregidas: ${validation.fechasCorregidas.length} | Nombres normalizados: ${new Set(validation.nombresNormalizados).size}`);

import dashboard from "../generated/dashboard.json";

/**
 * Acumulado de leads del último cuatrimestre — ficha individual del asesor.
 * Va debajo de "LEADS RECIBIDOS POR MES".
 *
 * Son los cuatro meses completos anteriores al mes en curso. El mes en curso
 * se muestra aparte porque todavía no termina.
 * Los datos salen de dashboard.leadsCuatrimestre (ver scripts/build-data.mjs).
 */

type Props = {
  /** Nombre canónico del asesor, tal como viene en dashboard.advisors[].nombre */
  nombre: string;
};

const ABREV: Record<string, string> = {
  enero: "ENE", febrero: "FEB", marzo: "MAR", abril: "ABR",
  mayo: "MAY", junio: "JUN", julio: "JUL", agosto: "AGO",
  septiembre: "SEP", octubre: "OCT", noviembre: "NOV", diciembre: "DIC",
};

const strip = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const nf = new Intl.NumberFormat("es-MX");

function Tile({
  valor,
  etiqueta,
  destacado = false,
}: {
  valor: number;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={
        destacado
          ? "rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-200"
          : "rounded-lg bg-slate-50 px-4 py-3"
      }
    >
      <div
        className={
          destacado
            ? "text-2xl font-bold tabular-nums text-blue-900"
            : "text-2xl font-bold tabular-nums text-slate-900"
        }
      >
        {nf.format(valor)}
      </div>
      <div className="mt-0.5 text-[11px] tracking-wide text-slate-500">{etiqueta}</div>
    </div>
  );
}

export default function LeadsCuatrimestreAsesor({ nombre }: Props) {
  const c = (dashboard as any).leadsCuatrimestre;
  if (!c?.porAsesor?.length) return null;

  const fila = c.porAsesor.find((f: any) => strip(f.nombre) === strip(nombre));
  if (!fila) return null;

  const abrev = (m: string) => ABREV[m] ?? m.slice(0, 3).toUpperCase();
  const rango = `${abrev(c.etiquetas[0])} – ${abrev(c.etiquetas[c.etiquetas.length - 1])}`;
  const promedioOficina = c.porAsesor.length
    ? c.total / c.porAsesor.length / c.meses.length
    : 0;
  const dif = fila.promedio - promedioOficina;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-slate-700">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M3 17V9m6 8V5m6 12v-6m6 6V7" strokeLinecap="round" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Acumulado último cuatrimestre
        </h3>
        <span className="text-xs text-slate-400">{rango}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {fila.meses.map((v: number, i: number) => (
          <Tile key={c.etiquetas[i]} valor={v} etiqueta={abrev(c.etiquetas[i])} />
        ))}
        <Tile valor={fila.total} etiqueta="CUATRIMESTRE" destacado />
        <Tile
          valor={fila.mesEnCurso}
          etiqueta={`${abrev(c.mesEnCurso.etiqueta)} (EN CURSO)`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
        <span>
          Promedio mensual{" "}
          <strong className="tabular-nums text-slate-900">{fila.promedio}</strong>
        </span>
        <span className={dif >= 0 ? "text-emerald-600" : "text-red-600"}>
          {dif >= 0 ? "↗" : "↘"} {Math.abs(dif).toFixed(1)} vs promedio de la oficina
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {abrev(c.mesEnCurso.etiqueta)} va aparte porque el mes todavía no termina.
      </p>
    </div>
  );
}

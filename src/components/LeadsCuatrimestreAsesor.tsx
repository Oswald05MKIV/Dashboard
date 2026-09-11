import { Inbox } from "lucide-react";
import { fNum } from "../lib/metrics";
import { leadsCuatrimestre, leadsCuatrimestreDe, promedioOficinaCuatrimestre } from "../lib/leadsCuatrimestre";
import { Card } from "./ui";

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

export const abrevMes = (m: string) => ABREV[m.toLowerCase()] ?? m.slice(0, 3).toUpperCase();

function Tile({ valor, etiqueta, destacado = false }: { valor: number; etiqueta: string; destacado?: boolean }) {
  return (
    <div className="mini-stat" style={destacado ? { background: "var(--info-bg)" } : undefined}>
      <div className="v num" style={destacado ? { color: "var(--rx-blue)" } : undefined}>{fNum(valor)}</div>
      <div className="l">{etiqueta}</div>
    </div>
  );
}

export default function LeadsCuatrimestreAsesor({ nombre }: Props) {
  const c = leadsCuatrimestre();
  const fila = leadsCuatrimestreDe(nombre);
  if (!c || !fila) return null;

  const rango = `${abrevMes(c.etiquetas[0])} – ${abrevMes(c.etiquetas[c.etiquetas.length - 1])}`;
  const dif = fila.promedio - promedioOficinaCuatrimestre();

  // Trae su propio `section` para no dejar un hueco cuando no hay datos y no se pinta.
  return (
    <div className="section">
    <Card title={`Acumulado último cuatrimestre · ${rango}`} icon={<Inbox size={14} />}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
        {fila.meses.map((v, i) => (
          <Tile key={c.etiquetas[i]} valor={v} etiqueta={abrevMes(c.etiquetas[i])} />
        ))}
        <Tile valor={fila.total} etiqueta="Cuatrimestre" destacado />
        <Tile valor={fila.mesEnCurso} etiqueta={`${abrevMes(c.mesEnCurso.etiqueta)} (en curso)`} />
      </div>

      <div className="pair-row" style={{ marginTop: 10 }}>
        <span className="k">Promedio mensual</span>
        <span className="v num">{fNum(fila.promedio)}</span>
      </div>
      <div className="pair-row">
        <span className="k">Contra el promedio de la oficina</span>
        <span className="v num" style={{ color: dif >= 0 ? "var(--ok)" : "var(--bad)" }}>
          {dif >= 0 ? "+" : "−"}{Math.abs(dif).toFixed(1)}
        </span>
      </div>

      <div className="kpi-sub" style={{ marginTop: 8 }}>
        {abrevMes(c.mesEnCurso.etiqueta)} va aparte porque el mes todavía no termina.
      </div>
    </Card>
    </div>
  );
}

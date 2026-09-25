import { Target, TrendingDown, TrendingUp, Users } from "lucide-react";
import type { DashboardData } from "../types";
import { META_ANUAL_ASESOR, MESES_LARGOS } from "../config";
import { fMoney, fPct, nivelSemaforo, safeDiv } from "../lib/metrics";
import { Avatar, Card, Kpi, MonthChip, PageHead, Progress, SemaforoBadge } from "../components/ui";
import { useRef } from "react";
import type { CSSProperties } from "react";
import { BotonCaptura, useAviso } from "../components/TopsJulio";

// Variables de color que usan el botón de captura y el aviso (.tt-cap / .tt-toast).
const VARS_CAPTURA = {
  "--tt-ink": "#0e1a2b",
  "--tt-line": "#e6eaf0",
  "--tt-surface": "#ffffff",
  "--tt-canvas": "#f6f8fb",
  "--tt-blue": "#003da5",
} as CSSProperties;

// Secciones por antigüedad, con el criterio de la hoja "Antiguedad" del archivo
// de membresías (años calendario desde el ingreso).
type ClaveGrupo = "2" | "1" | "0" | "sin";
const GRUPOS: { clave: ClaveGrupo; titulo: string; archivo: string }[] = [
  { clave: "2", titulo: "2 años o más", archivo: "2-anios" },
  { clave: "1", titulo: "1 año", archivo: "1-anio" },
  { clave: "0", titulo: "Menos de 1 año", archivo: "menos-1-anio" },
  { clave: "sin", titulo: "Sin fecha de ingreso", archivo: "sin-fecha" },
];
const grupoAntig = (anios: number | null | undefined): ClaveGrupo =>
  anios == null ? "sin" : anios >= 2 ? "2" : anios === 1 ? "1" : "0";

type FilaMeta = {
  a: DashboardData["advisors"][number];
  pctAnual: number;
  tieneAntig: boolean;
  pctAntig: number | null;
};

function TablaGrupo({
  titulo, archivo, corte, filas, onSelect, onAviso,
}: {
  titulo: string;
  archivo: string;
  corte: string;
  filas: FilaMeta[];
  onSelect: (n: string) => void;
  onAviso: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="section" ref={ref} style={VARS_CAPTURA}>
      <Card title={`Avance individual · Meta Anual · ${titulo}`} icon={<Users size={14} />}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="kpi-sub">
            {corte} · {filas.length} {filas.length === 1 ? "asesor" : "asesores"} · ordenado por color del cohorte, de mejor a peor
          </span>
          <BotonCaptura destino={ref} archivo={archivo} onAviso={onAviso} />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Asesor</th>
                <th className="r">Antigüedad</th>
                <th style={{ width: "40%" }}>Avance anual ({fMoney(META_ANUAL_ASESOR)})</th>
                <th>Cohorte</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ a, pctAnual, tieneAntig, pctAntig }) => {
                const meses = a.mesesDesdeIngreso ?? a.mesesAntiguedad;
                return (
                  <tr key={a.nombre} className="clickable" onClick={() => onSelect(a.nombre)}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Avatar nombre={a.nombre} />
                        <span style={{ fontWeight: 600 }}>{a.nombre}</span>
                      </span>
                    </td>
                    <td className="r num">{a.fechaSir ? `${meses} ${meses === 1 ? "mes" : "meses"}` : "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1 }}><Progress pct={pctAnual} /></div>
                        <span className="num" style={{ fontSize: 12, fontWeight: 600, minWidth: 42, textAlign: "right" }}>{pctAnual.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      {tieneAntig
                        ? <SemaforoBadge pct={pctAntig!} />
                        : <span className="badge neutral">{a.fechaSir ? "En capacitación" : "Sin fecha"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Metas({ data, onSelect }: { data: DashboardData; onSelect: (n: string) => void }) {
  const c = data.cohorte;
  const { aviso, mostrar } = useAviso();
  const mesCorte = MESES_LARGOS[data.currentMonth - 1];

  // Meta anual individual ($360,000 sobre X+Y)
  const lista = data.advisors
    .filter((a) => a.activo)
    .map((a) => ({
      a,
      pctAnual: safeDiv(a.totales.comTotal, META_ANUAL_ASESOR) * 100,
      tieneAntig: a.metaAntiguedad != null && a.metaAntiguedad > 0,
      pctAntig: a.metaAntiguedad ? safeDiv(a.totales.comAsesor, a.metaAntiguedad) * 100 : null,
    }))
    .sort((x, y) => y.pctAnual - x.pctAnual);

  // Orden de la tabla individual: por color del semáforo del cohorte
  // (verde → ámbar → rojo → sin meta de cohorte) y dentro de cada color
  // de mejor a peor porcentaje del cohorte.
  const ORDEN_COLOR = { ok: 0, warn: 1, bad: 2 } as const;
  const grupo = (x: (typeof lista)[number]) =>
    x.tieneAntig && x.pctAntig != null ? ORDEN_COLOR[nivelSemaforo(x.pctAntig)] : 3;
  const listaTabla = [...lista].sort((x, y) => {
    const g = grupo(x) - grupo(y);
    if (g !== 0) return g;
    const px = x.pctAntig ?? -1;
    const py = y.pctAntig ?? -1;
    if (py !== px) return py - px;
    return y.pctAnual - x.pctAnual;
  });

  const enMeta = lista.filter((x) => x.pctAnual >= 75).length;
  const enRiesgo = lista.filter((x) => x.pctAnual >= 50 && x.pctAnual < 75).length;
  const criticos = lista.filter((x) => x.pctAnual < 50).length;
  const alDia = c.realAcumulado >= c.esperadoAcumulado;

  return (
    <>
      <PageHead
        title="Metas"
        subtitle={`Dos metas: cohorte por antigüedad (columna Y) y meta anual individual de ${fMoney(META_ANUAL_ASESOR)} (X + Y)`}
        tools={<MonthChip current={data.currentMonth} previous={data.previousMonth} year={data.year} />}
      />

      {/* ---- Desglose del cohorte ---- */}
      <div className="grid kpi-grid section">
        <Kpi label="Meta mensual del cohorte" value={fMoney(c.metaMensual)} icon={<Target size={16} />} sub={<span>Suma de aportes de {MESES_LARGOS[data.currentMonth - 1]}</span>} />
        <Kpi label="Deberían llevar acumulado" value={fMoney(c.esperadoAcumulado)} icon={<Target size={16} />} sub={<span>Según antigüedad, a la fecha</span>} />
        <Kpi label="Llevan realmente (Y)" value={fMoney(c.realAcumulado)} icon={<Users size={16} />} sub={<span>Comisión asesor cerrada</span>} />
        <Kpi
          label="Diferencia"
          value={fMoney(c.diferencia)}
          icon={alDia ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          sub={<span style={{ color: alDia ? "var(--ok)" : "var(--bad)" }}>{alDia ? "Por encima de lo esperado" : "Por debajo de lo esperado"}</span>}
        />
      </div>

      <div className="section">
        <Card title="Cumplimiento del cohorte · meta escalonada por antigüedad (columna Y)" icon={<Target size={14} />} className="highlight-card">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="kpi-value num" style={{ fontSize: 26 }}>{fMoney(c.realAcumulado)}</div>
              <div className="kpi-sub">Comisión asesor acumulada (Y)</div>
            </div>
            <div>
              <div className="kpi-value num" style={{ fontSize: 19, color: "var(--text-2)" }}>{fMoney(c.esperadoAcumulado)}</div>
              <div className="kpi-sub">Meta esperada a la fecha</div>
            </div>
            <SemaforoBadge pct={c.avancePct} />
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
              <span className="badge ok"><span className="dot ok" /> {enMeta} en meta anual</span>
              <span className="badge warn"><span className="dot warn" /> {enRiesgo} en riesgo</span>
              <span className="badge bad"><span className="dot bad" /> {criticos} críticos</span>
            </div>
          </div>
          <Progress pct={c.avancePct} nivel={nivelSemaforo(c.avancePct)} />
          <div className="kpi-sub" style={{ marginTop: 8 }}>
            Avance {fPct(c.avancePct)} de lo que el cohorte debería llevar acumulado a {MESES_LARGOS[data.currentMonth - 1].toLowerCase()}. {c.asesoresConMeta} asesores con meta activa (fuera de capacitación).
          </div>
        </Card>
      </div>

      {/* ---- Tablas individuales por antigüedad: meta anual + % del cohorte ---- */}
      {GRUPOS.map((g) => {
        const filas = listaTabla.filter((x) => grupoAntig(x.a.aniosAntiguedad) === g.clave);
        if (!filas.length) return null;
        return (
          <TablaGrupo
            key={g.clave}
            titulo={g.titulo}
            archivo={`metas-anual-${g.archivo}-${mesCorte.toLowerCase()}-${data.year}`}
            corte={`Corte ${mesCorte.toLowerCase()} ${data.year}`}
            filas={filas}
            onSelect={onSelect}
            onAviso={mostrar}
          />
        );
      })}
      {aviso && <div className="tt-toast" style={VARS_CAPTURA}>{aviso}</div>}
    </>
  );
}

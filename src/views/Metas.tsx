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

export function Metas({ data, onSelect }: { data: DashboardData; onSelect: (n: string) => void }) {
  const c = data.cohorte;
  const refTabla = useRef<HTMLDivElement>(null);
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

      {/* ---- Tabla individual: meta anual + % del cohorte ---- */}
      <div className="section" ref={refTabla} style={VARS_CAPTURA}>
        <Card title="Avance individual · Meta Anual" icon={<Users size={14} />}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="kpi-sub">
              Corte {mesCorte.toLowerCase()} {data.year} · ordenado por color del cohorte, de mejor a peor
            </span>
            <BotonCaptura destino={refTabla} archivo={`metas-anual-${mesCorte.toLowerCase()}-${data.year}`} onAviso={mostrar} />
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
                {listaTabla.map(({ a, pctAnual, tieneAntig, pctAntig }) => (
                  <tr key={a.nombre} className="clickable" onClick={() => onSelect(a.nombre)}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Avatar nombre={a.nombre} />
                        <span style={{ fontWeight: 600 }}>{a.nombre}</span>
                      </span>
                    </td>
                    <td className="r num">{a.mesesAntiguedad} {a.mesesAntiguedad === 1 ? "mes" : "meses"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {aviso && <div className="tt-toast" style={VARS_CAPTURA}>{aviso}</div>}
    </>
  );
}

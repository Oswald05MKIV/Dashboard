import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Route,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Advisor, DashboardData } from "../types";
import { META_ANUAL_ASESOR, MESES_CORTOS, MESES_LARGOS } from "../config";
import { fMoney, fNum, nivelSemaforo, rankOf, safeDiv } from "../lib/metrics";
import { Avatar, Card, Delta, MonthChip, PageHead, Progress, SemaforoBadge } from "../components/ui";
import { BarrasMensuales } from "../components/charts";
import LeadsCuatrimestreAsesor from "../components/LeadsCuatrimestreAsesor";
import { leadsCuatrimestreDe } from "../lib/leadsCuatrimestre";

export function Asesores({ data, selected, onSelect, onBack }: {
  data: DashboardData;
  selected: string | null;
  onSelect: (nombre: string) => void;
  onBack: () => void;
}) {
  const advisor = selected ? data.advisors.find((a) => a.nombre === selected) : null;
  if (advisor) return <AsesorDetalle data={data} advisor={advisor} onBack={onBack} />;
  return <AsesoresGrid data={data} onSelect={onSelect} />;
}

function AsesoresGrid({ data, onSelect }: { data: DashboardData; onSelect: (n: string) => void }) {
  const [q, setQ] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const cm = data.currentMonth;

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return data.advisors
      .filter((a) => (verInactivos || a.activo) && norm(a.nombre).includes(norm(q)))
      .sort((a, b) => b.totales.comTotal - a.totales.comTotal || a.nombre.localeCompare(b.nombre));
  }, [data, q, verInactivos]);

  return (
    <>
      <PageHead
        title="Asesores"
        subtitle={`${data.advisors.filter((a) => a.activo).length} asesores activos · ordenados por producción anual`}
        tools={
          <>
            <label className="search">
              <Search size={15} />
              <input placeholder="Buscar asesor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar asesor" />
            </label>
            <div className="seg" role="group" aria-label="Filtro de actividad">
              <button className={!verInactivos ? "on" : ""} onClick={() => setVerInactivos(false)}>Activos</button>
              <button className={verInactivos ? "on" : ""} onClick={() => setVerInactivos(true)}>Todos</button>
            </div>
          </>
        }
      />
      <div className="grid adv-grid">
        {list.map((a) => {
          const metaPct = safeDiv(a.totales.comTotal, META_ANUAL_ASESOR) * 100;
          return (
            <div className="card adv-card" key={a.nombre} onClick={() => onSelect(a.nombre)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(a.nombre)}>
              <div className="adv-head">
                <Avatar nombre={a.nombre} muted={!a.activo} />
                <div style={{ minWidth: 0 }}>
                  <div className="adv-name">{a.nombre}</div>
                  <div className="adv-rank">
                    #{rankOf(data, a.nombre)} en producción{!a.activo && " · inactivo"}
                  </div>
                </div>
              </div>
              <div className="mini-stats">
                <div className="mini-stat"><div className="v num">{fNum(a.cierresMes[cm - 1])}</div><div className="l">Cierres {MESES_CORTOS[cm - 1]}</div></div>
                <div className="mini-stat"><div className="v num">{fNum(a.totales.cierres)}</div><div className="l">Cierres {data.year}</div></div>
                <div className="mini-stat"><div className="v num">{fNum(a.totales.pendientes)}</div><div className="l">Pendientes</div></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-3)", marginBottom: 5 }}>
                  <span>Meta anual · {fMoney(META_ANUAL_ASESOR)}</span>
                  <span className="num">{Math.round(metaPct)}%</span>
                </div>
                <Progress pct={metaPct} />
              </div>
            </div>
          );
        })}
        {!list.length && <div className="empty">Sin resultados para la búsqueda.</div>}
      </div>
    </>
  );
}

function AsesorDetalle({ data, advisor: a, onBack }: { data: DashboardData; advisor: Advisor; onBack: () => void }) {
  const cm = data.currentMonth;
  const pm = data.previousMonth;
  const ci = cm - 1;
  const pi = pm ? pm - 1 : null;

  // Meta anual individual: $360,000 (X + Y), año calendario
  const metaPct = safeDiv(a.totales.comTotal, META_ANUAL_ASESOR) * 100;
  const restante = Math.max(META_ANUAL_ASESOR - a.totales.comTotal, 0);
  // Meta del cohorte por antigüedad (columna Y)
  const tieneAntig = a.metaAntiguedad != null && a.metaAntiguedad > 0;
  const antigPct = tieneAntig ? safeDiv(a.totales.comAsesor, a.metaAntiguedad!) * 100 : 0;

  const parMes = (serie: number[]) => ({
    actual: serie[ci],
    anterior: pi !== null ? serie[pi] : 0,
  });

  const led = parMes(a.actividad.leads);
  const rec = parMes(a.actividad.recorridos);
  const opc = parMes(a.actividad.opciones);
  const opd = parMes(a.actividad.opcionadas);
  const cie = parMes(a.cierresMes);
  const cuatri = leadsCuatrimestreDe(a.nombre);

  return (
    <>
      <PageHead
        title={a.nombre}
        subtitle={`Ranking #${rankOf(data, a.nombre)} por producción anual${a.activo ? "" : " · sin actividad en el mes actual"}`}
        tools={
          <>
            <MonthChip current={cm} previous={pm} year={data.year} />
            <button className="back-btn" onClick={onBack}><ArrowLeft size={15} /> Todos los asesores</button>
          </>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Avatar nombre={a.nombre} lg />
        <SemaforoBadge pct={metaPct} />
        {a.totales.pendientes > 0 && (
          <span className="badge info"><Clock size={13} /> {a.totales.pendientes} operación{a.totales.pendientes > 1 ? "es" : ""} pendiente{a.totales.pendientes > 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="detail-grid section">
        <Card title="Leads recibidos" icon={<Inbox size={14} />}>
          <MesVsMes actual={led.actual} anterior={led.anterior} cm={cm} pm={pm} />
          <div className="pair-row" style={{ marginTop: 4 }}><span className="k">Total {data.year} (ene–{MESES_CORTOS[ci].toLowerCase()})</span><span className="v num">{fNum(a.totales.leads)}</span></div>
          {cuatri && <div className="pair-row"><span className="k">Último cuatrimestre</span><span className="v num">{fNum(cuatri.total)}</span></div>}
        </Card>
        <Card title="Recorridos" icon={<Route size={14} />}>
          <MesVsMes actual={rec.actual} anterior={rec.anterior} cm={cm} pm={pm} />
          <div className="pair-row" style={{ marginTop: 4 }}><span className="k">Total {data.year}</span><span className="v num">{fNum(a.totales.recorridos)}</span></div>
        </Card>
        <Card title="Opciones" icon={<Eye size={14} />}>
          <MesVsMes actual={opc.actual} anterior={opc.anterior} cm={cm} pm={pm} />
          <div className="pair-row" style={{ marginTop: 4 }}><span className="k">Total {data.year}</span><span className="v num">{fNum(a.totales.opciones)}</span></div>
        </Card>
        <Card title="Propiedades Opcionadas" icon={<Building2 size={14} />}>
          <MesVsMes actual={opd.actual} anterior={opd.anterior} cm={cm} pm={pm} />
          <div className="pair-row" style={{ marginTop: 4 }}><span className="k">Venta / Renta / Total</span><span className="v num">{fNum(a.totales.opcionadasVenta)} / {fNum(a.totales.opcionadasRenta)} / {fNum(a.totales.opcionadas)}</span></div>
        </Card>
      </div>

      <div className="section">
        <Card title="Leads recibidos por mes" icon={<Inbox size={14} />}>
          <BarrasMensuales series={a.actividad.leads} hasta={cm} alto={170} />
        </Card>
      </div>

      <LeadsCuatrimestreAsesor nombre={a.nombre} />

      <div className="two-col section">
        <Card title="Cierres" icon={<CheckCircle2 size={14} />}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 14 }}>
            <div className="mini-stat"><div className="v num">{fNum(cie.actual)}</div><div className="l">Cierres {MESES_CORTOS[ci]}</div></div>
            <div className="mini-stat"><div className="v num">{fNum(a.totales.cierres)}</div><div className="l">Total anual</div></div>
            <div className="mini-stat"><div className="v num">{fNum(a.totales.apartados)}</div><div className="l">Apartados {data.year}</div></div>
          </div>
          {pi !== null && <div style={{ marginBottom: 12 }}><Delta actual={cie.actual} anterior={cie.anterior} /></div>}
          <div className="card-title" style={{ marginBottom: 6 }}><TrendingUp size={13} /> Tendencia mensual</div>
          <BarrasMensuales series={a.cierresMes} hasta={cm} alto={150} />
        </Card>

        <Card title={`Meta anual individual · ${fMoney(META_ANUAL_ASESOR)}`} icon={<Target size={14} />} className="highlight-card">
          <div className="pair-row"><span className="k">Año calendario</span><span className="v">1 ene – 31 dic {data.year}</span></div>
          <div className="pair-row"><span className="k">Monto logrado (Oficina + Asesor)</span><span className="v num">{fMoney(a.totales.comTotal)}</span></div>
          <div className="pair-row"><span className="k">Comisión Oficina (X)</span><span className="v num">{fMoney(a.totales.comOficina)}</span></div>
          <div className="pair-row"><span className="k">Comisión Asesor (Y)</span><span className="v num">{fMoney(a.totales.comAsesor)}</span></div>
          <div className="pair-row"><span className="k">Porcentaje de avance</span><span className="v num">{metaPct.toFixed(1)}%</span></div>
          <div className="pair-row"><span className="k">Cantidad restante</span><span className="v num">{fMoney(restante)}</span></div>
          <div style={{ marginTop: 14, marginBottom: 8 }}>
            <Progress pct={metaPct} nivel={nivelSemaforo(metaPct)} />
          </div>
          <SemaforoBadge pct={metaPct} />
        </Card>
      </div>

      <div className="section">
        <Card title="Aporte al cohorte · meta por antigüedad (columna Y)" icon={<Target size={14} />}>
          {tieneAntig ? (
            <div className="detail-grid" style={{ marginTop: 0 }}>
              <div>
                <div className="pair-row"><span className="k">Antigüedad (menos {2} meses de capacitación)</span><span className="v num">{a.mesesAntiguedad} {a.mesesAntiguedad === 1 ? "mes" : "meses"}</span></div>
                <div className="pair-row"><span className="k">Aporte mensual actual</span><span className="v num">{fMoney(a.tarifaMesActual)}</span></div>
                <div className="pair-row"><span className="k">Debería llevar acumulado (Y)</span><span className="v num">{fMoney(a.metaAntiguedad!)}</span></div>
                <div className="pair-row"><span className="k">Lleva realmente (Y)</span><span className="v num">{fMoney(a.totales.comAsesor)}</span></div>
                <div className="pair-row"><span className="k">Diferencia</span><span className="v num" style={{ color: a.totales.comAsesor >= a.metaAntiguedad! ? "var(--ok)" : "var(--bad)" }}>{fMoney(a.totales.comAsesor - a.metaAntiguedad!)}</span></div>
              </div>
              <div>
                <div className="kpi-sub" style={{ marginBottom: 6 }}>Avance sobre lo esperado</div>
                <div style={{ marginBottom: 8 }}><Progress pct={antigPct} nivel={nivelSemaforo(antigPct)} /></div>
                <SemaforoBadge pct={antigPct} />
              </div>
            </div>
          ) : a.fechaSir ? (
            <div className="empty">En periodo de capacitación inicial (ingresó {a.fechaSir}). El aporte al cohorte comienza al tercer mes.</div>
          ) : (
            <div className="empty">Sin fecha de ingreso registrada en el archivo de membresías. No es posible calcular su meta por antigüedad.</div>
          )}
        </Card>
      </div>

      <div className="section">
        <Card title={`Operaciones pendientes (${a.operacionesPendientes.length})`} icon={<Clock size={14} />} className={a.operacionesPendientes.length ? "highlight-card" : ""}>
          {a.operacionesPendientes.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Propiedad</th><th>Tipo</th><th>Apartado</th><th className="r">Monto operación</th><th className="r">Comisión esperada</th></tr>
                </thead>
                <tbody>
                  {a.operacionesPendientes.map((o, i) => (
                    <tr key={i}>
                      <td>{o.propiedad || "—"}</td>
                      <td><span className={`badge ${o.tipo === "VENTA" ? "info" : "neutral"}`}>{o.tipo}</span></td>
                      <td>{o.apartadoM ? `${MESES_LARGOS[o.apartadoM - 1]} ${o.apartadoY}` : "—"}</td>
                      <td className="r num">{fMoney(o.monto)}</td>
                      <td className="r num">{fMoney(o.comEsperada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Sin operaciones pendientes.</div>
          )}
        </Card>
      </div>

      <div className="section">
        <Card title={`Cierres ${data.year} (${a.cierresDetalle.length})`} icon={<CheckCircle2 size={14} />}>
          {a.cierresDetalle.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Propiedad</th><th>Tipo</th><th>Mes de cierre</th><th>Pago</th><th className="r">Com. Oficina</th><th className="r">Com. Asesor</th></tr>
                </thead>
                <tbody>
                  {[...a.cierresDetalle].sort((x, y) => y.mes - x.mes).map((o, i) => (
                    <tr key={i}>
                      <td>{o.propiedad || "—"}</td>
                      <td><span className={`badge ${o.tipo === "VENTA" ? "info" : "neutral"}`}>{o.tipo}</span></td>
                      <td>
                        {MESES_LARGOS[o.mes - 1]}
                        {o.apartadoY && (o.apartadoY < data.year || (o.apartadoM ?? 0) < o.mes) ? (
                          <span style={{ color: "var(--text-3)", fontSize: 11.5 }}> · apartada {MESES_CORTOS[(o.apartadoM ?? 1) - 1]} {o.apartadoY}</span>
                        ) : null}
                      </td>
                      <td>
                        <span className={`badge ${o.pagado === "SI" ? "ok" : o.pagado === "NO" ? "bad" : "neutral"}`}>
                          {o.pagado === "SI" ? "Pagada" : o.pagado === "NO" ? "No pagada" : "Sin registro"}
                        </span>
                      </td>
                      <td className="r num">{fMoney(o.comOficina)}</td>
                      <td className="r num">{fMoney(o.comAsesor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Sin cierres registrados en {data.year}.</div>
          )}
        </Card>
      </div>
    </>
  );
}

function MesVsMes({ actual, anterior, cm, pm }: { actual: number; anterior: number; cm: number; pm: number | null }) {
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 10 }}>
        <div className="mini-stat"><div className="v num">{fNum(anterior)}</div><div className="l">{pm ? MESES_CORTOS[pm - 1] : "—"} (anterior)</div></div>
        <div className="mini-stat" style={{ background: "var(--info-bg)" }}><div className="v num" style={{ color: "var(--rx-blue)" }}>{fNum(actual)}</div><div className="l">{MESES_CORTOS[cm - 1]} (actual)</div></div>
      </div>
      <Delta actual={actual} anterior={anterior} />
    </>
  );
}

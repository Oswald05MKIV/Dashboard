import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, CheckCircle2, Clock, Search, Wallet } from "lucide-react";
import type { DashboardData } from "../types";
import { MESES_CORTOS, MESES_LARGOS } from "../config";
import { fMoney, fNum } from "../lib/metrics";
import { Card, Kpi, MonthChip, PageHead } from "../components/ui";
import { ComparativoMensual } from "../components/charts";
import { SlideAcumulado } from "../components/Diapositivas";
import { useAviso } from "../components/TopsJulio";
import "../components/tops-teams.css";

type FiltroPago = "TODOS" | "SI" | "PENDIENTE";

export function Operaciones({ data }: { data: DashboardData }) {
  const [q, setQ] = useState("");
  const [pago, setPago] = useState<FiltroPago>("TODOS");
  const [mes, setMes] = useState<number>(0); // 0 = todos
  const cm = data.currentMonth;

  const pendientes = useMemo(
    () =>
      data.advisors
        .flatMap((a) => a.operacionesPendientes.map((o) => ({ ...o, asesor: a.nombre })))
        .sort((x, y) => (y.apartadoY ?? 0) * 100 + (y.apartadoM ?? 0) - ((x.apartadoY ?? 0) * 100 + (x.apartadoM ?? 0))),
    [data]
  );

  const cierres = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return data.advisors
      .flatMap((a) => a.cierresDetalle.map((o) => ({ ...o, asesor: a.nombre })))
      .filter((o) => (mes === 0 || o.mes === mes))
      .filter((o) => (pago === "TODOS" ? true : pago === "SI" ? o.pagado === "SI" : o.pagado !== "SI"))
      .filter((o) => norm(`${o.asesor} ${o.propiedad}`).includes(norm(q)))
      .sort((x, y) => y.mes - x.mes || y.comOficina + y.comAsesor - (x.comOficina + x.comAsesor));
  }, [data, q, pago, mes]);

  const { aviso, mostrar } = useAviso();
  // "Hasta hoy": fecha en que se generaron los datos, en hora de Querétaro.
  const hoy = useMemo(() => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date(data.generadoEl));
    const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return v("year") === data.year ? { mes: v("month"), dia: v("day") } : { mes: 12, dia: 31 };
  }, [data]);

  const comFiltrada = cierres.reduce((s, o) => s + o.comOficina + o.comAsesor, 0);

  return (
    <>
      <PageHead
        title="Operaciones"
        subtitle={`Apartados, cierres y estado de pago · ${data.year}`}
        tools={<MonthChip current={cm} previous={data.previousMonth} year={data.year} />}
      />

      <div className="grid kpi-grid section">
        <Kpi label="Apartados del año" value={fNum(data.totals.apartados)} icon={<Briefcase size={16} />} />
        <Kpi label="Cierres del año" value={fNum(data.totals.cierres)} icon={<CheckCircle2 size={16} />} />
        <Kpi label="Operaciones pendientes" value={fNum(data.totals.pendientes)} icon={<Clock size={16} />} sub={<span>Estatus ABIERTA</span>} />
        <Kpi label="Cierres sin pago registrado" value={fNum(data.totals.porCobrar)} icon={<Wallet size={16} />} sub={<span>Cerradas no marcadas como pagadas</span>} />
      </div>

      {/* Acumulado del año: ventas y rentas, cada una capturable en 16:9 */}
      <div className="section">
        <div className="sl-rejilla">
          <SlideAcumulado tipo="ventas" volumen={data.totals.series.volVenta} operaciones={data.totals.series.opsVenta ?? []} hasta={hoy} year={data.year} onAviso={mostrar} />
          <SlideAcumulado tipo="rentas" volumen={data.totals.series.volRenta} operaciones={data.totals.series.opsRenta ?? []} hasta={hoy} year={data.year} onAviso={mostrar} />
        </div>
        {aviso && <div className="tt-toast">{aviso}</div>}
      </div>

      {/* Pendientes: sección muy visible */}
      <div className="section">
        <Card title={`Operaciones pendientes por cerrar (${pendientes.length})`} icon={<AlertTriangle size={14} />} className="highlight-card">
          {pendientes.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Asesor</th><th>Propiedad</th><th>Tipo</th><th>Apartada en</th><th className="r">Monto operación</th><th className="r">Comisión esperada</th></tr>
                </thead>
                <tbody>
                  {pendientes.map((o, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.asesor}</td>
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
            <div className="empty">No hay operaciones pendientes.</div>
          )}
        </Card>
      </div>

      <div className="section">
        <Card title="Apartados vs cierres por mes" icon={<Briefcase size={14} />}>
          <ComparativoMensual a={data.totals.series.apartados} b={data.totals.series.cierres} nombreA="Apartados" nombreB="Cierres" hasta={cm} />
        </Card>
      </div>

      {/* Cierres con filtros */}
      <div className="section">
        <Card title={`Cierres ${data.year} · ${fNum(cierres.length)} operaciones · ${fMoney(comFiltrada)} en comisión total`} icon={<CheckCircle2 size={14} />}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <label className="search">
              <Search size={15} />
              <input placeholder="Buscar por asesor o propiedad…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar operación" />
            </label>
            <select className="control" value={mes} onChange={(e) => setMes(Number(e.target.value))} aria-label="Filtrar por mes">
              <option value={0}>Todos los meses</option>
              {data.mesesDisponibles.map((m) => (
                <option key={m} value={m}>{MESES_LARGOS[m - 1]}</option>
              ))}
            </select>
            <div className="seg" role="group" aria-label="Filtro de pago">
              {(["TODOS", "SI", "PENDIENTE"] as FiltroPago[]).map((f) => (
                <button key={f} className={pago === f ? "on" : ""} onClick={() => setPago(f)}>
                  {f === "TODOS" ? "Todas" : f === "SI" ? "Pagadas" : "Pago pendiente"}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap" style={{ maxHeight: 480, overflowY: "auto" }}>
            <table className="data">
              <thead>
                <tr><th>Asesor</th><th>Propiedad</th><th>Tipo</th><th>Cierre</th><th>Pago</th><th className="r">Com. Oficina</th><th className="r">Com. Asesor</th></tr>
              </thead>
              <tbody>
                {cierres.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{o.asesor}</td>
                    <td>{o.propiedad || "—"}</td>
                    <td><span className={`badge ${o.tipo === "VENTA" ? "info" : "neutral"}`}>{o.tipo}</span></td>
                    <td>
                      {MESES_CORTOS[o.mes - 1]}
                      {o.apartadoY && (o.apartadoY < data.year || (o.apartadoM ?? 0) < o.mes) ? (
                        <span style={{ color: "var(--text-3)", fontSize: 11.5 }}> · ap. {MESES_CORTOS[(o.apartadoM ?? 1) - 1]} {String(o.apartadoY).slice(2)}</span>
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
                {!cierres.length && (
                  <tr><td colSpan={7}><div className="empty">Sin operaciones con los filtros seleccionados.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

import { useMemo, useState } from "react";
import { SlideSemestre } from "../components/Diapositivas";
import { useAviso } from "../components/TopsJulio";
import "../components/tops-teams.css";
import { Building2, Eye, Inbox, Route, Search, Users } from "lucide-react";
import type { DashboardData } from "../types";
import { MESES_CORTOS } from "../config";
import { conversion, fNum, fPct } from "../lib/metrics";
import { Card, Delta, Kpi, MonthChip, PageHead } from "../components/ui";
import { BarrasMensuales, ComparativoMensual } from "../components/charts";

export function Actividad({ data }: { data: DashboardData }) {
  const [q, setQ] = useState("");
  const { totals: t, currentMonth: cm, previousMonth: pm } = data;
  const s = t.series;
  const ci = cm - 1;
  const { aviso, mostrar } = useAviso();
  // El mes del corte se marca "en curso" si los datos se generaron antes de que terminara.
  const gen = new Date(data.generadoEl);
  const enCurso = gen.getFullYear() === data.year && gen.getMonth() + 1 === cm ? cm : undefined;
  const pi = pm ? pm - 1 : null;

  const filas = useMemo(() => {
    const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return data.advisors
      .filter((a) => a.activo && norm(a.nombre).includes(norm(q)))
      .map((a) => ({
        nombre: a.nombre,
        leadsAct: a.actividad.leads[ci],
        leadsAnual: a.totales.leads,
        recPrev: pi !== null ? a.actividad.recorridos[pi] : 0,
        recAct: a.actividad.recorridos[ci],
        opcPrev: pi !== null ? a.actividad.opciones[pi] : 0,
        opcAct: a.actividad.opciones[ci],
        opdVenta: a.totales.opcionadasVenta,
        opdRenta: a.totales.opcionadasRenta,
        opdTotal: a.totales.opcionadas,
      }))
      .sort((x, y) => y.leadsAnual - x.leadsAnual || y.recAct - x.recAct);
  }, [data, q, ci, pi]);

  return (
    <>
      <PageHead
        title="Recorridos y Opciones"
        subtitle="Actividad comercial de campo: leads, recorridos, opciones mostradas y propiedades opcionadas"
        tools={<MonthChip current={cm} previous={pm} year={data.year} />}
      />

      <div className="grid kpi-grid section">
        <Kpi label="Leads recibidos del año" value={fNum(t.leads)} icon={<Inbox size={16} />}
          sub={pi !== null && <Delta actual={s.leads[ci]} anterior={s.leads[pi]} />} />
        <Kpi label="Recorridos del año" value={fNum(t.recorridos)} icon={<Route size={16} />}
          sub={pi !== null && <Delta actual={s.recorridos[ci]} anterior={s.recorridos[pi]} />} />
        <Kpi label="Opciones del año" value={fNum(t.opciones)} icon={<Eye size={16} />}
          sub={pi !== null && <Delta actual={s.opciones[ci]} anterior={s.opciones[pi]} />} />
        <Kpi label="Propiedades opcionadas" value={fNum(t.opcionadas)} icon={<Building2 size={16} />}
          sub={<span>{fNum(t.opcionadasVenta)} venta · {fNum(t.opcionadasRenta)} renta</span>} />
        <Kpi label="Conversión Lead → Recorrido" value={fPct(conversion(t.leads, t.recorridos))} icon={<Route size={16} />} />
        <Kpi label="Conversión Recorrido → Opción" value={fPct(conversion(t.recorridos, t.opciones))} icon={<Eye size={16} />} />
      </div>

      {/* Semestre: recorridos vs opciones mostradas por mes (2 trimestres), capturable en 16:9 */}
      <div className="section">
        <SlideSemestre recorridos={s.recorridos} opciones={s.opciones} mesFinal={cm} year={data.year} enCurso={enCurso} onAviso={mostrar} />
        {aviso && <div className="tt-toast">{aviso}</div>}
      </div>

      <div className="two-col section">
        <Card title="Leads recibidos por mes" icon={<Inbox size={14} />}>
          <BarrasMensuales series={s.leads} hasta={cm} />
        </Card>
        <Card title="Recorridos por mes" icon={<Route size={14} />}>
          <BarrasMensuales series={s.recorridos} hasta={cm} color="#2a5cc0" />
        </Card>
      </div>

      <div className="two-col section">
        <Card title="Opciones mostradas por mes" icon={<Eye size={14} />}>
          <BarrasMensuales series={s.opciones} hasta={cm} color="#dc1c2e" />
        </Card>
        <Card title="Leads vs recorridos" icon={<Inbox size={14} />}>
          <ComparativoMensual a={s.leads} b={s.recorridos} nombreA="Leads" nombreB="Recorridos" hasta={cm} />
        </Card>
      </div>

      <div className="section">
        <Card title={`Actividad por asesor · leads y opcionadas ${data.year}, recorridos y opciones ${MESES_CORTOS[pi ?? 0]} vs ${MESES_CORTOS[ci]}`} icon={<Users size={14} />}>
          <div style={{ marginBottom: 12 }}>
            <label className="search" style={{ maxWidth: 280 }}>
              <Search size={15} />
              <input placeholder="Buscar asesor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar asesor" />
            </label>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th className="r">Leads {MESES_CORTOS[ci]}</th>
                  <th className="r">Leads {data.year}</th>
                  <th className="r">Recorridos {pm ? MESES_CORTOS[pm - 1] : ""}</th>
                  <th className="r">Recorridos {MESES_CORTOS[ci]}</th>
                  <th className="r">Opciones {pm ? MESES_CORTOS[pm - 1] : ""}</th>
                  <th className="r">Opciones {MESES_CORTOS[ci]}</th>
                  <th className="r">Opc. venta</th>
                  <th className="r">Opc. renta</th>
                  <th className="r">Opc. total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.nombre}>
                    <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                    <td className="r num">{fNum(f.leadsAct)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{fNum(f.leadsAnual)}</td>
                    <td className="r num">{fNum(f.recPrev)}</td>
                    <td className="r num" style={{ fontWeight: 600, color: f.recAct > f.recPrev ? "var(--ok)" : f.recAct < f.recPrev ? "var(--bad)" : undefined }}>{fNum(f.recAct)}</td>
                    <td className="r num">{fNum(f.opcPrev)}</td>
                    <td className="r num" style={{ fontWeight: 600, color: f.opcAct > f.opcPrev ? "var(--ok)" : f.opcAct < f.opcPrev ? "var(--bad)" : undefined }}>{fNum(f.opcAct)}</td>
                    <td className="r num">{fNum(f.opdVenta)}</td>
                    <td className="r num">{fNum(f.opdRenta)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{fNum(f.opdTotal)}</td>
                  </tr>
                ))}
                {!filas.length && <tr><td colSpan={10}><div className="empty">Sin resultados.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

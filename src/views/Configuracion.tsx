import { AlertTriangle, CalendarClock, Database, FileSpreadsheet, GitMerge, RefreshCw, Target, Users } from "lucide-react";
import validationJson from "../generated/validation.json";
import type { DashboardData, ValidationReport } from "../types";
import { MESES_CAPACITACION, MESES_LARGOS, META_NIVELES, META_OPCIONADAS_NOVATO, PCT_CASI, PESOS_INDICE, TABLA_META_ANTIGUEDAD, UMBRAL_CASI } from "../config";
import { fMoney } from "../lib/metrics";
import { Card, PageHead } from "../components/ui";

const validation = validationJson as ValidationReport;

export function Configuracion({ data }: { data: DashboardData }) {
  const nombresUnicos = [...new Set(validation.nombresNormalizados)];
  const fueraRosterUnicos = [...new Set(validation.asesoresFueraDeRoster.map((s) => s.replace(/^Fila \d+: /, "")))];
  const fecha = new Date(data.generadoEl);

  return (
    <>
      <PageHead
        title="Configuración y calidad de datos"
        subtitle="Reglas del sistema, validación de los archivos fuente e instrucciones de actualización"
      />

      <div className="grid kpi-grid section">
        <Card title="Archivos fuente" icon={<FileSpreadsheet size={14} />}>
          <div className="pair-row"><span className="k">Opciones y recorridos</span><span className="v">{validation.archivos.opciones}</span></div>
          <div className="pair-row"><span className="k">Apartados y cierres</span><span className="v">{validation.archivos.apartado}</span></div>
          {validation.archivos.membresias && <div className="pair-row"><span className="k">Membresías (Fecha Sir)</span><span className="v">{validation.archivos.membresias}</span></div>}
          <div className="pair-row"><span className="k">Capacitación</span><span className="v">{data.capacitacionArchivo ?? "Sin archivo (estimación provisional)"}</span></div>
          <div className="pair-row"><span className="k">Datos generados</span><span className="v num">{fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
          <div className="pair-row"><span className="k">Mes detectado automáticamente</span><span className="v">{MESES_LARGOS[data.currentMonth - 1]} {data.year}</span></div>
        </Card>
        <Card title="Metas configuradas" icon={<Database size={14} />}>
          <div className="pair-row"><span className="k">Meta del cohorte (columna Y)</span><span className="v">Escalonada por antigüedad (suma)</span></div>
          <div className="pair-row"><span className="k">Meta anual individual · nivel 1 (X + Y)</span><span className="v num">{fMoney(META_NIVELES.N360)}</span></div>
          <div className="pair-row"><span className="k">Nivel 2 · comisión total de la operación</span><span className="v num">{fMoney(META_NIVELES.N500)}</span></div>
          <div className="pair-row"><span className="k">Nivel 3 · comisión total de la operación</span><span className="v num">{fMoney(META_NIVELES.N1M)}</span></div>
          <div className="pair-row"><span className="k">Debería llevar</span><span className="v">Meta × mes en curso ÷ 12</span></div>
          <div className="pair-row"><span className="k">"Ya casi"</span><span className="v">Faltan ≤ {fMoney(UMBRAL_CASI)} o ≥ {PCT_CASI}% de la meta</span></div>
          <div className="pair-row"><span className="k">Escuderos · opcionadas por mes</span><span className="v num">{META_OPCIONADAS_NOVATO}</span></div>
          <div className="pair-row"><span className="k">Escuderos · pesos del índice</span><span className="v">Opc. {PESOS_INDICE.opcionadas * 100}% · Asist. {PESOS_INDICE.asistencia * 100}% · Part. {PESOS_INDICE.participacion * 100}%</span></div>
          <div className="pair-row"><span className="k">Capacitación inicial descontada</span><span className="v num">{MESES_CAPACITACION} meses</span></div>
          <div className="pair-row"><span className="k">Semáforo</span><span className="v">Rojo &lt;50% · Ámbar 50–74% · Verde ≥75%</span></div>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "10px 0 0" }}>
            Las metas anuales escalonadas, el umbral "ya casi", la meta de opcionadas y los pesos del índice de los escuderos se ajustan en <code>src/config.ts</code>; las tarifas por antigüedad, en <code>src/config.ts</code> y en el pipeline. El cohorte se calcula sumando el aporte esperado de cada asesor según su antigüedad.
          </p>
        </Card>
      </div>

      <div className="section">
        <Card title="Meta individual escalonada por antigüedad" icon={<Target size={14} />}>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0 }}>
            La antigüedad se cuenta desde la <strong>Fecha Sir</strong> (archivo de membresías), restando {MESES_CAPACITACION} meses de capacitación inicial. La meta acumula la tarifa de cada mes activo: cada mes suma según el tramo en el que cae, y el total crece automáticamente cada mes.
          </p>
          <div className="table-wrap" style={{ maxWidth: 420 }}>
            <table className="data">
              <thead><tr><th>Antigüedad (meses activos)</th><th className="r">Aporte por mes</th></tr></thead>
              <tbody>
                {TABLA_META_ANTIGUEDAD.map((t) => (
                  <tr key={t.rango}><td>{t.rango}</td><td className="r num">{fMoney(t.monto)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="two-col section">
        <Card title={`Registros duplicados eliminados (${validation.duplicadosEliminados.length})`} icon={<GitMerge size={14} />}>
          {validation.duplicadosEliminados.length ? (
            <ul className="list-report">{validation.duplicadosEliminados.map((d, i) => <li key={i}>{d}</li>)}</ul>
          ) : (
            <div className="empty">Sin duplicados detectados.</div>
          )}
        </Card>
        <Card title={`Fechas corregidas (${validation.fechasCorregidas.length})`} icon={<CalendarClock size={14} />}>
          {validation.fechasCorregidas.length ? (
            <ul className="list-report">{validation.fechasCorregidas.map((d, i) => <li key={i}>{d}</li>)}</ul>
          ) : (
            <div className="empty">Todas las fechas se interpretaron directamente.</div>
          )}
        </Card>
      </div>

      <div className="two-col section">
        <Card title={`Nombres normalizados entre archivos (${nombresUnicos.length})`} icon={<Users size={14} />}>
          <ul className="list-report">{nombresUnicos.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </Card>
        <Card title={`Advertencias (${validation.advertencias.length + fueraRosterUnicos.length})`} icon={<AlertTriangle size={14} />}>
          {validation.advertencias.length + fueraRosterUnicos.length ? (
            <ul className="list-report">
              {fueraRosterUnicos.map((d, i) => <li key={`fr-${i}`}>{d}</li>)}
              {validation.advertencias.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          ) : (
            <div className="empty">Sin advertencias.</div>
          )}
        </Card>
      </div>

      <div className="section">
        <Card title="Cómo actualizar el dashboard cada mes" icon={<RefreshCw size={14} />}>
          <ol className="list-report" style={{ fontSize: 13.5, lineHeight: 1.9 }}>
            <li>Reemplaza los archivos de la carpeta <code>data/</code> por las versiones nuevas. El sistema los localiza por nombre: uno debe contener <strong>OPCIONES</strong>, otro <strong>APARTADO</strong> y otro <strong>MEMBRES</strong>(ías); el resto del nombre no importa. El de membresías solo cambia cuando entra o sale un asesor.</li>
            <li>Sube los cambios al repositorio (<code>git add . && git commit -m "Datos [mes]" && git push</code>).</li>
            <li>Vercel compila automáticamente: el proceso de build vuelve a leer los Excel, regenera los datos, detecta el mes más reciente y publica el dashboard actualizado. No se modifica código.</li>
            <li>Para verlo en tu computadora antes de publicar: <code>npm run dev</code>.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}

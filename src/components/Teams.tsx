import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { agosto2026Teams } from '../data/agosto2026Teams';
import type { Team, TotalTeam } from '../data/agosto2026Teams';
import { Estandarte, PALETA } from './civilizaciones';
import MapaConquista from './MapaConquista';
import { BotonCaptura, useAviso } from './TopsJulio';
import './tops-teams.css';

const mxn = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

// Versión corta para las celdas angostas de la tabla: a partir del millón
// se abrevia ($1.98 M) para que el número nunca se salga de la columna.
const mxnCorto = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`
    : mxn(n);

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const cifra = (n: number) => (n === 0 ? <span className="tt-zero">—</span> : Number.isInteger(n) ? n : n.toFixed(1));

const METRICAS: { clave: keyof TotalTeam; nombre: string }[] = [
  { clave: 'recorridos', nombre: 'recorridos' },
  { clave: 'mostradas', nombre: 'opciones mostradas' },
  { clave: 'opcionadas', nombre: 'propiedades opcionadas' },
  { clave: 'leads', nombre: 'leads' },
  { clave: 'rentas', nombre: 'monto en rentas' },
  { clave: 'ventas', nombre: 'monto en ventas' },
];

function lideres(teams: readonly Team[]) {
  const mapa: Record<string, string[]> = {};
  for (const m of METRICAS) {
    const tope = Math.max(...teams.map((t) => t.total[m.clave]));
    if (tope <= 0) continue;
    for (const t of teams) {
      if (t.total[m.clave] === tope) (mapa[t.nombre] ||= []).push(`1º en ${m.nombre}`);
    }
  }
  return mapa;
}

function TarjetaTeam({ team, insignias, onAviso }: { team: Team; insignias: string[]; onAviso: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = PALETA[team.color];
  const estilo = {
    ['--tt-team' as string]: c.base,
    ['--tt-team-soft' as string]: c.suave,
    ['--tt-team-line' as string]: c.linea,
    ['--tt-team-ink' as string]: c.texto,
  } as CSSProperties;

  return (
    <section className="tt-card tt-team" ref={ref} style={estilo}>
      <header className="tt-card__top">
        <div>
          <h3 className="tt-team__name">
            <Estandarte clave={team.color} alto={26} className="tt-team__flag" />
            {team.nombre}
          </h3>
          {insignias.length > 0 && (
            <p className="tt-badges">
              {insignias.map((b) => (
                <span className="tt-badge" key={b}>{b}</span>
              ))}
            </p>
          )}
        </div>
        <BotonCaptura
          destino={ref}
          archivo={team.nombre.toLowerCase().replace(/[^a-z]+/g, '-')}
          onAviso={onAviso}
        />
      </header>

      <table className="tt-tbl">
        <colgroup>
          <col className="tt-c-asesor" />
          <col className="tt-c-num" />
          <col className="tt-c-num2" />
          <col className="tt-c-num2" />
          <col className="tt-c-num3" />
          <col className="tt-c-money" />
          <col className="tt-c-money" />
        </colgroup>
        <thead>
          <tr>
            <th>Asesor</th>
            <th>Rec.</th>
            <th>Most.</th>
            <th>Capt.</th>
            <th>Leads</th>
            <th>Rentas</th>
            <th>Ventas</th>
          </tr>
        </thead>
        <tbody>
          {team.integrantes.map((p) => (
            <tr key={p.nombre}>
              <td>
                {p.nombre} {p.sinDatos && <span className="tt-nodata">· sin datos</span>}
              </td>
              <td className="tt-n">{cifra(p.recorridos)}</td>
              <td className="tt-n">{cifra(p.mostradas)}</td>
              <td className="tt-n">{cifra(p.opcionadas)}</td>
              <td className="tt-n">{cifra(p.leads)}</td>
              <td className="tt-n tt-m">{p.rentas ? mxnCorto(p.rentas) : <span className="tt-zero">—</span>}</td>
              <td className="tt-n tt-m">{p.ventas ? mxnCorto(p.ventas) : <span className="tt-zero">—</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Equipo</td>
            <td className="tt-n">{team.total.recorridos}</td>
            <td className="tt-n">{team.total.mostradas}</td>
            <td className="tt-n">{num(team.total.opcionadas)}</td>
            <td className="tt-n">{team.total.leads}</td>
            <td className="tt-n tt-m">{mxnCorto(team.total.rentas)}</td>
            <td className="tt-n tt-m">{mxnCorto(team.total.ventas)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

export default function Teams() {
  const ref = useRef<HTMLDivElement>(null);
  const { aviso, mostrar } = useAviso();
  const [vistaFija, setVistaFija] = useState(false);
  const teams = agosto2026Teams.teams as readonly Team[];
  const insignias = lideres(teams);

  return (
    <div className={`tt-root${vistaFija ? ' tt-fijo' : ''}`} ref={ref}>
      <header className="tt-head">
        <div>
          <p className="tt-eyebrow">RE/MAX Terra · Equipos</p>
          <h2 className="tt-title">Teams</h2>
          <p className="tt-sub">
            Seis civilizaciones con los mismos indicadores del mes sumados por equipo. Los montos son el
            total de la operación de lo cerrado dentro del periodo.
          </p>
        </div>
        <div className="tt-acciones">
          <button
            type="button"
            className="tt-cap"
            onClick={() => setVistaFija((v) => !v)}
            title="Fija la rejilla en 3 columnas para que la imagen del grupo salga siempre igual"
          >
            {vistaFija ? 'Vista automática' : 'Vista 3 columnas'}
          </button>
          <BotonCaptura destino={ref} archivo="teams" etiqueta="Capturar todo" solido onAviso={mostrar} />
        </div>
      </header>

      <p className="tt-banner">
        <strong>Los equipos arrancan en ceros.</strong> {agosto2026Teams.teamsNota}
      </p>

      <div className="tt-grid">
        {teams.map((t) => (
          <TarjetaTeam key={t.nombre} team={t} insignias={insignias[t.nombre] ?? []} onAviso={mostrar} />
        ))}
      </div>

      <div className="tt-mapa-seccion">
        <MapaConquista teams={teams} periodo={agosto2026Teams.periodo} onAviso={mostrar} />
      </div>

      <p className="tt-foot">
        Rec. = recorridos · Most. = opciones mostradas · Capt. = propiedades opcionadas ·
        Rentas y Ventas = total de la operación de lo cerrado en el periodo (los montos de un
        millón o más se abrevian, p. ej. $1.98 M).
      </p>

      {aviso && <div className="tt-toast">{aviso}</div>}
    </div>
  );
}

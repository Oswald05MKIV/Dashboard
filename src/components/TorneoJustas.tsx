import type { ReactNode } from 'react';
import type { DashboardData } from '../types';
import { fMoney } from '../lib/metrics';
import { NIVELES, ORDEN_NIVELES } from '../lib/metasNiveles';
import type { ClaveNivel, ContextoMetas, FilaEscudero, FilaNivel } from '../lib/metasNiveles';
import { CaballeroG, EmblemaNivel, EscudoIniciales, EscuderoG, REINO, RitmoBadge, blasonDe } from './heraldica';

/**
 * Torneo de justas: una liza por asesor. El caballero avanza según lo que
 * lleva respecto a su meta anual; el estandarte punteado marca dónde debería
 * ir hoy (meta × mes/12) y al final de la liza va su % de ritmo.
 * Los escuderos en formación avanzan a pie según su índice de capacitación.
 */

const LIZA_W = 600;
const X0 = 40;
const X1 = 560;
const posX = (fraccion: number) => X0 + Math.min(Math.max(fraccion, 0), 1) * (X1 - X0);

const COLOR_NIVEL: Record<ClaveNivel | 'escuderos', string> = {
  escuderos: '#6b5232',
  '360': '#3d5a3a',
  '500': '#2f4f6b',
  '1M': REINO.vino,
};

function Liza({ nivel, avance, hoy, children, titulo }: {
  nivel: ClaveNivel | 'escuderos';
  avance: number;
  hoy: number | null;
  children: ReactNode;
  titulo: string;
}) {
  const xHoy = hoy == null ? null : posX(hoy);
  const postes = [];
  for (let x = X0; x <= X1; x += 26) postes.push(<rect key={x} x={x - 1.2} y={41} width={2.4} height={9} fill={REINO.madera} />);
  return (
    <svg viewBox={`0 -8 ${LIZA_W} 70`} className="rn-liza" role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <defs>
        <linearGradient id="rn-arena" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe0bb" />
          <stop offset="1" stopColor="#d9c08d" />
        </linearGradient>
      </defs>
      <rect x="0" y="36" width={LIZA_W} height="22" rx="3" fill="url(#rn-arena)" />
      <path d={`M0 36 H${LIZA_W} M0 58 H${LIZA_W}`} stroke={REINO.sepia} strokeWidth="0.8" opacity="0.5" />
      {/* barrera central de la liza */}
      {postes}
      <path d={`M${X0} 42 H${X1}`} stroke={REINO.madera} strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M${X0} 45 H${X1}`} stroke={COLOR_NIVEL[nivel]} strokeWidth="1.4" opacity="0.65" />
      {/* pabellón de salida */}
      <g transform="translate(6 14)">
        <path d="M0 32 L13 6 L26 32 Z" fill="#efe3c6" stroke={REINO.sepia} strokeWidth="1" />
        <path d="M13 6 L9 32 M13 6 L17 32" stroke={COLOR_NIVEL[nivel]} strokeWidth="2" opacity="0.8" />
        <path d="M13 6 V-2 L20 1 L13 4" fill={COLOR_NIVEL[nivel]} stroke={REINO.sepia} strokeWidth="0.6" />
      </g>
      {/* meta al final de la liza */}
      <g transform={`translate(${X1 + 14} 0)`}>
        <path d="M0 56 V0" stroke={REINO.madera} strokeWidth="2.2" />
        <path d="M1 1 H20 L15 7 L20 13 H1 Z" fill={COLOR_NIVEL[nivel]} stroke={REINO.oro} strokeWidth="1" />
        <circle cx="0" cy="-1" r="2.2" fill={REINO.oro} />
      </g>
      {/* "debería ir aquí hoy": estandarte punteado */}
      {xHoy != null && (
        <g transform={`translate(${xHoy} 0)`} className="rn-hoy">
          <path d="M0 58 V-2" stroke={REINO.oro} strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M0 -2 H14 L10 3 L14 8 H0" fill="none" stroke={REINO.oro} strokeWidth="1.3" strokeDasharray="2.5 2" />
        </g>
      )}
      <g transform={`translate(${posX(avance)} 0)`}>{children}</g>
    </svg>
  );
}

function EncabezadoNivel({ nivel, cuantos, nota }: { nivel: ClaveNivel | 'escuderos'; cuantos: number; nota: string }) {
  const titulo = nivel === 'escuderos' ? 'Campamento de Escuderos' : NIVELES[nivel].territorio;
  const etiqueta = nivel === 'escuderos' ? 'En formación' : `Meta ${NIVELES[nivel].etiqueta}`;
  return (
    <div className="rn-heraldo" style={{ ['--rn-nivel' as string]: COLOR_NIVEL[nivel] }}>
      <EmblemaNivel nivel={nivel} alto={38} />
      <div>
        <p className="rn-heraldo__eyebrow">{etiqueta} · {cuantos} {cuantos === 1 ? 'asesor' : 'asesores'}</p>
        <h4 className="rn-heraldo__titulo">{titulo}</h4>
        <p className="rn-heraldo__nota">{nota}</p>
      </div>
    </div>
  );
}

export function TorneoNiveles({ data, porNivel, ctx, onSelect }: {
  data: DashboardData;
  porNivel: Record<ClaveNivel, FilaNivel[]>;
  ctx: ContextoMetas;
  onSelect: (n: string) => void;
}) {
  return (
    <div className="rn-torneo">
      {[...ORDEN_NIVELES].reverse().map((k) => {
        const filas = porNivel[k];
        const info = NIVELES[k];
        return (
          <section key={k} className="rn-torneo__nivel">
            <EncabezadoNivel nivel={k} cuantos={filas.length} nota={`${info.medicion}. El estandarte punteado marca dónde debería ir hoy (mes ${ctx.mes} de 12).`} />
            {!filas.length && <p className="rn-vacio">Aún nadie ha llegado a este nivel. ¡El primero en cruzar se lleva el estandarte!</p>}
            {filas.length > 0 && (
              <div className="rn-scroll">
                <div className="rn-lizas">
                  {filas.map(({ a, m }) => {
                    const b = blasonDe(data, a);
                    const titulo = `${a.nombre} · meta ${info.etiqueta} · lleva ${fMoney(m.lleva)} · debería llevar hoy ${fMoney(m.deberiaLlevar)} · ritmo ${m.pctRitmo.toFixed(2)}%`;
                    return (
                      <button type="button" key={a.nombre} className="rn-fila" onClick={() => onSelect(a.nombre)} title="Ver ficha del asesor">
                        <span className="rn-fila__quien">
                          <EscudoIniciales nombre={a.nombre} color={b.color} alto={30} />
                          <span>
                            <span className="rn-fila__nombre">{a.nombre}</span>
                            <span className="rn-fila__dato">Lleva {fMoney(m.lleva)}</span>
                            <span className="rn-fila__dato">Hoy debería {fMoney(m.deberiaLlevar)}</span>
                            {m.yaCasi && <span className="rn-casi">Te faltan {fMoney(m.falta)} para los {info.etiqueta}</span>}
                          </span>
                        </span>
                        <Liza nivel={k} avance={m.pctMeta / 100} hoy={ctx.fraccion} titulo={titulo}>
                          <g transform="translate(-66 -6) scale(0.95)">
                            <CaballeroG color={b.color} />
                          </g>
                        </Liza>
                        <span className="rn-fila__pct">
                          <RitmoBadge pct={m.pctRitmo} />
                          <span className="rn-fila__sub">de ritmo</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function TorneoEscuderos({ data, escuderos, onSelect }: {
  data: DashboardData;
  escuderos: FilaEscudero[];
  onSelect: (n: string) => void;
}) {
  return (
    <div className="rn-torneo">
      <section className="rn-torneo__nivel">
        <EncabezadoNivel nivel="escuderos" cuantos={escuderos.length} nota="Avanzan según su índice de capacitación (opcionadas, asistencia y participación). Al final del campo les espera el Camino de los Caballeros." />
        <div className="rn-scroll">
          <div className="rn-lizas">
            {escuderos.map(({ a, ind }) => {
              const b = blasonDe(data, a);
              return (
                <button type="button" key={a.nombre} className="rn-fila" onClick={() => onSelect(a.nombre)} title="Ver ficha del asesor">
                  <span className="rn-fila__quien">
                    <EscudoIniciales nombre={a.nombre} color={b.color} alto={30} />
                    <span>
                      <span className="rn-fila__nombre">{a.nombre}</span>
                      <span className="rn-fila__dato rn-fila__msg">{ind.mensaje}</span>
                    </span>
                  </span>
                  <Liza nivel="escuderos" avance={ind.indice / 100} hoy={null} titulo={`${a.nombre} · índice de capacitación ${ind.indice.toFixed(0)} de 100`}>
                    <g transform="translate(-22 2)">
                      <EscuderoG color={b.color} />
                    </g>
                  </Liza>
                  <span className="rn-fila__pct">
                    <strong className="rn-indice">{ind.indice.toFixed(0)}</strong>
                    <span className="rn-fila__sub">índice / 100</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

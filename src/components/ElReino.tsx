import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Advisor, DashboardData } from '../types';
import { fMoney, fNum } from '../lib/metrics';
import { MESES_CORTOS } from '../config';
import { fechaCorta } from '../lib/metasNiveles';
import type { ClaveNivel, ContextoMetas, FilaEscudero, FilaNivel, IndiceCapacitacion, MetaIndividual } from '../lib/metasNiveles';
import { PALETA } from './civilizaciones';
import { EmblemaNivel, EscudoIniciales, EstandarteAsesorG, REINO, RitmoBadge, blasonDe, nombreCorto } from './heraldica';
import type { Blason } from './heraldica';
import { BotonCaptura } from './TopsJulio';

/**
 * El Reino: mapa de las metas individuales. Un solo camino cruza cuatro
 * territorios — Campamento de Escuderos (capacitación) → Camino de los
 * Caballeros (360K) → Feudo de los Señores (500K) → Ciudadela de la Corona (1M).
 * Cada asesor es un estandarte con sus iniciales y el color de su Team,
 * colocado sobre el camino de su territorio según su % de avance (índice de
 * capacitación para los escuderos, % de la meta anual para los demás).
 * Clic (o Enter) en un estandarte abre su panel; clic en el mapa lo cierra.
 */

const ANCHO = 1200;
const ALTO = 660;
const Y_CAMINO = 362;
const FIN_CAMINO = 1112;
const ESPACIO_FILA = 60;

type ClaveTerritorio = 'escuderos' | ClaveNivel;

const TERRITORIOS: { clave: ClaveTerritorio; x0: number; x1: number; u0: number; u1: number; nombre: string; sub: string; tinte: string }[] = [
  { clave: 'escuderos', x0: 22, x1: 256, u0: 60, u1: 226, nombre: 'Campamento de Escuderos', sub: 'Capacitación · índice de avance', tinte: '#7f8f4e' },
  { clave: '360', x0: 256, x1: 770, u0: 288, u1: 740, nombre: 'Camino de los Caballeros', sub: 'Meta 360K · comisión oficina + asesor', tinte: '#a57f45' },
  { clave: '500', x0: 770, x1: 978, u0: 800, u1: 950, nombre: 'Feudo de los Señores', sub: 'Meta 500K · comisión total', tinte: '#557591' },
  { clave: '1M', x0: 978, x1: 1178, u0: 996, u1: 1076, nombre: 'Ciudadela de la Corona', sub: 'Meta 1M · comisión total', tinte: '#8e3a47' },
];

/** Altura del camino en x (una curva suave y determinista). */
const caminoY = (x: number) => Y_CAMINO + 30 * Math.sin(((x - 20) / 1090) * Math.PI * 2.3) + 8 * Math.sin(x / 70);
const CAMINO_D = (() => {
  const pts: string[] = [];
  for (let x = 14; x <= FIN_CAMINO; x += 6) pts.push(`${pts.length ? 'L' : 'M'}${x} ${caminoY(x).toFixed(1)}`);
  return pts.join(' ');
})();

const X_RIO = 770;
const RIO_D = `M732 14 C 760 90, 810 140, 788 220 S 750 ${caminoY(X_RIO) - 50}, ${X_RIO} ${caminoY(X_RIO).toFixed(1)} S 830 470, 806 540 S 760 620, 780 652`;

type Marcador = {
  a: Advisor;
  blason: Blason;
  territorio: ClaveTerritorio;
  avance: number; // 0–1 dentro del territorio
  x: number;
  y: number;
  meta: MetaIndividual | null;
  indice: IndiceCapacitacion | null;
};

/** Coloca cada estandarte sobre el camino; si choca con otro, sube o baja de fila. */
function desplegar(data: DashboardData, escuderos: FilaEscudero[], porNivel: Record<ClaveNivel, FilaNivel[]>): Marcador[] {
  const crudos: Omit<Marcador, 'x' | 'y'>[] = [
    ...escuderos.map(({ a, ind }) => ({ a, blason: blasonDe(data, a), territorio: 'escuderos' as const, avance: ind.indice / 100, meta: null, indice: ind })),
    ...(['360', '500', '1M'] as ClaveNivel[]).flatMap((k) =>
      porNivel[k].map(({ a, m }) => ({ a, blason: blasonDe(data, a), territorio: k, avance: m.pctMeta / 100, meta: m, indice: null })),
    ),
  ];
  const puestos: Marcador[] = [];
  const filas = [0, -1, 1, -2, 2, -3, 3];
  // De mayor a menor avance: los punteros quedan sobre el camino.
  crudos
    .sort((p, q) => q.avance - p.avance)
    .forEach((c) => {
      const t = TERRITORIOS.find((z) => z.clave === c.territorio)!;
      const x = t.u0 + Math.min(Math.max(c.avance, 0), 1) * (t.u1 - t.u0);
      const base = caminoY(x) + 6;
      let y = base;
      for (const f of filas) {
        const yy = base + f * ESPACIO_FILA;
        if (puestos.every((p) => Math.abs(p.x - x) >= 50 || Math.abs(p.y - yy) >= ESPACIO_FILA - 4)) { y = yy; break; }
        y = yy;
      }
      puestos.push({ ...c, x, y });
    });
  return puestos;
}

/* ------------------------------------------------------------------ */
/* Decoración                                                           */
/* ------------------------------------------------------------------ */

function Tienda({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={REINO.sepia} strokeWidth="1" strokeLinejoin="round">
      <path d="M-20 14 L0 -16 L20 14 Z" fill="#efe2c2" />
      <path d="M0 -16 L-7 14 M0 -16 L7 14" stroke={color} strokeWidth="3" opacity="0.8" />
      <path d="M-4 14 L0 2 L4 14 Z" fill={REINO.sepia} opacity="0.7" />
      <path d="M0 -16 V-26 L9 -22 L0 -19" fill={color} strokeWidth="0.7" className="rn-ondear" />
    </g>
  );
}

function Hoguera({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 6 L9 -1 M-9 -1 L9 6" stroke={REINO.madera} strokeWidth="2.6" strokeLinecap="round" />
      <path className="rn-llama" d="M0 2 C-7 -2 -4 -10 0 -16 C2 -10 7 -7 4 0 C3 2 1 3 0 2 Z" fill="#d9822b" />
      <path d="M0 1 C-3 -2 -2 -6 0 -9 C2 -5 3 -3 1 0 Z" fill="#f2c14e" />
    </g>
  );
}

function Estafermo({ x, y }: { x: number; y: number }) {
  // muñeco de entrenamiento (quintana)
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="1" strokeLinejoin="round">
      <path d="M0 14 V-14" stroke={REINO.madera} strokeWidth="2.4" />
      <path d="M-14 -8 H14" stroke={REINO.madera} strokeWidth="2.2" />
      <circle cx="0" cy="-18" r="4.5" fill="#d8c59a" />
      <path d="M8 -12 L14 -8 L8 -4 Z" fill={REINO.vino} />
      <ellipse cx="0" cy="14" rx="9" ry="2.4" fill={REINO.sepia} opacity="0.3" stroke="none" />
    </g>
  );
}

function Arboleda({ x, y, n = 5 }: { x: number; y: number; n?: number }) {
  const pts = [[0, 0], [12, -5], [-11, -4], [5, 8], [-6, 9], [17, 6], [-17, 6]].slice(0, n);
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="0.8">
      {pts.map(([px, py], i) => (
        <g key={i}>
          <path d={`M${px} ${py + 6} v4`} />
          <path d={`M${px - 6} ${py + 6} L${px} ${py - 9} L${px + 6} ${py + 6} Z`} fill={i % 2 ? '#7f9467' : '#93a77a'} />
        </g>
      ))}
    </g>
  );
}

function Montes({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={REINO.sepia} strokeWidth="1" strokeLinejoin="round">
      <path d="M-30 12 L-12 -14 L0 0 L10 -8 L28 12 Z" fill="#dccaa1" />
      <path d="M-30 12 L-12 -14 L-6 6 Z" fill="#bea67b" />
      <path d="M10 -8 L28 12 L16 12 Z" fill="#bea67b" />
      <path d="M-15 -9 L-12 -14 L-9 -9" fill="#f6f0e2" stroke="none" />
    </g>
  );
}

function Atalaya({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="1" strokeLinejoin="round">
      <path d="M-8 16 L-6 -18 H6 L8 16 Z" fill="#e3d5b3" />
      <path d="M-9 -18 v-5 h4 v3 h3 v-3 h4 v3 h3 v-3 h4 v5 Z" fill="#d6c6a0" />
      <rect x="-2" y="-10" width="4" height="7" fill={REINO.sepia} />
      <path d="M0 -23 V-33 L9 -30 L0 -27" fill="#3d5a3a" strokeWidth="0.7" className="rn-ondear" />
    </g>
  );
}

function Feudo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="1" strokeLinejoin="round">
      {/* parcelas */}
      <g opacity="0.75">
        <path d="M-70 18 L-30 6 L-2 22 L-44 36 Z" fill="#d9cb93" />
        <path d="M-66 20 L-40 34 M-58 16 L-32 30 M-50 13 L-22 27 M-42 10 L-14 24" stroke="#a8955e" strokeWidth="0.7" />
        <path d="M36 22 L70 8 L92 22 L58 38 Z" fill="#c9d39a" />
        <path d="M44 20 L66 34 M54 16 L76 30 M64 12 L84 25" stroke="#97a86a" strokeWidth="0.7" />
      </g>
      {/* casa señorial */}
      <path d="M-18 14 V-6 L0 -20 L18 -6 V14 Z" fill="#e7d9b8" />
      <path d="M-22 -4 L0 -22 L22 -4" fill="none" stroke={REINO.vino} strokeWidth="3" />
      <rect x="-4" y="2" width="8" height="12" fill={REINO.sepia} />
      <rect x="-13" y="-3" width="5" height="5" fill="#5a4632" opacity="0.6" />
      <rect x="8" y="-3" width="5" height="5" fill="#5a4632" opacity="0.6" />
      <path d="M0 -22 V-34 L10 -31 L0 -28" fill="#2f4f6b" strokeWidth="0.7" className="rn-ondear" />
    </g>
  );
}

function Ciudadela({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="1.1" strokeLinejoin="round">
      <ellipse cx="0" cy="44" rx="78" ry="16" fill="#cdb98c" opacity="0.8" />
      <path d="M-62 44 C-50 20 50 20 62 44 Z" fill="#d8c69c" />
      {/* muralla */}
      <path d="M-46 36 V2 h6 v-6 h6 v6 h6 v-6 h6 v6 h6 v-6 h6 v6 h6 v-6 h6 v6 h6 v-6 h6 v6 h6 v-6 h6 v6 h4 V36 Z" fill="#e6d8b6" />
      {/* torres */}
      <path d="M-54 36 V-16 h18 V36 Z" fill="#dccca5" />
      <path d="M36 36 V-16 h18 V36 Z" fill="#dccca5" />
      <path d="M-56 -16 L-45 -32 L-34 -16 Z" fill={REINO.vino} />
      <path d="M34 -16 L45 -32 L56 -16 Z" fill={REINO.vino} />
      {/* torre del homenaje */}
      <path d="M-14 36 V-30 h28 V36 Z" fill="#e9dcbb" />
      <path d="M-17 -30 L0 -54 L17 -30 Z" fill={REINO.vino} />
      <path d="M-5 36 V20 Q0 13 5 20 V36 Z" fill={REINO.sepia} />
      <rect x="-3" y="-20" width="6" height="9" rx="3" fill={REINO.sepia} opacity="0.8" />
      {/* corona */}
      <path d="M0 -54 V-72" strokeWidth="1.4" />
      <path d="M1 -72 H22 L17 -66 L22 -60 H1 Z" fill={REINO.oro} strokeWidth="0.8" className="rn-ondear" />
      <path d="M-9 -78 L-7 -86 L-3 -81 L0 -88 L3 -81 L7 -86 L9 -78 Z" fill={REINO.oroClaro} stroke={REINO.oro} />
    </g>
  );
}

function Puente({ x }: { x: number }) {
  const y = caminoY(x);
  const pendiente = (caminoY(x + 4) - caminoY(x - 4)) / 8;
  const ang = (Math.atan(pendiente) * 180) / Math.PI;
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang})`} stroke={REINO.sepia} strokeLinejoin="round">
      <path d="M-26 -9 Q0 -15 26 -9 V9 Q0 15 -26 9 Z" fill="#d7c6a0" strokeWidth="1.1" />
      <path d="M-26 -9 Q0 -15 26 -9 M-26 9 Q0 15 26 9" fill="none" strokeWidth="2.4" />
      <path d="M-18 -11 v4 M-6 -13 v4 M6 -13 v4 M18 -11 v4 M-18 11 v-4 M-6 13 v-4 M6 13 v-4 M18 11 v-4" strokeWidth="1" />
    </g>
  );
}

function RosaVientos({ x, y }: { x: number; y: number }) {
  const punta = (a: number, l: number, w: number) => {
    const r = (a * Math.PI) / 180;
    const c = Math.cos(r), s = Math.sin(r);
    return `M${(l * c).toFixed(1)} ${(l * s).toFixed(1)} L${(w * -s).toFixed(1)} ${(w * c).toFixed(1)} L0 0 L${(w * s).toFixed(1)} ${(w * -c).toFixed(1)} Z`;
  };
  return (
    <g transform={`translate(${x} ${y})`} stroke={REINO.sepia} strokeWidth="0.8" strokeLinejoin="round">
      <circle r="27" fill="none" opacity="0.6" />
      <circle r="21" fill="none" strokeDasharray="1.5 2.5" opacity="0.6" />
      {[45, 135, 225, 315].map((a) => <path key={a} d={punta(a, 18, 4)} fill="#e9dcbc" />)}
      {[0, 90, 180, 270].map((a) => <path key={a} d={punta(a, 28, 6)} fill={a === 270 ? REINO.vino : REINO.oroClaro} />)}
      <circle r="3" fill={REINO.oro} />
      <text y="-32" textAnchor="middle" className="rn-mapa__rosa">N</text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Panel del asesor                                                     */
/* ------------------------------------------------------------------ */

function Dato({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="rn-panel__row">
      <span>{k}</span>
      <strong>{children}</strong>
    </div>
  );
}

const pct0 = (v: number | null) => (v == null ? 'Sin datos' : `${v.toFixed(0)}%`);

function PanelReino({ m, ctx, onCerrar }: { m: Marcador; ctx: ContextoMetas; onCerrar: () => void }) {
  const t = TERRITORIOS.find((z) => z.clave === m.territorio)!;
  return (
    <aside className="rn-panel" role="dialog" aria-label={`Avance de ${m.a.nombre}`} style={{ ['--rn-team' as string]: m.blason.color } as CSSProperties}>
      <header className="rn-panel__head">
        <EscudoIniciales nombre={m.a.nombre} color={m.blason.color} alto={40} />
        <div>
          <p className="rn-panel__team">{m.blason.team ? `Team ${m.blason.team}` : 'Sin Team'} · {t.nombre}</p>
          <h4 className="rn-panel__name">{m.a.nombre}</h4>
        </div>
        <button type="button" className="rn-panel__close" onClick={onCerrar} aria-label="Cerrar">×</button>
      </header>
      {m.indice && (
        <>
          <p className="rn-panel__section">Escudero en formación</p>
          <Dato k="Índice de avance">{m.indice.indice.toFixed(0)} / 100</Dato>
          <Dato k={`Opcionadas (desde ${MESES_CORTOS[m.indice.opcionadas.desdeMes - 1].toLowerCase()})`}>{fNum(m.indice.opcionadas.valor)}</Dato>
          <Dato k="Meta de opcionadas">{fNum(m.indice.opcionadas.meta)}</Dato>
          <Dato k="Asistencia">{pct0(m.indice.asistencia)}</Dato>
          <Dato k="Participación">{pct0(m.indice.participacion)}</Dato>
          <p className="rn-panel__msg">{m.indice.mensaje}</p>
          {m.indice.fuente === 'provisional' && <p className="rn-panel__nota">Asistencia y participación: estimación provisional de la oficina.</p>}
        </>
      )}
      {m.meta && (
        <>
          <p className="rn-panel__section">Meta {m.meta.nivel.etiqueta} · mes {ctx.mes} de 12</p>
          <Dato k="Meta anual">{fMoney(m.meta.meta)}</Dato>
          <Dato k="Debería llevar hoy">{fMoney(m.meta.deberiaLlevar)}</Dato>
          <Dato k="Lleva">{fMoney(m.meta.lleva)}</Dato>
          <Dato k="% de ritmo"><RitmoBadge pct={m.meta.pctRitmo} /></Dato>
          <Dato k="% de la meta anual">{m.meta.pctMeta.toFixed(2)}%</Dato>
          <Dato k="Falta">{fMoney(m.meta.falta)}</Dato>
          {m.meta.yaCasi && <p className="rn-casi">Te faltan {fMoney(m.meta.falta)} para los {m.meta.nivel.etiqueta}</p>}
          <p className="rn-panel__nota">{m.meta.nivel.medicion}.</p>
        </>
      )}
      <a className="rn-panel__link" href={`#/asesores/${encodeURIComponent(m.a.nombre)}`}>Ver ficha completa →</a>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

export default function ElReino({ data, ctx, escuderos, porNivel, onAviso }: {
  data: DashboardData;
  ctx: ContextoMetas;
  escuderos: FilaEscudero[];
  porNivel: Record<ClaveNivel, FilaNivel[]>;
  onAviso: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const marcadores = useMemo(() => desplegar(data, escuderos, porNivel), [data, escuderos, porNivel]);
  const seleccionado = marcadores.find((m) => m.a.nombre === sel) ?? null;
  const cuantos = (k: ClaveTerritorio) => marcadores.filter((m) => m.territorio === k).length;
  const teams = data.teams.equipos;

  return (
    <section className="rn-card rn-reino" ref={ref}>
      <header className="rn-card__top">
        <div>
          <h3 className="rn-card__title">El Reino</h3>
          <p className="rn-card__note">
            Cada estandarte es un asesor con el color de su Team, sobre el camino de su territorio según su avance.
            Haz clic en un estandarte para ver su meta.
          </p>
        </div>
        <BotonCaptura destino={ref} archivo={`el-reino-mes-${ctx.mes}-${data.year}`} onAviso={onAviso} />
      </header>

      <ul className="rn-leyenda">
        {TERRITORIOS.map((t) => (
          <li key={t.clave} style={{ ['--rn-nivel' as string]: t.tinte } as CSSProperties}>
            <EmblemaNivel nivel={t.clave} alto={26} />
            <span>
              <strong>{t.nombre}</strong>
              <em>{t.sub} · {cuantos(t.clave)} {cuantos(t.clave) === 1 ? 'asesor' : 'asesores'}</em>
            </span>
          </li>
        ))}
      </ul>

      <div className="rn-reino__marco">
        <div className="rn-scroll">
          <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="rn-reino__svg" role="img" aria-label="El Reino: avance de cada asesor hacia su meta anual" onClick={() => setSel(null)}>
            <defs>
              <radialGradient id="rn-perg" cx="50%" cy="48%" r="78%">
                <stop offset="0" stopColor="#f6ecd3" />
                <stop offset="0.65" stopColor="#efe1c0" />
                <stop offset="1" stopColor="#d9c393" />
              </radialGradient>
              <radialGradient id="rn-vineta" cx="50%" cy="50%" r="72%">
                <stop offset="0.62" stopColor="#6b4a22" stopOpacity="0" />
                <stop offset="1" stopColor="#6b4a22" stopOpacity="0.42" />
              </radialGradient>
              <filter id="rn-ruido" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.55 0" />
              </filter>
              <filter id="rn-manchas" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="3" result="m" />
                <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 1.1 -0.45" />
              </filter>
              <linearGradient id="rn-rio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7fa6b4" />
                <stop offset="1" stopColor="#5f8797" />
              </linearGradient>
            </defs>

            {/* pergamino: base, manchas, grano y viñeta */}
            <rect width={ANCHO} height={ALTO} fill="url(#rn-perg)" />
            <rect width={ANCHO} height={ALTO} filter="url(#rn-manchas)" opacity="0.5" />
            <rect width={ANCHO} height={ALTO} filter="url(#rn-ruido)" opacity="0.32" className="rn-grano" />

            {/* territorios */}
            {TERRITORIOS.map((t) => (
              <g key={t.clave}>
                <rect x={t.x0} y={60} width={t.x1 - t.x0} height={ALTO - 120} fill={t.tinte} opacity="0.1" />
              </g>
            ))}
            <g fill="none" stroke={REINO.sepia} strokeWidth="1.2" strokeDasharray="2 5" strokeLinecap="round" opacity="0.7">
              {TERRITORIOS.slice(1).map((t) => (
                <path key={t.clave} d={`M${t.x0} 62 C ${t.x0 - 12} 200, ${t.x0 + 12} 420, ${t.x0} ${ALTO - 62}`} />
              ))}
            </g>

            {/* río */}
            <path d={RIO_D} fill="none" stroke="url(#rn-rio)" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
            <path d={RIO_D} fill="none" stroke="#4f7686" strokeWidth="1.4" strokeLinecap="round" />
            <path d={RIO_D} fill="none" stroke="#e9f1f0" strokeWidth="1" strokeDasharray="6 14" strokeLinecap="round" opacity="0.8" />

            {/* camino */}
            <path d={CAMINO_D} fill="none" stroke="#c9b083" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
            <path d={CAMINO_D} fill="none" stroke={REINO.sepia} strokeWidth="1" strokeDasharray="1 7" strokeLinecap="round" opacity="0.7" />
            <Puente x={X_RIO} />

            {/* decoración de cada territorio */}
            <Tienda x={70} y={590} color="#7f8f4e" />
            <Tienda x={132} y={612} color={REINO.vino} s={0.85} />
            <Tienda x={196} y={590} color="#557591" s={0.95} />
            <Hoguera x={238} y={622} />
            <Estafermo x={44} y={150} />
            <Montes x={120} y={140} s={0.8} />
            <Arboleda x={330} y={606} n={7} />
            <Arboleda x={470} y={616} />
            <Atalaya x={560} y={600} />
            <Arboleda x={650} y={606} n={6} />
            <Montes x={400} y={140} s={0.7} />
            <Montes x={660} y={150} s={0.9} />
            <Feudo x={870} y={598} />
            <Montes x={880} y={150} s={0.75} />
            <Ciudadela x={1132} y={caminoY(FIN_CAMINO) - 40} />
            <RosaVientos x={1146} y={596} />

            {/* "debería ir aquí hoy" en cada territorio con meta */}
            {TERRITORIOS.filter((t) => t.clave !== 'escuderos').map((t) => {
              const x = t.u0 + ctx.fraccion * (t.u1 - t.u0);
              const y = caminoY(x);
              return (
                <g key={`hoy-${t.clave}`} transform={`translate(${x} ${y})`} className="rn-hoy">
                  <title>Debería ir aquí hoy (mes {ctx.mes} de 12)</title>
                  <path d="M0 22 V-34" stroke={REINO.oro} strokeWidth="1.6" strokeDasharray="3 3" />
                  <path d="M0 -34 H14 L10 -29 L14 -24 H0" fill="none" stroke={REINO.oro} strokeWidth="1.3" strokeDasharray="2.5 2" />
                  <text x="0" y="34" textAnchor="middle" className="rn-mapa__hoy">hoy</text>
                </g>
              );
            })}

            {/* rótulos de los territorios */}
            {TERRITORIOS.map((t) => {
              const cx = (t.x0 + t.x1) / 2;
              const w = Math.min(t.x1 - t.x0 - 16, 260);
              return (
                <g key={`rot-${t.clave}`} transform={`translate(${cx} 84)`}>
                  <path d={`M${-w / 2} -16 H${w / 2} L${w / 2 + 8} 0 L${w / 2} 16 H${-w / 2} L${-w / 2 - 8} 0 Z`} fill="#f6edd6" stroke={REINO.sepia} strokeWidth="1" />
                  <path d={`M${-w / 2 + 4} -12 H${w / 2 - 4} M${-w / 2 + 4} 12 H${w / 2 - 4}`} stroke={t.tinte} strokeWidth="1.4" />
                  <text y="-1" textAnchor="middle" className="rn-mapa__territorio">{t.nombre}</text>
                  <text y="10" textAnchor="middle" className="rn-mapa__sub">{t.sub}</text>
                </g>
              );
            })}

            {/* estandartes de los asesores */}
            <g>
              {[...marcadores].sort((p, q) => p.y - q.y).map((m) => {
                const activo = m.a.nombre === sel;
                const detalle = m.meta
                  ? `${m.a.nombre} · meta ${m.meta.nivel.etiqueta} · lleva ${fMoney(m.meta.lleva)} · ritmo ${m.meta.pctRitmo.toFixed(2)}%`
                  : `${m.a.nombre} · escudero · índice ${m.indice?.indice.toFixed(0)} / 100`;
                return (
                  <g
                    key={m.a.nombre}
                    className={`rn-marcador${activo ? ' rn-marcador--sel' : ''}`}
                    transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}
                    role="button"
                    tabIndex={0}
                    aria-label={detalle}
                    onClick={(e) => { e.stopPropagation(); setSel(activo ? null : m.a.nombre); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(activo ? null : m.a.nombre); } }}
                  >
                    <title>{detalle}</title>
                    <EstandarteAsesorG nombre={m.a.nombre} color={m.blason.color} seleccionado={activo} />
                    <text x="0" y="12" textAnchor="middle" className="rn-marcador__nombre">{nombreCorto(m.a.nombre)}</text>
                  </g>
                );
              })}
            </g>

            {/* título */}
            <g transform={`translate(${ANCHO / 2} 30)`}>
              <path d="M-210 -18 H210 L198 0 L210 18 H-210 L-198 0 Z" fill={REINO.vino} stroke={REINO.oro} strokeWidth="1.6" />
              <path d="M-196 -13 H196 M-196 13 H196" stroke={REINO.oroClaro} strokeWidth="0.7" opacity="0.8" />
              <text y="2" textAnchor="middle" className="rn-mapa__titulo">El Reino de Terra</text>
              <text y="12" textAnchor="middle" className="rn-mapa__subtitulo">Mes {ctx.mes} de 12 · montos al {fechaCorta(ctx.fechaCorte)}</text>
            </g>

            {/* viñeta y marco */}
            <rect width={ANCHO} height={ALTO} fill="url(#rn-vineta)" pointerEvents="none" />
            <rect x="7" y="7" width={ANCHO - 14} height={ALTO - 14} fill="none" stroke={REINO.sepia} strokeWidth="2.4" pointerEvents="none" />
            <rect x="13" y="13" width={ANCHO - 26} height={ALTO - 26} fill="none" stroke={REINO.oro} strokeWidth="0.9" pointerEvents="none" />
          </svg>
        </div>
        {seleccionado && <PanelReino m={seleccionado} ctx={ctx} onCerrar={() => setSel(null)} />}
      </div>

      <ul className="rn-teams">
        {teams.map((t) => (
          <li key={t.color}><span className="rn-teams__chip" style={{ background: PALETA[t.color].base }} />{t.nombre}</li>
        ))}
        <li><span className="rn-teams__chip" style={{ background: REINO.sinTeam }} />Sin Team</li>
      </ul>
      <p className="rn-card__foot">
        Escuderos: avanzan con su índice de capacitación. Caballeros (360K): comisión oficina + asesor. Señores (500K) y
        Corona (1M): comisión total de la operación, incluidas las compartidas. La línea punteada dorada marca dónde
        deberían ir hoy (meta × mes {ctx.mes} ÷ 12).
      </p>
    </section>
  );
}

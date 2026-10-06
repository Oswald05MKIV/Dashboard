import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import dashboardJson from '../generated/dashboard.json';
import type { Advisor, DashboardData } from '../types';
import type { ColorTeam, IntegranteTeam, Team } from '../lib/teams';
import { fMoney, fNum, fPct, rankOf, safeDiv } from '../lib/metrics';
import { contextoMetas, enCapacitacion, indiceCapacitacion, metaIndividual } from '../lib/metasNiveles';
import { buscarPorNombre } from '../lib/nombres';
import { CIVILIZACIONES, Estandarte, EstandarteG, PALETA, Soldado } from './civilizaciones';
import { BotonCaptura } from './TopsJulio';

/**
 * Mapa de conquista de la pestaña Teams.
 *
 * Cada civilización (equipo) controla una parte del mapa proporcional a su
 * desempeño. El puntaje se arma con las métricas que ya calcula el dashboard:
 * las del periodo (tabla de Teams) y las anuales de dashboard.json (cierres y
 * comisión). Los leads NO cuentan ni se muestran en Teams. Todo se deriva con useMemo, así
 * que cuando cambian los datos el mapa se recalcula solo.
 *
 * El territorio es una rejilla de hexágonos: cada casilla se la queda la
 * civilización con mayor "influencia" sobre ella (peso del equipo dividido por
 * la distancia a su capital). Un equipo en ceros conserva un núcleo mínimo
 * alrededor de su fortaleza.
 */

const data = dashboardJson as DashboardData;

/* ------------------------------------------------------------------ */
/* Datos por equipo y por asesor (reutilizando lo ya calculado).       */
/* ------------------------------------------------------------------ */

export type Miembro = {
  fila: IntegranteTeam;
  team: Team;
  advisor: Advisor | null;
};

type StatsTeam = {
  team: Team;
  miembros: Miembro[];
  cierres: number;
  comTotal: number;
};

/** Métricas que alimentan el puntaje y su peso relativo. */
const METRICAS_MAPA: { nombre: string; peso: number; valor: (s: StatsTeam) => number }[] = [
  { nombre: 'recorridos', peso: 1, valor: (s) => s.team.total.recorridos },
  { nombre: 'opciones mostradas', peso: 1, valor: (s) => s.team.total.mostradas },
  { nombre: 'propiedades opcionadas', peso: 1.5, valor: (s) => s.team.total.opcionadas },
  { nombre: 'monto en rentas', peso: 1.5, valor: (s) => s.team.total.rentas },
  { nombre: 'monto en ventas', peso: 2, valor: (s) => s.team.total.ventas },
  { nombre: 'cierres del año', peso: 2, valor: (s) => s.cierres },
  { nombre: 'comisión total', peso: 2, valor: (s) => s.comTotal },
];

function statsDe(teams: readonly Team[]): StatsTeam[] {
  return teams.map((team) => {
    const miembros: Miembro[] = team.integrantes.map((fila) => ({
      fila,
      team,
      advisor: (data.advisors.find((x) => x.nombre === fila.canonico) ?? buscarPorNombre(data.advisors, fila.nombre)) ?? null,
    }));
    const sum = (f: (m: Miembro) => number) => miembros.reduce((acc, m) => acc + f(m), 0);
    const cierres = sum((m) => m.advisor?.totales.cierres ?? 0);
    return {
      team,
      miembros,
      cierres,
      comTotal: sum((m) => m.advisor?.totales.comTotal ?? 0),
    };
  });
}

/** Puntaje 0–1: promedio ponderado de cada métrica normalizada contra el mejor equipo. */
function puntajes(stats: StatsTeam[]): number[] {
  const usadas = METRICAS_MAPA.map((m) => ({ ...m, tope: Math.max(...stats.map(m.valor)) })).filter((m) => m.tope > 0);
  const pesoTotal = usadas.reduce((a, m) => a + m.peso, 0);
  return stats.map((s) => (pesoTotal ? usadas.reduce((a, m) => a + (m.peso * m.valor(s)) / m.tope, 0) / pesoTotal : 0));
}

/* ------------------------------------------------------------------ */
/* Geometría del mapa                                                   */
/* ------------------------------------------------------------------ */

const ANCHO = 1000;
const ALTO = 620;
const R = 13; // radio del hexágono
const W = Math.sqrt(3) * R;
const X0 = 34;
const Y0 = 78;
const COLS = Math.floor((ANCHO - 2 * X0) / W);
const FILAS = Math.floor((ALTO - Y0 - 40) / (1.5 * R));
const RADIO_CAPITALES = 230;
const CENTRO = { x: ANCHO / 2, y: 310 };
const PESO_MINIMO = 0.12; // un equipo en ceros conserva este peso (su núcleo)
const EXPONENTE = 1.7; // qué tan rápido cae la influencia con la distancia
const UMBRAL = 0.42; // influencia mínima para reclamar una casilla; si no, queda neutral
const NUCLEO = 30; // px alrededor de la capital que siempre son del equipo

const ORDEN_CAPITALES: ColorTeam[] = ['red', 'blue', 'white', 'green', 'purple', 'orange'];
const ANGULOS = [240, 300, 0, 60, 120, 180]; // NO, NE, E, SE, SO, O

export const CAPITALES: Record<ColorTeam, { x: number; y: number }> = ORDEN_CAPITALES.reduce((acc, clave, i) => {
  const a = (ANGULOS[i] * Math.PI) / 180;
  acc[clave] = { x: CENTRO.x + RADIO_CAPITALES * Math.cos(a), y: CENTRO.y + RADIO_CAPITALES * Math.sin(a) };
  return acc;
}, {} as Record<ColorTeam, { x: number; y: number }>);

const ESQUINAS = Array.from({ length: 6 }, (_, k) => {
  const a = ((60 * k - 30) * Math.PI) / 180;
  return { x: R * Math.cos(a), y: R * Math.sin(a) };
});
const VECINOS = Array.from({ length: 6 }, (_, k) => {
  const a = (60 * k * Math.PI) / 180;
  return { x: W * Math.cos(a), y: W * Math.sin(a) };
});

type Hex = { x: number; y: number; vecinos: number[] };

const clave = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;

function construirRejilla(): Hex[] {
  const hexes: Hex[] = [];
  const indice = new Map<string, number>();
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLS; c++) {
      const x = X0 + W * (c + (f % 2) * 0.5) + W / 2;
      const y = Y0 + 1.5 * R * f;
      indice.set(clave(x, y), hexes.length);
      hexes.push({ x, y, vecinos: [] });
    }
  }
  for (const h of hexes) {
    h.vecinos = VECINOS.map((v) => indice.get(clave(h.x + v.x, h.y + v.y)) ?? -1);
  }
  return hexes;
}

const REJILLA = construirRejilla();

const hexPath = (h: Hex) =>
  ESQUINAS.map((e, i) => `${i ? 'L' : 'M'}${(h.x + e.x).toFixed(1)} ${(h.y + e.y).toFixed(1)}`).join(' ') + 'Z';

const bordePath = (h: Hex, k: number) => {
  const a = ESQUINAS[k], b = ESQUINAS[(k + 1) % 6];
  return `M${(h.x + a.x).toFixed(1)} ${(h.y + a.y).toFixed(1)}L${(h.x + b.x).toFixed(1)} ${(h.y + b.y).toFixed(1)}`;
};

/** A quién pertenece cada casilla (-1 = tierra neutral). */
function repartir(teams: readonly Team[], pesos: number[]): number[] {
  return REJILLA.map((h) => {
    let mejor = -1, mejorValor = UMBRAL;
    for (let i = 0; i < teams.length; i++) {
      const cap = CAPITALES[teams[i].color];
      const d = Math.hypot(h.x - cap.x, h.y - cap.y);
      if (d <= NUCLEO) return i;
      const v = pesos[i] / Math.pow(d / RADIO_CAPITALES, EXPONENTE);
      if (v > mejorValor) { mejorValor = v; mejor = i; }
    }
    return mejor;
  });
}

type Territorio = { relleno: string; frontera: string; casillas: number };

function territorios(teams: readonly Team[], dueno: number[]): Territorio[] {
  const acc = teams.map(() => ({ relleno: [] as string[], frontera: [] as string[], casillas: 0 }));
  dueno.forEach((d, i) => {
    if (d < 0) return;
    const h = REJILLA[i];
    acc[d].relleno.push(hexPath(h));
    acc[d].casillas++;
    h.vecinos.forEach((v, k) => {
      if (v >= 0 && dueno[v] !== d) acc[d].frontera.push(bordePath(h, k));
    });
  });
  return acc.map((a) => ({ relleno: a.relleno.join(''), frontera: a.frontera.join(''), casillas: a.casillas }));
}

type Puesto = { miembro: Miembro; x: number; y: number };

/** Ubica a cada asesor dentro del territorio de su equipo, sin encimarse. */
function desplegar(stats: StatsTeam[], dueno: number[]): Puesto[] {
  const puestos: Puesto[] = [];
  // ancho aproximado de la etiqueta con el nombre (fuente ~8.75px en el mapa)
  const anchoNombre = (n: string) => 5.2 * n.length + 8;
  const libre = (x: number, y: number, nombre: string) =>
    puestos.every((p) => Math.abs(p.x - x) >= (anchoNombre(nombre) + anchoNombre(p.miembro.fila.nombre)) / 2 || Math.abs(p.y - y) >= 46);
  // ninguna capital (con su etiqueta y estandarte) debe quedar tapada por un soldado
  const lejosDeCapitales = (x: number, y: number) =>
    Object.values(CAPITALES).every((c) => Math.abs(x - c.x) > 88 || y < c.y - 100 || y > c.y + 74);
  stats.forEach((s, i) => {
    const cap = CAPITALES[s.team.color];
    const propios = REJILLA
      .map((h, idx) => ({ h, d: Math.hypot(h.x - cap.x, h.y - cap.y), idx }))
      .filter((c) => dueno[c.idx] === i && c.h.y > Y0 + 6 && c.h.y < ALTO - 84)
      .sort((a, b) => a.d - b.d);
    // primero las casillas que no estorban a ninguna capital; si el territorio
    // es muy chico, se admite cualquier casilla propia
    const pasadas = [
      propios.filter((c) => lejosDeCapitales(c.h.x, c.h.y)),
      propios.filter((c) => c.d > 50 && !(Math.abs(c.h.x - cap.x) < 46 && c.h.y > cap.y && c.h.y < cap.y + 70)),
    ];
    let n = 0;
    for (const m of s.miembros) {
      let puesto: Puesto | null = null;
      for (const lista of pasadas) {
        for (const c of lista) {
          if (libre(c.h.x, c.h.y, m.fila.nombre)) { puesto = { miembro: m, x: c.h.x, y: c.h.y }; break; }
        }
        if (puesto) break;
      }
      if (!puesto) {
        // sin casillas libres: guardia a los costados de la fortaleza, dentro del mapa
        const lado = n % 2 ? 1 : -1;
        const x = Math.min(ANCHO - 60, Math.max(60, cap.x + lado * (62 + 40 * Math.floor(n / 2))));
        puesto = { miembro: m, x, y: cap.y + 6 };
      }
      puestos.push(puesto);
      n++;
    }
  });
  return puestos;
}

/* ------------------------------------------------------------------ */
/* Decoración cartográfica (estática)                                   */
/* ------------------------------------------------------------------ */

const TINTA = '#5a4632';

function Montana({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={TINTA} strokeWidth="1.1" strokeLinejoin="round">
      <path d="M-22 12 L-8 -14 L4 0 L12 -8 L26 12 Z" fill="#d9c9a5" />
      <path d="M-22 12 L-8 -14 L-2 4 Z" fill="#b8a27a" />
      <path d="M12 -8 L26 12 L14 12 Z" fill="#b8a27a" />
      <path d="M-11 -8 L-8 -14 L-5 -8" fill="#f4efe3" stroke="none" />
      {/* sombreado a plumilla */}
      <path d="M-17 10 L-11 -2 M-13 11 L-8 0 M-9 11 L-5 3 M16 10 L19 6 M19 11 L21 8" strokeWidth="0.6" opacity="0.55" />
    </g>
  );
}

function Colinas({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={TINTA} strokeWidth="0.9" strokeLinecap="round" opacity="0.7">
      <path d="M-24 6 Q-14 -6 -4 6" />
      <path d="M-8 8 Q4 -8 16 8" />
      <path d="M8 4 Q16 -4 26 4" />
      <path d="M-16 4 v-2 M0 4 v-3 M14 3 v-2" strokeWidth="0.6" />
    </g>
  );
}

function Aldea({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={TINTA} strokeWidth="0.8" strokeLinejoin="round">
      <path d="M-12 6 V-1 L-7 -6 L-2 -1 V6 Z" fill="#eadfc4" />
      <path d="M-13 0 L-7 -7 L-1 0" fill="none" stroke="#8a3b2c" strokeWidth="1.6" />
      <path d="M2 6 V0 L8 -6 L14 0 V6 Z" fill="#e3d6b6" />
      <path d="M1 1 L8 -7 L15 1" fill="none" stroke="#8a3b2c" strokeWidth="1.6" />
      <path d="M-3 7 V-8 L-1 -12 L1 -8 V7" fill="#d8caa6" />
      <path d="M-1 -12 V-16" />
    </g>
  );
}

function Bosque({ x, y }: { x: number; y: number }) {
  const puntos = [[0, 0], [9, -4], [-8, -5], [4, 7], [-3, 8], [12, 5], [-13, 3]];
  return (
    <g transform={`translate(${x} ${y})`} stroke={TINTA} strokeWidth="0.8">
      {puntos.map(([px, py], i) => (
        <g key={i}>
          <path d={`M${px} ${py + 4} v3`} />
          {i % 3 === 1 ? (
            <path d={`M${px - 4.5} ${py + 4} L${px} ${py - 7} L${px + 4.5} ${py + 4} Z`} fill="#7f9467" />
          ) : (
            <circle cx={px} cy={py} r="4.2" fill={i % 2 ? '#8ea377' : '#a3b58c'} />
          )}
        </g>
      ))}
    </g>
  );
}

function Fortaleza({ x, y, clave, nombre }: { x: number; y: number; clave: ColorTeam; nombre: string }) {
  const c = PALETA[clave];
  return (
    <g transform={`translate(${x} ${y})`} className="tt-ciudad">
      <circle r="26" fill={c.base} className="tt-ciudad__halo" />
      <g stroke={TINTA} strokeWidth="1.1" strokeLinejoin="round">
        <rect x="-19" y="-6" width="38" height="18" fill="#e6dcc3" />
        <path d="M-19 -6 v-4 h4 v4 h5 v-4 h4 v4 h5 v-4 h4 v4 h5 v-4 h4 v4 h5 v-4 h4 v4" fill="#e6dcc3" />
        <rect x="-14" y="-16" width="9" height="10" fill="#d6c8a8" />
        <rect x="5" y="-16" width="9" height="10" fill="#d6c8a8" />
        <rect x="-5" y="-22" width="10" height="16" fill="#cfc0a0" />
        <rect x="-2.2" y="4" width="4.4" height="8" fill={TINTA} />
        <path d="M0 -22 v-10" strokeWidth="1.4" />
        <path d="M0 -32 h9 l-2.5 3 2.5 3 h-9z" fill={c.base} stroke="none" className="tt-ondear" style={{ transformOrigin: '0px -32px' }} />
      </g>
      <text y="26" textAnchor="middle" className="tt-mapa__ciudad">{nombre}</text>
    </g>
  );
}

function Terreno() {
  return (
    <g>
      {/* ríos */}
      <g fill="none" strokeLinecap="round">
        <path d="M60 520 C 200 470, 260 380, 420 350 S 560 250, 650 140 S 880 90, 960 60" stroke="#8fb3c2" strokeWidth="9" opacity="0.35" />
        <path d="M60 520 C 200 470, 260 380, 420 350 S 560 250, 650 140 S 880 90, 960 60" stroke="#8fb3c2" strokeWidth="5" opacity="0.55" />
        <path d="M60 520 C 200 470, 260 380, 420 350 S 560 250, 650 140 S 880 90, 960 60" stroke="#5f8ea4" strokeWidth="1.4" />
        <path d="M60 520 C 200 470, 260 380, 420 350 S 560 250, 650 140 S 880 90, 960 60" stroke="#eef4f2" strokeWidth="0.8" strokeDasharray="5 16" opacity="0.8" />
        <path d="M950 560 C 820 520, 760 440, 660 430 S 540 470, 470 560" stroke="#8fb3c2" strokeWidth="8" opacity="0.35" />
        <path d="M950 560 C 820 520, 760 440, 660 430 S 540 470, 470 560" stroke="#8fb3c2" strokeWidth="4" opacity="0.55" />
        <path d="M950 560 C 820 520, 760 440, 660 430 S 540 470, 470 560" stroke="#5f8ea4" strokeWidth="1.2" />
        <path d="M950 560 C 820 520, 760 440, 660 430 S 540 470, 470 560" stroke="#eef4f2" strokeWidth="0.8" strokeDasharray="5 16" opacity="0.8" />
      </g>
      {/* caminos entre capitales */}
      <g fill="none" stroke={TINTA} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.65">
        <path d={`M${CAPITALES.red.x} ${CAPITALES.red.y} Q 500 90 ${CAPITALES.blue.x} ${CAPITALES.blue.y}`} />
        <path d={`M${CAPITALES.blue.x} ${CAPITALES.blue.y} Q 720 200 ${CAPITALES.white.x} ${CAPITALES.white.y}`} />
        <path d={`M${CAPITALES.white.x} ${CAPITALES.white.y} Q 720 420 ${CAPITALES.green.x} ${CAPITALES.green.y}`} />
        <path d={`M${CAPITALES.green.x} ${CAPITALES.green.y} Q 500 540 ${CAPITALES.purple.x} ${CAPITALES.purple.y}`} />
        <path d={`M${CAPITALES.purple.x} ${CAPITALES.purple.y} Q 280 420 ${CAPITALES.orange.x} ${CAPITALES.orange.y}`} />
        <path d={`M${CAPITALES.orange.x} ${CAPITALES.orange.y} Q 280 200 ${CAPITALES.red.x} ${CAPITALES.red.y}`} />
        <path d={`M${CAPITALES.orange.x} ${CAPITALES.orange.y} Q 400 330 ${CAPITALES.white.x} ${CAPITALES.white.y}`} opacity="0.5" />
      </g>
      {/* macizo central y cordilleras */}
      <Montana x={470} y={300} s={1.15} />
      <Montana x={520} y={318} s={0.9} />
      <Montana x={492} y={340} s={0.7} />
      <Montana x={120} y={150} s={0.9} />
      <Montana x={150} y={168} s={0.7} />
      <Montana x={880} y={470} s={1} />
      <Montana x={910} y={490} s={0.75} />
      <Montana x={840} y={250} s={0.7} />
      <Montana x={200} y={470} s={0.75} />
      {/* bosques */}
      <Bosque x={300} y={200} />
      <Bosque x={700} y={200} />
      <Bosque x={620} y={420} />
      <Bosque x={330} y={430} />
      <Bosque x={900} y={140} />
      <Bosque x={110} y={330} />
      <Bosque x={560} y={520} />
      <Bosque x={420} y={110} />
      {/* colinas y aldeas */}
      <Colinas x={250} y={300} />
      <Colinas x={760} y={330} />
      <Colinas x={600} y={560} />
      <Colinas x={380} y={540} />
      <Colinas x={820} y={170} />
      <Aldea x={360} y={300} />
      <Aldea x={640} y={330} />
      <Aldea x={500} y={170} />
      <Aldea x={500} y={450} />
    </g>
  );
}

function Marco() {
  const grat = [];
  for (let x = 100; x < ANCHO; x += 100) grat.push(<path key={`x${x}`} d={`M${x} 14 V${ALTO - 14}`} />);
  for (let y = 100; y < ALTO; y += 100) grat.push(<path key={`y${y}`} d={`M14 ${y} H${ANCHO - 14}`} />);
  return (
    <g>
      <g stroke={TINTA} strokeWidth="0.5" opacity="0.14">{grat}</g>
      <rect width={ANCHO} height={ALTO} fill="url(#tt-vineta)" pointerEvents="none" />
      <rect x="8" y="8" width={ANCHO - 16} height={ALTO - 16} fill="none" stroke={TINTA} strokeWidth="2.2" />
      <rect x="14" y="14" width={ANCHO - 28} height={ALTO - 28} fill="none" stroke="#b8892b" strokeWidth="0.9" />
      {/* esquinas ornamentales */}
      {[[14, 14, 0], [ANCHO - 14, 14, 90], [ANCHO - 14, ALTO - 14, 180], [14, ALTO - 14, 270]].map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) rotate(${r})`} stroke={TINTA} strokeWidth="1" fill="none">
          <path d="M0 26 C 6 14, 14 6, 26 0" />
          <path d="M4 20 C 12 18, 18 12, 20 4" strokeWidth="0.7" />
          <circle cx="9" cy="9" r="3" fill="#b8892b" stroke="none" />
        </g>
      ))}
      {/* rosa de los vientos */}
      <g transform={`translate(${ANCHO - 78} 82)`} stroke={TINTA} strokeWidth="1" strokeLinejoin="round">
        <circle r="30" fill="none" opacity="0.6" />
        <circle r="22" fill="none" strokeWidth="0.6" opacity="0.5" strokeDasharray="1.5 2.5" />
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((g) => (
          <path key={g} transform={`rotate(${g})`} d="M0 -19 L2.4 -4 L0 0 L-2.4 -4 Z" fill="#efe5cc" strokeWidth="0.6" />
        ))}
        <path d="M0 -30 L6 -6 L0 0 L-6 -6 Z" fill="#e6dcc3" />
        <path d="M0 30 L6 6 L0 0 L-6 6 Z" fill="#e6dcc3" />
        <path d="M30 0 L6 6 L0 0 L6 -6 Z" fill="#e6dcc3" />
        <path d="M-30 0 L-6 6 L0 0 L-6 -6 Z" fill="#e6dcc3" />
        <path d="M0 -30 L0 0 L-6 -6 Z M30 0 L0 0 L6 -6 Z M0 30 L0 0 L6 6 Z M-30 0 L0 0 L-6 6 Z" fill={TINTA} stroke="none" />
        <circle r="3" fill="#b8892b" stroke="none" />
        <path d="M18 -18 L0 0 M-18 -18 L0 0 M18 18 L0 0 M-18 18 L0 0" strokeWidth="0.7" opacity="0.6" />
        <text y="-35" textAnchor="middle" className="tt-mapa__rosa">N</text>
      </g>
      {/* escala */}
      <g transform={`translate(${ANCHO - 200} ${ALTO - 34})`} stroke={TINTA} strokeWidth="1">
        <rect x="0" y="0" width="30" height="5" fill={TINTA} />
        <rect x="30" y="0" width="30" height="5" fill="#e6dcc3" />
        <rect x="60" y="0" width="30" height="5" fill={TINTA} />
        <rect x="90" y="0" width="30" height="5" fill="#e6dcc3" />
        <text x="0" y="-4" className="tt-mapa__escala">0</text>
        <text x="120" y="-4" textAnchor="end" className="tt-mapa__escala">100 leguas</text>
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Panel del asesor                                                     */
/* ------------------------------------------------------------------ */

const mxn = (n: number) => fMoney(n);

function Fila({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="tt-panel__row">
      <span>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

function PanelAsesor({ m, onCerrar }: { m: Miembro; onCerrar: () => void }) {
  const c = PALETA[m.team.color];
  const civ = CIVILIZACIONES[m.team.color];
  const a = m.advisor;
  // Meta anual de su nivel (360K / 500K / 1M); en capacitación, índice de formación.
  const ctx = contextoMetas(data);
  const escudero = a ? enCapacitacion(a) : false;
  const meta = a && !escudero ? metaIndividual(a, ctx) : null;
  const metaPct = meta ? meta.pctMeta : a ? indiceCapacitacion(a, data, ctx).indice : 0;
  const estilo = { ['--tt-team' as string]: c.base, ['--tt-team-soft' as string]: c.suave, ['--tt-team-line' as string]: c.linea, ['--tt-team-ink' as string]: c.texto } as CSSProperties;
  return (
    <aside className="tt-panel" style={estilo} role="dialog" aria-label={`Estadísticas de ${m.fila.nombre}`}>
      <header className="tt-panel__head">
        <Estandarte clave={m.team.color} alto={40} />
        <div>
          <p className="tt-panel__team">{m.team.nombre} · {civ.imperio}</p>
          <h4 className="tt-panel__name">{m.fila.nombre}</h4>
          {a && <p className="tt-panel__sub">#{rankOf(data, a.nombre)} en producción anual · {a.nombre}</p>}
          {!a && <p className="tt-panel__sub">{m.fila.sinDatos ? 'Alta reciente · sin captura en los archivos fuente' : 'Sin ficha anual en el dashboard'}</p>}
        </div>
        <button type="button" className="tt-panel__close" onClick={onCerrar} aria-label="Cerrar">×</button>
      </header>

      <p className="tt-panel__section">Periodo del tablero</p>
      <Fila k="Recorridos" v={fNum(m.fila.recorridos)} />
      <Fila k="Opciones mostradas" v={fNum(m.fila.mostradas)} />
      <Fila k="Propiedades opcionadas" v={Number.isInteger(m.fila.opcionadas) ? fNum(m.fila.opcionadas) : m.fila.opcionadas.toFixed(1)} />
      <Fila k="Monto en rentas" v={mxn(m.fila.rentas)} />
      <Fila k="Monto en ventas" v={mxn(m.fila.ventas)} />

      {a && (
        <>
          <p className="tt-panel__section">Acumulado {data.year}</p>
          <Fila k="Recorridos" v={fNum(a.totales.recorridos)} />
          <Fila k="Opciones" v={fNum(a.totales.opciones)} />
          <Fila k="Propiedades opcionadas" v={fNum(a.totales.opcionadas)} />
          <Fila k="Cierres" v={fNum(a.totales.cierres)} />
          <Fila k="Apartados" v={fNum(a.totales.apartados)} />
          <Fila k="Operaciones pendientes" v={fNum(a.totales.pendientes)} />

          <p className="tt-panel__section">Productividad</p>
          <Fila k="Comisión Oficina (X)" v={mxn(a.totales.comOficina)} />
          <Fila k="Comisión Asesor (Y)" v={mxn(a.totales.comAsesor)} />
          <Fila k="Comisión total (X + Y)" v={mxn(a.totales.comTotal)} />
          {meta ? (
            <>
              <Fila k={`Meta anual · ${meta.nivel.etiqueta} (${mxn(meta.meta)})`} v={fPct(metaPct)} />
              <Fila k={`% de ritmo (mes ${ctx.mes} de 12)`} v={`${meta.pctRitmo.toFixed(2)}%`} />
            </>
          ) : (
            <Fila k="Escudero · índice de formación" v={`${Math.round(metaPct)} / 100`} />
          )}
          <div className="tt-panel__bar"><span style={{ width: `${Math.min(metaPct, 100)}%` }} /></div>
          <a className="tt-panel__link" href={`#/asesores/${encodeURIComponent(a.nombre)}`}>Ver ficha completa →</a>
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

export default function MapaConquista({ teams, periodo, onAviso }: { teams: readonly Team[]; periodo: string; onAviso: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);

  const stats = useMemo(() => statsDe(teams), [teams]);
  const puntos = useMemo(() => puntajes(stats), [stats]);
  const pesos = useMemo(() => puntos.map((p) => PESO_MINIMO + (1 - PESO_MINIMO) * p), [puntos]);
  const dueno = useMemo(() => repartir(teams, pesos), [teams, pesos]);
  const terr = useMemo(() => territorios(teams, dueno), [teams, dueno]);
  const puestos = useMemo(() => desplegar(stats, dueno), [stats, dueno]);

  const conquistadas = terr.reduce((a, t) => a + t.casillas, 0);
  const orden = terr.map((t, i) => ({ i, t, p: puntos[i] })).sort((a, b) => b.t.casillas - a.t.casillas || b.p - a.p);
  const seleccionado = puestos.find((p) => `${p.miembro.team.color}:${p.miembro.fila.nombre}` === sel) ?? null;

  return (
    <section className="tt-card tt-mapa" ref={ref}>
      <header className="tt-card__top">
        <div>
          <h3 className="tt-card__title">Mapa de conquista</h3>
          <p className="tt-card__note">
            Cada civilización controla territorio según su desempeño: el equipo con mejores números
            domina más mapa. Haz clic en un soldado para ver las estadísticas del asesor.
          </p>
        </div>
        <BotonCaptura destino={ref} archivo="mapa-conquista" onAviso={onAviso} />
      </header>

      <ul className="tt-leyenda">
        {orden.map(({ i, t, p }) => {
          const team = teams[i];
          const c = PALETA[team.color];
          const share = safeDiv(t.casillas, conquistadas) * 100;
          return (
            <li key={team.color} className="tt-leyenda__item" style={{ ['--tt-team' as string]: c.base } as CSSProperties}>
              <Estandarte clave={team.color} alto={30} />
              <div className="tt-leyenda__txt">
                <span className="tt-leyenda__name">{team.nombre}</span>
                <span className="tt-leyenda__meta">{CIVILIZACIONES[team.color].imperio} · puntaje {Math.round(p * 100)}</span>
                <span className="tt-leyenda__bar"><span style={{ width: `${share}%` }} /></span>
              </div>
              <strong className="tt-leyenda__pct">{share.toFixed(0)}%</strong>
            </li>
          );
        })}
      </ul>

      <div className="tt-mapa__lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="tt-mapa__svg" role="img" aria-label="Mapa de conquista por equipos" onClick={() => setSel(null)}>
          <defs>
            <radialGradient id="tt-pergamino" cx="50%" cy="45%" r="75%">
              <stop offset="0" stopColor="#f3ead6" />
              <stop offset="0.7" stopColor="#ebdfc2" />
              <stop offset="1" stopColor="#d9c9a3" />
            </radialGradient>
            <radialGradient id="tt-vineta" cx="50%" cy="50%" r="72%">
              <stop offset="0.6" stopColor="#6b4a22" stopOpacity="0" />
              <stop offset="1" stopColor="#6b4a22" stopOpacity="0.38" />
            </radialGradient>
            <filter id="tt-grano" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="11" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.55 0" />
            </filter>
            <filter id="tt-manchas" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.007 0.01" numOctaves="2" seed="5" result="m" />
              <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 1.1 -0.45" />
            </filter>
            {teams.map((t) => (
              <pattern key={t.color} id={`tt-trama-${t.color}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <path d="M0 0 V7" stroke={PALETA[t.color].base} strokeWidth="1" opacity="0.35" />
              </pattern>
            ))}
          </defs>
          <rect width={ANCHO} height={ALTO} fill="url(#tt-pergamino)" />
          <rect width={ANCHO} height={ALTO} filter="url(#tt-manchas)" opacity="0.45" />
          <rect width={ANCHO} height={ALTO} filter="url(#tt-grano)" opacity="0.28" className="tt-grano" />
          <g opacity="0.08" fill={TINTA}>
            <ellipse cx="180" cy="90" rx="90" ry="40" />
            <ellipse cx="860" cy="560" rx="120" ry="30" />
            <ellipse cx="520" cy="590" rx="200" ry="18" />
          </g>

          <g className="tt-territorio">
            {terr.map((t, i) => {
              const c = PALETA[teams[i].color];
              return (
                <g key={teams[i].color}>
                  <path d={t.relleno} fill={c.base} fillOpacity="0.2" stroke="none" />
                  <path d={t.relleno} fill={`url(#tt-trama-${teams[i].color})`} stroke="none" />
                  <path d={t.frontera} fill="none" stroke={c.base} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
                  <path d={t.frontera} fill="none" stroke={c.base} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                </g>
              );
            })}
          </g>

          <Terreno />

          {teams.map((t) => (
            <Fortaleza key={t.color} x={CAPITALES[t.color].x} y={CAPITALES[t.color].y} clave={t.color} nombre={CIVILIZACIONES[t.color].capital} />
          ))}

          {teams.map((t) => {
            const cap = CAPITALES[t.color];
            return (
              <g key={`e-${t.color}`} transform={`translate(${cap.x + 22} ${cap.y - 68}) scale(0.3)`}>
                <EstandarteG clave={t.color} color={PALETA[t.color].base} conAsta ondear />
              </g>
            );
          })}

          <g className="tt-soldados">
            {puestos.map((p, idx) => {
              const id = `${p.miembro.team.color}:${p.miembro.fila.nombre}`;
              const c = PALETA[p.miembro.team.color];
              const activo = id === sel;
              return (
                <g
                  key={id}
                  className={`tt-soldado${activo ? ' tt-soldado--sel' : ''}`}
                  style={{ ['--tt-idle' as string]: `${(idx % 7) * -0.55}s` } as CSSProperties}
                  transform={`translate(${p.x - 14} ${p.y - 40}) scale(0.7)`}
                  onClick={(e) => { e.stopPropagation(); setSel(activo ? null : id); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(activo ? null : id); } }}
                >
                  {activo && <circle cx="20" cy="56" r="26" fill="none" stroke={c.base} strokeWidth="2.5" strokeDasharray="4 3" />}
                  <Soldado clave={p.miembro.team.color} color={c.base} />
                  <text x="20" y="72" textAnchor="middle" className="tt-soldado__name">{p.miembro.fila.nombre}</text>
                </g>
              );
            })}
          </g>

          <g transform={`translate(30 ${ALTO - 66})`}>
            <path d="M-6 4 C -14 4, -14 16, -6 16 L -6 46 C -14 46, -14 34, -6 34" fill="#e8dcbd" stroke={TINTA} strokeWidth="1" />
            <path d="M306 4 C 314 4, 314 16, 306 16 L 306 46 C 314 46, 314 34, 306 34" fill="#e8dcbd" stroke={TINTA} strokeWidth="1" />
            <rect width="300" height="46" rx="3" fill="#f6efdd" stroke={TINTA} strokeWidth="1.2" />
            <rect x="4" y="4" width="292" height="38" rx="2" fill="none" stroke="#b8892b" strokeWidth="0.7" />
            <text x="150" y="20" textAnchor="middle" className="tt-mapa__titulo">Guerra de conquista</text>
            <text x="150" y="35" textAnchor="middle" className="tt-mapa__subtitulo">RE/MAX Terra · {periodo} · {conquistadas} de {REJILLA.length} tierras reclamadas</text>
          </g>
          <Marco />
        </svg>

        {seleccionado && <PanelAsesor m={seleccionado.miembro} onCerrar={() => setSel(null)} />}
      </div>

      <p className="tt-mapa__nota">
        Puntaje = promedio ponderado de {METRICAS_MAPA.map((m) => m.nombre).join(', ')}, cada uno normalizado
        contra el mejor equipo. Lo del periodo sale de la tabla de Teams y lo anual de la misma base
        del dashboard. Un equipo sin actividad conserva solo el núcleo alrededor de su fortaleza.
      </p>
    </section>
  );
}

import type { CSSProperties } from 'react';
import type { Advisor, DashboardData } from '../types';
import { teamDeAsesor } from '../lib/teams';
import type { ColorTeam } from '../lib/teams';
import { etiquetaSemaforo, iniciales, nivelSemaforo } from '../lib/metrics';
import { PALETA } from './civilizaciones';

/**
 * Piezas heráldicas de "El Reino" y del "Torneo de justas" (Metas).
 * Todo es SVG dibujado a mano: sin emojis ni imágenes externas.
 * Cada asesor lleva el color de su Team; quien no está en un Team va en sepia.
 */

export const REINO = {
  tinta: '#3b2a1a',
  sepia: '#5a4632',
  pergamino: '#f3e7cc',
  oro: '#b8892b',
  oroClaro: '#e3c06f',
  vino: '#7a1f2b',
  madera: '#6b4a2b',
  sinTeam: '#8a7458',
} as const;

export type Blason = { color: string; team: string | null; clave: ColorTeam | null };

/** Color heráldico del asesor (el de su Team). */
export function blasonDe(data: DashboardData, a: Advisor): Blason {
  const t = teamDeAsesor(data, a.nombre);
  return t ? { color: PALETA[t.color].base, team: t.nombre, clave: t.color } : { color: REINO.sinTeam, team: null, clave: null };
}

/** "Christian Alvarado Martínez" → "Christian A." */
export const nombreCorto = (nombre: string) => {
  const [n, ap] = nombre.split(/\s+/);
  return ap ? `${n} ${ap[0]}.` : n;
};

/* ------------------------------------------------------------------ */
/* Escudo con iniciales (HTML)                                          */
/* ------------------------------------------------------------------ */

// Las iniciales van en HTML encima del escudo (no como <text> del SVG): así la
// captura las pinta con Cinzel sin tener que incrustar la fuente en cada escudo.
export function EscudoIniciales({ nombre, color, alto = 30 }: { nombre: string; color: string; alto?: number }) {
  const ancho = (alto * 40) / 46;
  return (
    <span className="rn-escudo" style={{ width: ancho, height: alto }} aria-hidden="true">
      <svg viewBox="0 0 40 46" width={ancho} height={alto} focusable="false">
        <path d="M3 3 H37 V20 C37 33 28 40 20 44 C12 40 3 33 3 20 Z" fill={color} stroke={REINO.oro} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M7 7 H33 V20 C33 30 26 36 20 39 C14 36 7 30 7 20 Z" fill="none" stroke={REINO.oroClaro} strokeWidth="0.8" opacity="0.7" />
      </svg>
      <span className="rn-escudo__txt" style={{ fontSize: Math.round(alto * 0.3) }}>{iniciales(nombre)}</span>
    </span>
  );
}

/** Blasón de nivel para los encabezados (escudo partido con corona, torre o espada). */
export function EmblemaNivel({ nivel, alto = 34 }: { nivel: 'escuderos' | '360' | '500' | '1M'; alto?: number }) {
  const campo = nivel === '1M' ? REINO.vino : nivel === '500' ? '#2f4f6b' : nivel === '360' ? '#3d5a3a' : '#6b5232';
  return (
    <svg viewBox="0 0 40 46" width={(alto * 40) / 46} height={alto} aria-hidden="true" focusable="false">
      <path d="M3 3 H37 V20 C37 33 28 40 20 44 C12 40 3 33 3 20 Z" fill={campo} stroke={REINO.oro} strokeWidth="2.4" strokeLinejoin="round" />
      <g fill={REINO.oroClaro} stroke="none">
        {nivel === '1M' && <path d="M10 26 L12 14 L16 20 L20 11 L24 20 L28 14 L30 26 Z M10 28 H30 V31 H10 Z" />}
        {nivel === '500' && <path d="M13 31 V17 H15 V14 H18 V17 H22 V14 H25 V17 H27 V31 Z M18.5 31 V25 Q20 23 21.5 25 V31 Z" fillRule="evenodd" />}
        {nivel === '360' && <path d="M19 9 H21 V27 H25 V29 H21 V33 H19 V29 H15 V27 H19 Z" />}
        {nivel === 'escuderos' && <path d="M12 30 L20 12 L28 30 Z M17 30 L20 22 L23 30 Z" fillRule="evenodd" />}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Caballero a caballo (silueta) — caja 88 × 64, suelo en y = 54        */
/* ------------------------------------------------------------------ */

export function CaballeroG({ color }: { color: string }) {
  const caballo = '#3a2a1c';
  const acero = '#4b4f57';
  return (
    <g className="rn-caballero">
      <ellipse cx="38" cy="55" rx="24" ry="2.6" fill="#000" opacity="0.16" />
      <g className="rn-caballero__cuerpo">
        {/* cola y patas en galope */}
        <path d="M19 27 C12 26 9 31 8 37" fill="none" stroke={caballo} strokeWidth="2.8" strokeLinecap="round" />
        <g fill="none" stroke={caballo} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M52 36 L58 44 L63 45" />
          <path d="M48 37 L50 46 L54 52" />
          <path d="M24 36 L18 44 L12 45" />
          <path d="M28 37 L28 46 L26 53" />
        </g>
        {/* cuerpo, cuello y cabeza */}
        <path
          d="M18 30 C18 24 24 22 32 22 L48 22 C52 22 55 19 57 15 L60 9 C61 7 64 7 65 9 L68 15 C69 17 68 19 66 19 L62 19 C60 23 58 28 56 31 C55 35 52 37 48 37 L26 37 C21 37 18 34 18 30 Z"
          fill={caballo}
        />
        {/* gualdrapa con los colores del Team */}
        <path
          d="M22 24 L50 24 C52 28 54 32 54 36 L54 40 Q51 43 48 40 Q45 43 42 40 Q39 43 36 40 Q33 43 30 40 Q27 43 24 40 Q21 43 19 40 L19 32 C19 28 20 25 22 24 Z"
          fill={color}
          stroke={REINO.oroClaro}
          strokeWidth="0.9"
        />
        <circle cx="36" cy="32" r="2.4" fill={REINO.oroClaro} />
        {/* jinete */}
        <path d="M36 25 L38 34 L41 35" fill="none" stroke={acero} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 10 L40 10 L41 25 L31 25 Z" fill={acero} />
        <rect x="32.5" y="13" width="7.5" height="10" fill={color} />
        <path d="M31 4 C31 -0.5 41 -0.5 41 4 L41 10 L31 10 Z" fill={acero} />
        <path d="M33 6 H40" stroke="#1b1d21" strokeWidth="1" />
        <path d="M36 0 C38 -6 46 -6 48 -2 C44 -3 40 -2 37 1 Z" fill={color} />
        {/* lanza y escudo */}
        <path d="M40 16 L84 10" stroke={REINO.madera} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M40 12.5 L47 16 L40 19.5 Z" fill="#8a8f98" />
        <path d="M72 11.2 L81 10 L75 14.4 Z" fill={color} />
        <path d="M27 13 H35 V20 C35 24 31 27 31 27 C31 27 27 24 27 20 Z" fill={color} stroke={REINO.oroClaro} strokeWidth="1.1" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Escudero a pie — caja 44 × 58, suelo en y = 54                       */
/* ------------------------------------------------------------------ */

export function EscuderoG({ color }: { color: string }) {
  return (
    <g className="rn-escudero">
      <ellipse cx="20" cy="55" rx="12" ry="2.2" fill="#000" opacity="0.15" />
      <g className="rn-escudero__cuerpo">
        <path d="M17 38 L14 53 M21 38 L25 53" stroke="#3b2f22" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M12 18 H26 L28 40 H10 Z" fill={color} />
        <rect x="11" y="28" width="17" height="2.6" fill={REINO.oroClaro} />
        <circle cx="19" cy="11" r="5.5" fill="#e2c29a" />
        <path d="M13.5 10 C14 3 24 3 24.5 10 Z" fill={REINO.madera} />
        <path d="M31 2 V54" stroke={REINO.madera} strokeWidth="2" strokeLinecap="round" />
        <path d="M32 4 H43 L39 9 L43 14 H32 Z" fill={color} stroke={REINO.oro} strokeWidth="0.8" className="rn-ondear" />
        <circle cx="11" cy="27" r="6" fill={color} stroke={REINO.oroClaro} strokeWidth="1.6" />
        <circle cx="11" cy="27" r="1.8" fill={REINO.oroClaro} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Estandarte del asesor para El Reino — base en (0, 0), sube a y = -50 */
/* ------------------------------------------------------------------ */

export function EstandarteAsesorG({ nombre, color, seleccionado = false }: { nombre: string; color: string; seleccionado?: boolean }) {
  return (
    <g className="rn-estandarte">
      {seleccionado && <circle cx="10" cy="-26" r="27" fill="none" stroke={REINO.vino} strokeWidth="2" strokeDasharray="4 3" />}
      <ellipse cx="0" cy="0" rx="7" ry="2.2" fill={REINO.sepia} opacity="0.35" />
      <path d="M0 0 V-48" stroke={REINO.madera} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-1 -44 H24" stroke={REINO.madera} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="-49.5" r="2.3" fill={REINO.oro} />
      <g className="rn-ondear" style={{ '--rn-delay': `${(nombre.length % 7) * -0.4}s` } as CSSProperties}>
        <path d="M1 -44 H23 V-23 L12 -16 L1 -23 Z" fill={color} stroke={REINO.oro} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M3.5 -41.5 H20.5 V-24.5 L12 -19 L3.5 -24.5 Z" fill="none" stroke={REINO.oroClaro} strokeWidth="0.6" opacity="0.8" />
        <text x="12" y="-28" textAnchor="middle" className="rn-estandarte__ini">{iniciales(nombre)}</text>
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Semáforo del % de ritmo (2 decimales, mismos rangos del proyecto)    */
/* ------------------------------------------------------------------ */

export function RitmoBadge({ pct }: { pct: number }) {
  const n = nivelSemaforo(pct);
  return (
    <span className={`badge ${n}`} title={etiquetaSemaforo(n)}>
      <span className={`dot ${n}`} />
      {pct.toFixed(2)}%
    </span>
  );
}

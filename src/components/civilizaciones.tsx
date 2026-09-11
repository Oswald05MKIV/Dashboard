import type { ReactNode } from 'react';
import type { ColorTeam } from '../data/agosto2026Teams';

/**
 * Iconografía de las civilizaciones de Teams. Todo es SVG vectorial dibujado a
 * mano, sin emojis ni imágenes externas. La clave es `ColorTeam` (la clave
 * interna estable del equipo), no el nombre que se muestra.
 *
 * Los colores del equipo llegan por variables CSS que ya define la tarjeta
 * (--tt-team, --tt-team-ink); el dorado es el mismo --tt-oro del resto.
 */

// Paleta de los equipos (antes vivía en Teams.tsx; se comparte con el mapa).
export const PALETA: Record<ColorTeam, { base: string; suave: string; linea: string; texto: string }> = {
  red: { base: '#e4002b', suave: '#fde7eb', linea: '#f7bcc7', texto: '#a10020' },
  blue: { base: '#0057b8', suave: '#e5eefa', linea: '#b9d0ee', texto: '#013f86' },
  white: { base: '#5b6472', suave: '#eef1f5', linea: '#d3dae3', texto: '#3b434f' },
  green: { base: '#1e9e5a', suave: '#e5f5ec', linea: '#b6e0c8', texto: '#14713f' },
  purple: { base: '#7a4fce', suave: '#f0eafb', linea: '#d3c3f0', texto: '#563394' },
  orange: { base: '#f07314', suave: '#fdeee0', linea: '#f8cda3', texto: '#a94c07' },
};

export const ORO = 'var(--tt-oro, #c8952a)';
const ORO_CLARO = '#e6c77a';

export type Civilizacion = {
  clave: ColorTeam;
  /** Nombre histórico corto para el mapa y el panel. */
  imperio: string;
  /** Nombre de la capital en el mapa. */
  capital: string;
};

export const CIVILIZACIONES: Record<ColorTeam, Civilizacion> = {
  red: { clave: 'red', imperio: 'Imperio Chino', capital: "Chang'an" },
  blue: { clave: 'blue', imperio: 'Imperio Azteca', capital: 'Tenochtitlan' },
  white: { clave: 'white', imperio: 'Imperio Persa', capital: 'Persépolis' },
  green: { clave: 'green', imperio: 'Polis Griegas', capital: 'Atenas' },
  purple: { clave: 'purple', imperio: 'Reino de Troya', capital: 'Troya' },
  orange: { clave: 'orange', imperio: 'República Romana', capital: 'Roma' },
};

/* ------------------------------------------------------------------ */
/* Emblemas: cada uno se dibuja en una caja de 100 × 100.              */
/* ------------------------------------------------------------------ */

function EmblemaChinos() {
  // Moneda imperial (círculo con orificio cuadrado) y anillo de nubes.
  return (
    <g fill="none" stroke={ORO_CLARO} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="34" strokeWidth="6" />
      <circle cx="50" cy="50" r="24" strokeWidth="2" opacity="0.7" />
      <rect x="41" y="41" width="18" height="18" strokeWidth="4" />
      <path d="M50 8 l4 6 -4 6 -4 -6z M50 92 l4 -6 -4 -6 -4 6z M8 50 l6 4 6 -4 -6 -4z M92 50 l-6 4 -6 -4 6 -4z" fill={ORO_CLARO} stroke="none" />
    </g>
  );
}

function EmblemaAztecas() {
  // Piedra del Sol simplificada: anillos concéntricos y ocho rayos.
  const rayos = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const c = Math.cos(a), s = Math.sin(a);
    const p = (r: number, da: number) => `${50 + r * Math.cos(a + da)} ${50 + r * Math.sin(a + da)}`;
    return `M${50 + 30 * c} ${50 + 30 * s} L${p(41, 0.16)} L${50 + 46 * c} ${50 + 46 * s} L${p(41, -0.16)} Z`;
  }).join(' ');
  return (
    <g fill="none" stroke={ORO_CLARO} strokeLinejoin="round">
      <path d={rayos} fill={ORO_CLARO} stroke="none" />
      <circle cx="50" cy="50" r="30" strokeWidth="3" />
      <circle cx="50" cy="50" r="21" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="13" strokeWidth="3" />
      <circle cx="50" cy="50" r="5" fill={ORO_CLARO} stroke="none" />
    </g>
  );
}

function EmblemaPersas() {
  // Faravahar simplificado: disco alado con cola.
  return (
    <g fill={ORO_CLARO} stroke={ORO_CLARO} strokeLinejoin="round" strokeWidth="1.5">
      <path d="M44 50 L6 40 L13 47 L7 53 L15 58 L10 66 L44 58 Z" />
      <path d="M56 50 L94 40 L87 47 L93 53 L85 58 L90 66 L56 58 Z" />
      <path d="M40 30 h20 v6 h-20z" fill="none" opacity="0.9" />
      <circle cx="50" cy="49" r="12" fill="none" strokeWidth="4" />
      <circle cx="50" cy="49" r="4" />
      <path d="M43 60 L38 84 L50 76 L62 84 L57 60 Z" />
      <path d="M50 62 v14" fill="none" strokeWidth="2" opacity="0.7" />
    </g>
  );
}

function EmblemaGriegos() {
  // Columna dórica entre dos bandas de greca (meandro).
  const greca = (y: number) =>
    `M10 ${y} h80 M10 ${y + 8} h12 v-5 h-6 v-2 M30 ${y + 8} h12 v-5 h-6 v-2 M50 ${y + 8} h12 v-5 h-6 v-2 M70 ${y + 8} h12 v-5 h-6 v-2`;
  return (
    <g fill="none" stroke={ORO_CLARO} strokeWidth="2.2" strokeLinecap="square">
      <path d={greca(10)} />
      <path d={greca(80)} />
      <rect x="35" y="30" width="30" height="5" fill={ORO_CLARO} stroke="none" />
      <rect x="38" y="35" width="24" height="4" fill={ORO_CLARO} stroke="none" />
      <path d="M41 39 v30 M47 39 v30 M53 39 v30 M59 39 v30" />
      <rect x="37" y="69" width="26" height="4" fill={ORO_CLARO} stroke="none" />
      <rect x="34" y="73" width="32" height="4" fill={ORO_CLARO} stroke="none" />
    </g>
  );
}

function EmblemaTroyanos() {
  // Caballo de Troya sobre plataforma con ruedas.
  return (
    <g fill={ORO_CLARO} stroke={ORO_CLARO} strokeLinejoin="round">
      <path d="M22 46 h40 l6 -8 l9 -2 l8 8 l-3 6 h-4 l-2 -4 l-6 2 v18 h-7 v-10 h-8 v10 h-7 v-10 h-12 v10 h-7 v-10 h-7 v10 h-7 z" />
      <path d="M62 36 l6 -10 l4 3 l-4 9 z" />
      <path d="M12 74 h76 v5 h-76 z" />
      <circle cx="24" cy="86" r="6" fill="none" strokeWidth="3" />
      <circle cx="76" cy="86" r="6" fill="none" strokeWidth="3" />
      <path d="M28 52 h30" stroke="var(--tt-team, #7a4fce)" strokeWidth="2" />
    </g>
  );
}

function EmblemaRomanos() {
  // SPQR con corona de laurel abierta.
  const hojas = (lado: 1 | -1) =>
    Array.from({ length: 6 }, (_, i) => {
      const t = 0.25 + i * 0.36;
      const x = 50 + lado * 44 * Math.sin(t + 0.35);
      const y = 92 - 42 * (1 - Math.cos(t));
      const rot = lado * (25 + i * 12);
      return <ellipse key={i} cx={x} cy={y} rx="6.5" ry="2.8" transform={`rotate(${rot} ${x} ${y})`} />;
    });
  return (
    <g fill={ORO_CLARO} stroke={ORO_CLARO}>
      <path d="M50 96 C 24 90, 10 66, 16 42" fill="none" strokeWidth="2.2" />
      <path d="M50 96 C 76 90, 90 66, 84 42" fill="none" strokeWidth="2.2" />
      {hojas(-1)}
      {hojas(1)}
      <text x="50" y="58" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="22" letterSpacing="1" stroke="none">SPQR</text>
      <path d="M34 64 h32" strokeWidth="2.2" />
    </g>
  );
}

const EMBLEMAS: Record<ColorTeam, () => ReactNode> = {
  red: EmblemaChinos,
  blue: EmblemaAztecas,
  white: EmblemaPersas,
  green: EmblemaGriegos,
  purple: EmblemaTroyanos,
  orange: EmblemaRomanos,
};

/**
 * Estandarte tipo gonfalón (campo del color del equipo, emblema dorado y
 * remate en punta), dibujado en una caja de 120 × 150 con el asta a la izquierda.
 * `EstandarteG` es el grupo SVG (para meterlo dentro del mapa);
 * `Estandarte` lo envuelve en su propio <svg> para usarlo en HTML.
 * Si no se pasa `color`, el campo toma la variable CSS --tt-team de la tarjeta.
 */
export function EstandarteG({
  clave,
  color,
  conAsta = false,
  ondear = false,
}: {
  clave: ColorTeam;
  color?: string;
  conAsta?: boolean;
  ondear?: boolean;
}) {
  const Emblema = EMBLEMAS[clave];
  const campo = color ?? 'var(--tt-team, #003da5)';
  const dx = conAsta ? 18 : 0;
  return (
    <g>
      {conAsta && (
        <>
          <rect x="6" y="0" width="5" height="150" rx="2" fill="#6b5232" />
          <circle cx="8.5" cy="3" r="4" fill={ORO} />
        </>
      )}
      <g className={ondear ? 'tt-ondear' : undefined}>
        <path transform={`translate(${dx} 0)`} d="M0 0 H100 V118 L50 142 L0 118 Z" fill={campo} stroke={ORO} strokeWidth="4" strokeLinejoin="round" />
        <path transform={`translate(${dx} 0)`} d="M8 8 H92 V112 L50 132 L8 112 Z" fill="none" stroke={ORO} strokeWidth="1.2" opacity="0.6" />
        <g transform={`translate(${dx} 12)`}>
          <Emblema />
        </g>
      </g>
    </g>
  );
}

export function Estandarte({ clave, alto = 28, className }: { clave: ColorTeam; alto?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 150" width={(alto * 100) / 150} height={alto} className={className} aria-hidden="true" focusable="false">
      <EstandarteG clave={clave} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Soldados: figura base común + casco propio de cada civilización.    */
/* Se dibujan en una caja de 40 × 60 con los pies en y = 58.           */
/* ------------------------------------------------------------------ */

const CASCOS: Record<ColorTeam, ReactNode> = {
  // Chino: yelmo cónico con cimera de pincel.
  red: (
    <g fill={ORO_CLARO}>
      <path d="M11 12 L20 0 L29 12 Z" />
      <path d="M19 0 h2 v-1 h-2z" />
    </g>
  ),
  // Azteca: tocado de plumas en abanico.
  blue: (
    <g fill={ORO_CLARO}>
      <ellipse cx="20" cy="1" rx="2.2" ry="7" />
      <ellipse cx="13" cy="4" rx="2.2" ry="6" transform="rotate(-30 13 4)" />
      <ellipse cx="27" cy="4" rx="2.2" ry="6" transform="rotate(30 27 4)" />
      <path d="M11 12 q9 -7 18 0 v3 h-18z" />
    </g>
  ),
  // Persa: tiara redonda con banda.
  white: (
    <g fill={ORO_CLARO}>
      <path d="M11 13 q9 -12 18 0 z" />
      <rect x="10" y="11" width="20" height="3" />
    </g>
  ),
  // Griego: casco corintio con cresta longitudinal.
  green: (
    <g fill={ORO_CLARO}>
      <path d="M12 14 q8 -13 16 0 v-2 q-8 -10 -16 0z" />
      <path d="M16 6 q4 -9 8 0 l2 6 h-12z" />
    </g>
  ),
  // Troyano: casco con cresta alta y penacho hacia atrás.
  purple: (
    <g fill={ORO_CLARO}>
      <path d="M12 14 q8 -12 16 0z" />
      <path d="M19 4 q2 -8 4 0 q4 4 8 10 l-3 1 q-3 -5 -6 -7 h-3z" />
    </g>
  ),
  // Romano: gálea con cresta transversal.
  orange: (
    <g fill={ORO_CLARO}>
      <path d="M12 14 q8 -12 16 0z" />
      <path d="M9 7 q11 -8 22 0 l-2 3 q-9 -6 -18 0z" />
      <path d="M11 13 v4 h3 v-4z M26 13 v4 h3 v-4z" />
    </g>
  ),
};

export function Soldado({ clave, color }: { clave: ColorTeam; color?: string }) {
  const campo = color ?? 'var(--tt-team, #003da5)';
  return (
    <g className="tt-soldado__cuerpo">
      {/* sombra */}
      <ellipse cx="20" cy="58" rx="12" ry="2.4" fill="#000" opacity="0.14" />
      {/* lanza */}
      <path d="M33 2 V56" stroke="#6b5232" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M33 0 l-2.5 6 h5z" fill={ORO_CLARO} />
      {/* piernas */}
      <rect x="14" y="40" width="5" height="16" rx="1.5" fill="#3b2f22" />
      <rect x="21" y="40" width="5" height="16" rx="1.5" fill="#3b2f22" />
      {/* túnica */}
      <path d="M12 20 h16 l2 22 h-20z" fill={campo} />
      <path d="M12 20 h16 v5 h-16z" fill={ORO_CLARO} opacity="0.9" />
      {/* brazo + escudo */}
      <circle cx="11" cy="32" r="7.5" fill={campo} stroke={ORO_CLARO} strokeWidth="1.8" />
      <circle cx="11" cy="32" r="2" fill={ORO_CLARO} />
      {/* cabeza */}
      <circle cx="20" cy="14" r="6" fill="#e9c9a3" />
      {CASCOS[clave]}
    </g>
  );
}

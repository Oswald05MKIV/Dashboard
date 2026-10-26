import { useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { capturar } from '../lib/captura';
import dashboardJson from '../generated/dashboard.json';
import type { DashboardData } from '../types';
import { MESES_LARGOS } from '../config';
import { mesPorDefecto, topsDelMes } from '../lib/tops';
import type { ClaveTop, DatosTops, TopBloque, TopItem } from '../lib/tops';
import { Building2, Crown, Eye, Footprints, House, KeyRound } from 'lucide-react';
import './tops-teams.css';
import './tops-poster.css';

// Los tops se calculan solos desde dashboard.json: no hay archivo que editar a mano.
const DATA = dashboardJson as unknown as DashboardData;

const mxn = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function IconoCamara() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function BotonCaptura({
  destino,
  archivo,
  etiqueta = 'Capturar',
  solido = false,
  onAviso,
}: {
  destino: RefObject<HTMLElement | null>;
  archivo: string;
  etiqueta?: string;
  solido?: boolean;
  onAviso: (m: string) => void;
}) {
  const [ocupado, setOcupado] = useState(false);

  const tomar = async () => {
    const nodo = destino.current;
    if (!nodo) return;
    setOcupado(true);
    nodo.classList.add('tt-capturando');
    try {
      onAviso(await capturar(nodo, archivo));
    } catch (e) {
      onAviso(e instanceof Error ? e.message : 'No se pudo generar la imagen');
    } finally {
      nodo.classList.remove('tt-capturando');
      setOcupado(false);
    }
  };

  return (
    <button
      type="button"
      className={`tt-cap${solido ? ' tt-cap--solid' : ''}`}
      onClick={tomar}
      disabled={ocupado}
      title="Descarga la imagen y la copia al portapapeles"
    >
      <IconoCamara />
      {ocupado ? 'Generando…' : etiqueta}
    </button>
  );
}

export function useAviso() {
  const [aviso, setAviso] = useState<string | null>(null);
  const mostrar = (m: string) => {
    setAviso(m);
    window.setTimeout(() => setAviso(null), 2600);
  };
  return { aviso, mostrar };
}

const ICONOS: Record<ClaveTop, typeof Footprints> = {
  recorridos: Footprints,
  mostradas: Eye,
  opcionadas: KeyRound,
  rentas: House,
  ventas: Building2,
  opcionadasTodos: KeyRound,
};

const TITULO_POSTER: Record<ClaveTop, [string, string]> = {
  recorridos: ['Top', 'Recorridos'],
  mostradas: ['Top', 'Opciones mostradas'],
  opcionadas: ['Top', 'Propiedades opcionadas'],
  rentas: ['Top', 'Rentas cerradas'],
  ventas: ['Top', 'Ventas cerradas'],
  opcionadasTodos: ['Todos', 'Los que opcionaron'],
};

const LUGAR_TXT = ['', '1er lugar', '2do lugar', '3er lugar', '4to lugar', '5to lugar'];

const iniciales = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** Montos grandes legibles en el póster: $3,300,000 → $3.3 M */
const mxnCorto = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 2 })} M` : mxn(n);

function Valor({ it, bloque, grande }: { it: TopItem; bloque: TopBloque; grande?: boolean }) {
  if (bloque.moneda) return <>{grande ? mxn(it.valor) : mxnCorto(it.valor)}</>;
  return (
    <>
      {num(it.valor)}
      <small>{bloque.unidad}</small>
    </>
  );
}

function meta(it: TopItem) {
  return [
    it.ops ? `${it.ops} operación${it.ops > 1 ? 'es' : ''} cerrada${it.ops > 1 ? 's' : ''}` : '',
    it.detalle ?? '',
  ].filter(Boolean).join(' · ');
}

function Avatar({ nombre, lugar, size }: { nombre: string; lugar: number; size: 'xl' | 'md' | 'sm' }) {
  return (
    <span className={`tp-av tp-av--${size} tp-av--l${Math.min(lugar, 4)}`}>
      <span className="tp-av__in">{iniciales(nombre)}</span>
    </span>
  );
}

function PosterTop({ datos, clave, onAviso }: { datos: DatosTops; clave: ClaveTop; onAviso: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const bloque = datos.tops[clave] as TopBloque;
  const SUFIJO = datos.periodo.toLowerCase().replace(/\s+/g, '-');
  const Icono = ICONOS[clave];
  const [eyebrow, titulo] = TITULO_POSTER[clave];
  const campeones = bloque.items.filter((i) => i.lugar === 1);
  const resto = bloque.items.filter((i) => i.lugar !== 1);
  const tope = Math.max(...bloque.items.map((i) => i.valor), 1);

  return (
    <section className={`tp-card tp--${clave}`} ref={ref}>
      <Icono className="tp-marca" aria-hidden="true" strokeWidth={1.2} />
      <header className="tp-head">
        <span className="tp-ico"><Icono aria-hidden="true" strokeWidth={2.2} /></span>
        <div className="tp-head__txt">
          <p className="tp-eyebrow">{eyebrow} · {datos.periodo}</p>
          <h3 className="tp-title">{titulo}</h3>
        </div>
        <BotonCaptura destino={ref} archivo={`top-${clave}-${SUFIJO}`} onAviso={onAviso} />
      </header>

      {bloque.items.length === 0 ? (
        <div className="tp-vacio">Sin datos capturados para este mes.</div>
      ) : (
        <>
          <div className={`tp-campeon${campeones.length > 1 ? ' tp-campeon--empate' : ''}`}>
            <span className="tp-corona"><Crown aria-hidden="true" strokeWidth={2} /></span>
            <p className="tp-campeon__lugar">{campeones.length > 1 ? `1er lugar · empate` : '1er lugar'}</p>
            <div className="tp-campeon__gente">
              {campeones.map((c) => (
                <div key={c.nombre} className="tp-campeon__p">
                  <Avatar nombre={c.nombre} lugar={1} size={campeones.length > 1 ? 'md' : 'xl'} />
                  <p className="tp-campeon__nombre">{c.nombre}</p>
                  {meta(c) && <p className="tp-campeon__meta">{meta(c)}</p>}
                </div>
              ))}
            </div>
            <p className="tp-campeon__valor"><Valor it={campeones[0]} bloque={bloque} grande /></p>
          </div>

          {resto.length > 0 && (
            <ol className={`tp-podio${resto.length === 1 ? ' tp-podio--uno' : ''}`}>
              {resto.map((it) => (
                <li key={it.nombre} className={`tp-pos tp-pos--l${Math.min(it.lugar, 4)}`}>
                  <Avatar nombre={it.nombre} lugar={it.lugar} size="sm" />
                  <div className="tp-pos__txt">
                    <p className="tp-pos__lugar">
                      {LUGAR_TXT[it.lugar] ?? `${it.lugar}° lugar`}
                      {resto.filter((x) => x.lugar === it.lugar).length > 1 ? ' · empate' : ''}
                    </p>
                    <p className="tp-pos__nombre">{it.nombre}</p>
                    {meta(it) && <p className="tp-pos__meta">{meta(it)}</p>}
                  </div>
                  <p className="tp-pos__valor"><Valor it={it} bloque={bloque} /></p>
                  <span className="tp-pos__barra"><span style={{ width: `${Math.max(8, (it.valor / tope) * 100)}%` }} /></span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <footer className="tp-pie">
        <span className="tp-pie__total">
          <strong>{bloque.moneda ? mxnCorto(bloque.total ?? 0) : num(bloque.total ?? 0)}</strong> {bloque.totalEtiqueta}
        </span>
        <span className="tp-pie__marca">RE<i>/</i>MAX <b>TERRA</b></span>
      </footer>
    </section>
  );
}

function ListaCompleta({ datos, clave, onAviso }: { datos: DatosTops; clave: ClaveTop; onAviso: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const bloque = datos.tops[clave] as TopBloque;
  const SUFIJO = datos.periodo.toLowerCase().replace(/\s+/g, '-');
  const tope = Math.max(...bloque.items.map((i) => i.valor), 1);

  return (
    <section className="tp-lista" ref={ref}>
      <header className="tp-lista__head">
        <span className="tp-ico"><KeyRound aria-hidden="true" strokeWidth={2.2} /></span>
        <div className="tp-head__txt">
          <p className="tp-eyebrow">Cuadro de honor · {datos.periodo}</p>
          <h3 className="tp-title">Todos los que opcionaron</h3>
          <p className="tp-lista__sub">
            {bloque.items.length} asesores opcionaron al menos una propiedad · {num(bloque.total ?? 0)} en total
          </p>
        </div>
        <BotonCaptura destino={ref} archivo={`top-${clave}-${SUFIJO}`} onAviso={onAviso} />
      </header>
      {bloque.items.length === 0 ? (
        <div className="tp-vacio tp-vacio--claro">Sin datos capturados para este mes.</div>
      ) : (
        <ol className="tp-lista__filas">
          {bloque.items.map((it) => (
            <li key={it.nombre} className={`tp-fila tp-fila--l${Math.min(it.lugar, 4)}`}>
              <span className="tp-fila__lugar">{it.lugar}</span>
              <span className="tp-fila__txt">
                <span className="tp-fila__nombre">{it.nombre}</span>
                {it.detalle && <span className="tp-fila__meta">{it.detalle}</span>}
              </span>
              <span className="tp-fila__barra"><span style={{ width: `${(it.valor / tope) * 100}%` }} /></span>
              <span className="tp-fila__valor">{num(it.valor)}</span>
            </li>
          ))}
        </ol>
      )}
      <footer className="tp-lista__pie">
        <span>Mismo número = mismo lugar</span>
        <span className="tp-pie__marca tp-pie__marca--oscura">RE<i>/</i>MAX <b>TERRA</b></span>
      </footer>
    </section>
  );
}

export default function TopsJulio() {
  const ref = useRef<HTMLDivElement>(null);
  const { aviso, mostrar } = useAviso();
  const meses = DATA.mesesDisponibles.filter((m) => m >= 7).sort((a, b) => b - a);
  const [mes, setMes] = useState(mesPorDefecto(DATA));
  const DATOS = useMemo(() => topsDelMes(DATA, mes), [mes]);
  const ORDEN: ClaveTop[] = DATOS.orden.filter((k) => DATOS.tops[k]);
  const SUFIJO = DATOS.periodo.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="tt-root tp-root" ref={ref}>
      <header className="tt-head">
        <div>
          <p className="tt-eyebrow">RE/MAX Terra · {DATOS.periodo}</p>
          <h2 className="tt-title">Tops del mes</h2>
          <p className="tt-sub">
            Primeros lugares de {DATOS.mes}: actividad registrada durante el mes y operaciones cerradas
            dentro de {DATOS.mes}. Los montos de renta y venta son el total de la operación, no la comisión.
          </p>
        </div>
        <div className="tt-acciones">
          <select className="tt-cap" value={mes} onChange={(e) => setMes(+e.target.value)} aria-label="Mes">
            {meses.map((m) => (
              <option key={m} value={m}>{MESES_LARGOS[m - 1]}{m === DATA.currentMonth ? ' (en curso)' : ''}</option>
            ))}
          </select>
          <BotonCaptura destino={ref} archivo={`tops-${SUFIJO}`} etiqueta="Capturar todo" solido onAviso={mostrar} />
        </div>
      </header>

      <div className="tp-grid">
        {ORDEN.filter((k) => !DATOS.tops[k]?.completo).map((k) => (
          <PosterTop key={`${mes}-${k}`} datos={DATOS} clave={k} onAviso={mostrar} />
        ))}
      </div>
      {ORDEN.filter((k) => DATOS.tops[k]?.completo).map((k) => (
        <ListaCompleta key={`${mes}-${k}`} datos={DATOS} clave={k} onAviso={mostrar} />
      ))}

      <p className="tt-foot">
        Atribución por Asesor 1 en cada operación. Un mismo lugar repetido indica empate.
      </p>

      {aviso && <div className="tt-toast">{aviso}</div>}
    </div>
  );
}

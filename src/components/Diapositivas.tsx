/**
 * Diapositivas 16:9 listas para compartir (se descargan en 1920×1080).
 * Todo se dimensiona en unidades cqw (relativas al ancho de la diapositiva), así
 * se ve igual en pantalla, en celular y en la imagen descargada.
 */
import { useRef } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle, Building2, Crown, Eye, Footprints, Handshake, House, KeyRound, Medal, PhoneIncoming, Sparkles, Star, TrendingUp, UserX,
} from 'lucide-react';
import { BotonCaptura } from './TopsJulio';
import type { ClaveTop, DatosTops, TopBloque, TopItem } from '../lib/tops';
import { MESES_CORTOS } from '../config';
import type { DashboardData, LadosTerra } from '../types';
import { nombreCorto } from '../lib/tops';
import './diapositivas.css';

export const mxn = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
export const mxnM = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MDP` : mxn(n);
const num = (n: number) => (Number.isInteger(n) ? n.toLocaleString('es-MX') : n.toFixed(1));
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ------------------------------------------------------------------ */
/* Marco: barra con título + botón Capturar, y la diapositiva debajo     */
/* ------------------------------------------------------------------ */
export function Diapositiva({
  etiqueta, archivo, tema, onAviso, children, className = '',
}: {
  etiqueta: string;
  archivo: string;
  tema: string;
  onAviso: (m: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <figure className="sl-marco">
      <figcaption className="sl-marco__barra">
        <span className="sl-marco__etq">{etiqueta}</span>
        <span className="sl-marco__fmt">16:9</span>
        <BotonCaptura destino={ref} archivo={slug(archivo)} onAviso={onAviso} ancho={1920} />
      </figcaption>
      <div className={`sl sl--${tema} ${className}`} ref={ref}>
        {children}
      </div>
    </figure>
  );
}

export function Marca({ oscura = false }: { oscura?: boolean }) {
  return (
    <span className={`sl-marca${oscura ? ' sl-marca--oscura' : ''}`}>
      RE<i>/</i>MAX <b>TERRA</b>
    </span>
  );
}

function Avatar({ nombre, lugar, className = '' }: { nombre: string; lugar: number; className?: string }) {
  return (
    <span className={`sl-av sl-av--l${Math.min(lugar, 4)} ${className}`}>
      <span className="sl-av__in">{iniciales(nombre)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tops con podio                                                      */
/* ------------------------------------------------------------------ */
const ICONOS: Record<ClaveTop, typeof Footprints> = {
  recorridos: Footprints, mostradas: Eye, opcionadas: KeyRound, rentas: House, ventas: Building2,
};
const LUGAR_TXT = ['', '1er lugar', '2do lugar', '3er lugar'];

function valorTop(it: TopItem, b: TopBloque) {
  if (b.sinMonto) {
    const n = it.ops ?? 0;
    const t = b.unidad === 'rentas' ? 'renta' : 'venta';
    const conAp = b.titulo.includes('apartad');
    return { n: String(n), u: `${t}${n === 1 ? '' : 's'}${conAp ? '' : ` cerrada${n === 1 ? '' : 's'}`}` };
  }
  return { n: num(it.valor), u: b.unidad };
}

export function SlideTop({ datos, clave, onAviso }: { datos: DatosTops; clave: ClaveTop; onAviso: (m: string) => void }) {
  const b = datos.tops[clave] as TopBloque;
  const Icono = ICONOS[clave];
  const lugares = [1, 2, 3]
    .map((l) => ({ l, gente: b.items.filter((i) => i.lugar === l) }))
    .filter((g) => g.gente.length);
  // Si hay empate en 1er lugar, el siguiente lugar es 3: se reacomodan por posición.
  const grupos = [...new Set(b.items.map((i) => i.lugar))].sort((x, y) => x - y).slice(0, 3)
    .map((l, pos) => ({ l, pos: pos + 1, gente: b.items.filter((i) => i.lugar === l) }));
  const orden = [grupos[1], grupos[0], grupos[2]].filter(Boolean);
  const conLeads = clave === 'recorridos' && hayLeads(datos);

  return (
    <Diapositiva etiqueta={`Top ${b.titulo.toLowerCase()}`} archivo={`top-${clave}-${datos.periodo}`} tema={`top sl--${clave}`} onAviso={onAviso}>
      <Icono className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-top">
        <div className="sl-top__izq">
          <span className="sl-ico"><Icono aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">Top del mes · {datos.periodo}</p>
          <h2 className="sl-h1">{b.titulo}</h2>
          <p className="sl-texto">{b.nota}</p>
          {b.minimo && (
            <p className="sl-regla">
              <span>Mínimo para aparecer</span>
              <strong>{mxnM(b.minimo)}</strong>
              <em>en {b.unidad} {b.titulo.includes('apartad') ? 'cerradas y apartadas' : 'cerradas'} del mes</em>
            </p>
          )}
          <div className="sl-top__pie">
            <p className="sl-total"><strong>{num(b.total ?? 0)}</strong> {b.totalEtiqueta}</p>
            <Marca />
          </div>
        </div>

        <div className="sl-top__der">
          {lugares.length === 0 ? (
            <div className="sl-nadie">
              <Medal aria-hidden="true" strokeWidth={1.6} />
              <p className="sl-nadie__t">{b.minimo ? 'Este mes nadie alcanzó el mínimo' : 'Sin datos capturados este mes'}</p>
              {b.minimo && <p className="sl-nadie__s">El cuadro se abre al llegar a {mxnM(b.minimo)} en {b.unidad} cerradas.</p>}
            </div>
          ) : (
            <div className={`sl-podio sl-podio--${orden.length}`}>
              {orden.map((g) => (
                <div key={g.l} className={`sl-col sl-col--p${g.pos}`}>
                  <div className={`sl-col__gente${g.gente.length > 1 ? ' sl-col__gente--varios' : ''}`}>
                    {g.pos === 1 && g.gente.length === 1 && <span className="sl-corona"><Crown aria-hidden="true" strokeWidth={2} /></span>}
                    {g.gente.map((it) => {
                      const v = valorTop(it, b);
                      return (
                        <div key={it.nombre} className="sl-persona">
                          <Avatar nombre={it.nombre} lugar={g.pos} />
                          <div className="sl-persona__txt">
                            <p className="sl-persona__nombre">{it.nombre}</p>
                            <p className="sl-persona__valor"><strong>{v.n}</strong> {v.u}</p>
                            {conLeads && <p className="sl-chip-leads"><PhoneIncoming aria-hidden="true" strokeWidth={2.4} /> {num(it.leads ?? 0)} leads recibidos</p>}
                            {!conLeads && it.detalle && <p className="sl-persona__det">{it.detalle}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="sl-ped">
                    <span className="sl-ped__num">{g.pos}</span>
                    <span className="sl-ped__txt">{LUGAR_TXT[g.pos]}{g.gente.length > 1 ? ' · empate' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Listas completas                                                    */
/* ------------------------------------------------------------------ */
type Columna = { titulo: string; valor: (it: TopItem) => number; fuerte?: boolean; barra?: boolean; alerta?: boolean; angosta?: boolean };

function Tabla({ items, columnas, conLugar, max }: { items: TopItem[]; columnas: Columna[]; conLugar?: boolean; max?: number }) {
  const nCols = items.length <= 8 ? 1 : items.length <= 22 ? 2 : 3;
  const porCol = Math.ceil(items.length / nCols);
  const bloques = Array.from({ length: nCols }, (_, k) => items.slice(k * porCol, (k + 1) * porCol));
  const tope = max ?? Math.max(1, ...items.map((it) => columnas.find((c) => c.barra)?.valor(it) ?? 0));
  // Con 2-3 columnas no cabe la barra: se queda solo el número para no cortar nombres.
  const conBarra = nCols === 1;
  const gridCols = `${conLugar ? '1.9em ' : ''}minmax(0, 1fr) ${columnas.map((c) => (c.barra && conBarra ? '9em' : c.angosta ? '2.7em' : conBarra ? '5.2em' : '3.6em')).join(' ')}`;

  return (
    <div className={`sl-tabla sl-tabla--c${nCols}${porCol > 9 ? ' sl-tabla--densa' : ''}`}>
      {bloques.map((bl, k) => (
        <div key={k} className="sl-tabla__bloque">
          <div className="sl-fila sl-fila--head" style={{ gridTemplateColumns: gridCols }}>
            {conLugar && <span />}
            <span>Asesor</span>
            {columnas.map((c) => <span key={c.titulo} className="sl-num">{c.titulo}</span>)}
          </div>
          {bl.map((it) => (
            <div key={it.nombre} className={`sl-fila${conLugar && it.lugar <= 3 ? ` sl-fila--l${it.lugar}` : ''}`} style={{ gridTemplateColumns: gridCols }}>
              {conLugar && <span className="sl-fila__lugar">{it.lugar}</span>}
              <span className="sl-fila__nombre">{it.nombre}</span>
              {columnas.map((c) => (
                <span key={c.titulo} className={`sl-num${c.fuerte ? ' sl-num--fuerte' : ''}${c.alerta ? ' sl-num--alerta' : ''}`}>
                  {c.barra && conBarra && <span className="sl-fila__barra"><span style={{ width: `${Math.max(4, (c.valor(it) / tope) * 100)}%` }} /></span>}
                  {num(c.valor(it))}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Prueba({ gente }: { gente: TopItem[] }) {
  if (!gente.length) return null;
  return (
    <p className="sl-prueba">
      {gente.map((g) => (
        <span key={g.nombre}><b>{g.nombre}</b> · Periodo de prueba</span>
      ))}
    </p>
  );
}

/** Si en el mes nadie tiene leads capturados, las imágenes no muestran leads (para no decir "0 leads recibidos"). */
export const hayLeads = (d: DatosTops) =>
  Object.values(d.listas).some((l) => Array.isArray(l) && l.some((i: { leads?: number }) => (i.leads ?? 0) > 0));

export function SlideRecorridosLeads({ datos, onAviso }: { datos: DatosTops; onAviso: (m: string) => void }) {
  const items = datos.listas.recorridosLeads;
  const totRec = items.reduce((s, i) => s + i.valor, 0);
  const totLeads = items.reduce((s, i) => s + (i.leads ?? 0), 0);
  const L = hayLeads(datos);
  return (
    <Diapositiva etiqueta="Recorridos y leads · todos" archivo={`recorridos-y-leads-${datos.periodo}`} tema="lista sl--azulista" onAviso={onAviso}>
      <Footprints className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista">
        <div className="sl-lista__izq">
          <span className="sl-ico"><Footprints aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">{datos.periodo}</p>
          <h2 className="sl-h2">{L ? 'Recorridos y leads' : 'Recorridos'}</h2>
          <p className="sl-texto">Todos los asesores que salieron a recorrido en {datos.mes}{L ? ', con los leads que recibió cada uno' : ''}.</p>
          <div className="sl-kpis">
            <p><strong>{items.length}</strong><span>asesores con recorridos</span></p>
            <p><strong>{num(totRec)}</strong><span>recorridos</span></p>
            {L && <p><strong>{num(totLeads)}</strong><span>leads recibidos</span></p>}
          </div>
          <Marca />
        </div>
        <div className="sl-lista__der">
          <Tabla items={items} conLugar columnas={[
            { titulo: 'Recorridos', valor: (i) => i.valor, fuerte: true, barra: true },
            ...(L ? [{ titulo: 'Leads', valor: (i: TopItem) => i.leads ?? 0 }] : []),
          ]} />
        </div>
      </div>
    </Diapositiva>
  );
}

export function SlideOpcionaron({ datos, onAviso }: { datos: DatosTops; onAviso: (m: string) => void }) {
  const items = datos.listas.opcionaron;
  const total = items.reduce((s, i) => s + i.valor, 0);
  return (
    <Diapositiva etiqueta="Todos los que opcionaron" archivo={`todos-los-que-opcionaron-${datos.periodo}`} tema="lista sl--opcionadas" onAviso={onAviso}>
      <KeyRound className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista">
        <div className="sl-lista__izq">
          <span className="sl-ico"><KeyRound aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">Cuadro de honor · {datos.periodo}</p>
          <h2 className="sl-h2">Los que opcionaron</h2>
          <p className="sl-texto">Cada asesor que opcionó al menos una propiedad en {datos.mes}, de más a menos. Mismo número, mismo lugar.</p>
          <div className="sl-kpis">
            <p><strong>{items.length}</strong><span>asesores opcionaron</span></p>
            <p><strong>{num(total)}</strong><span>propiedades opcionadas</span></p>
          </div>
          <Marca />
        </div>
        <div className="sl-lista__der">
          {items.length ? (
            <Tabla items={items} conLugar columnas={[
              { titulo: 'Opcionadas', valor: (i) => i.valor, fuerte: true, barra: true },
              { titulo: 'Venta', valor: (i) => i.venta ?? 0, angosta: true },
              { titulo: 'Renta', valor: (i) => i.renta ?? 0, angosta: true },
            ]} />
          ) : (
            <div className="sl-nadie"><KeyRound aria-hidden="true" /><p className="sl-nadie__t">Sin opcionadas capturadas este mes</p></div>
          )}
        </div>
      </div>
    </Diapositiva>
  );
}

export function SlideSinRecorridos({ datos, onAviso }: { datos: DatosTops; onAviso: (m: string) => void }) {
  const items = datos.listas.sinRecorridos;
  const totLeads = items.reduce((s, i) => s + (i.leads ?? 0), 0);
  const L = hayLeads(datos);
  return (
    <Diapositiva etiqueta="Sin recorridos" archivo={`sin-recorridos-${datos.periodo}`} tema="lista sl--grafito" onAviso={onAviso}>
      <UserX className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista">
        <div className="sl-lista__izq">
          <span className="sl-ico"><UserX aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">{datos.periodo}</p>
          <h2 className="sl-h2">Sin recorridos este mes</h2>
          <p className="sl-texto">Asesores que no registraron ningún recorrido en {datos.mes}{L ? ' y los leads que recibieron. Cada lead es una oportunidad de recorrido' : ''}.</p>
          <div className="sl-kpis">
            <p><strong>{items.length}</strong><span>asesores sin recorridos</span></p>
            {L && <p><strong>{num(totLeads)}</strong><span>leads sin convertir en recorrido</span></p>}
          </div>
          <Marca />
        </div>
        <div className="sl-lista__der">
          {items.length ? (
            <Tabla items={items} columnas={[
              ...(L ? [{ titulo: 'Leads recibidos', valor: (i: TopItem) => i.leads ?? 0, fuerte: true, barra: true }] : []),
              { titulo: 'Recorridos', valor: () => 0, alerta: true, fuerte: !L },
            ]} />
          ) : (
            <div className="sl-nadie"><Sparkles aria-hidden="true" /><p className="sl-nadie__t">Todos hicieron al menos un recorrido</p></div>
          )}
          <Prueba gente={datos.prueba.filter((p) => !p.recorridos)} />
        </div>
      </div>
    </Diapositiva>
  );
}

export function SlideNoOpcionaron({ datos, onAviso }: { datos: DatosTops; onAviso: (m: string) => void }) {
  const items = datos.listas.noOpcionaron;
  return (
    <Diapositiva etiqueta="Advertencia · no opcionaron" archivo={`no-opcionaron-${datos.periodo}`} tema="lista sl--naranja" onAviso={onAviso}>
      <AlertTriangle className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista">
        <div className="sl-lista__izq">
          <span className="sl-ico"><AlertTriangle aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">Advertencia · {datos.periodo}</p>
          <h2 className="sl-h2">No opcionaron ninguna propiedad</h2>
          <p className="sl-texto">
            En {datos.mes} estos asesores no opcionaron ni una sola propiedad. Sin inventario propio no hay cierres: para el próximo
            corte se espera al menos una propiedad opcionada.
          </p>
          <div className="sl-kpis">
            <p><strong>{items.length}</strong><span>asesores con 0 opcionadas</span></p>
          </div>
          <Marca />
        </div>
        <div className="sl-lista__der">
          {items.length ? (
            <Tabla items={items} columnas={[
              { titulo: 'Opcionadas', valor: () => 0, alerta: true, fuerte: true },
              { titulo: 'Recorridos', valor: (i) => i.recorridos ?? 0 },
              ...(hayLeads(datos) ? [{ titulo: 'Leads', valor: (i: TopItem) => i.leads ?? 0 }] : []),
            ]} />
          ) : (
            <div className="sl-nadie"><Sparkles aria-hidden="true" /><p className="sl-nadie__t">Todos opcionaron al menos una propiedad</p></div>
          )}
          <Prueba gente={datos.prueba.filter((p) => !p.valor)} />
        </div>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Comunicados                                                         */
/* ------------------------------------------------------------------ */
export function SlideMinimo({ tipo, minimo, onAviso }: { tipo: 'ventas' | 'rentas'; minimo: number; onAviso: (m: string) => void }) {
  const Icono = tipo === 'ventas' ? Building2 : House;
  const corto = tipo === 'ventas' ? '$2 MDP' : '$40 mil';
  return (
    <Diapositiva etiqueta={`Comunicado · mínimo en ${tipo}`} archivo={`regla-minimo-${tipo}`} tema={`aviso sl--${tipo}`} onAviso={onAviso}>
      <Icono className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-aviso">
        <div className="sl-aviso__txt">
          <p className="sl-pastilla">Nueva regla · Cuadro de {tipo}</p>
          <h2 className="sl-h1">Para aparecer en el Top de {tipo === 'ventas' ? 'Ventas' : 'Rentas'}</h2>
          <p className="sl-texto sl-texto--grande">
            A partir de ahora, el cuadro de {tipo} reconoce a quienes sumen <strong>al menos {mxnM(minimo)}</strong>&nbsp;en {tipo} cerradas
            dentro del mes. Queremos celebrar las operaciones que mueven a la oficina.
          </p>
          <ul className="sl-puntos">
            <li>Cuenta el valor total de las {tipo} cerradas en el mes, según su fecha de operación.</li>
            <li>Se suman todas tus {tipo} del mes: varias operaciones pueden juntar el mínimo.</li>
            <li>Quien no llegue al mínimo no aparece ese mes; la oficina sigue contando cada cierre.</li>
          </ul>
          <Marca />
        </div>
        <div className="sl-aviso__sello">
          <div className="sl-sello">
            <span className="sl-sello__ico"><Icono aria-hidden="true" strokeWidth={2} /></span>
            <span className="sl-sello__min">Mínimo</span>
            <strong className="sl-sello__cifra">{corto}</strong>
            <span className="sl-sello__sub">en {tipo} cerradas<br />por mes</span>
          </div>
        </div>
      </div>
    </Diapositiva>
  );
}

export function SlideFelicitacion({
  nombre, periodo, recorridos, lugarOpciones, opciones, onAviso,
}: {
  nombre: string;
  periodo: string;
  recorridos: number;
  /** Lugar de la oficina en opciones mostradas del mes. */
  lugarOpciones: number | null;
  opciones: number;
  onAviso: (m: string) => void;
}) {
  const primer = nombre.split(/\s+/)[0];
  return (
    <Diapositiva etiqueta={`Reconocimiento · ${nombre}`} archivo={`felicitacion-${nombre}-${periodo}`} tema="aviso sl--oro" onAviso={onAviso}>
      <Star className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-aviso sl-aviso--felicita">
        <div className="sl-aviso__sello">
          <div className="sl-medalla">
            <span className="sl-medalla__cinta sl-medalla__cinta--i" />
            <span className="sl-medalla__cinta sl-medalla__cinta--d" />
            <Avatar nombre={nombre} lugar={1} className="sl-av--hero" />
            <span className="sl-medalla__estrella"><Star aria-hidden="true" strokeWidth={2} /></span>
          </div>
        </div>
        <div className="sl-aviso__txt">
          <p className="sl-pastilla sl-pastilla--oro">Reconocimiento · {periodo}</p>
          <h2 className="sl-h1">¡Felicidades, {nombre}!</h2>
          <p className="sl-texto sl-texto--grande">
            {primer} es ejemplo de constancia: sin depender de leads de la oficina, salió a <strong>{recorridos} recorridos</strong> y
            mostró <strong>{opciones} opciones</strong> a sus clientes{lugarOpciones ? <>, el <strong>{lugarOpciones}° lugar de toda la oficina</strong></> : ''}.
            Su trabajo ya la llevó a mostrar propiedades en <strong>Campanario</strong>.
          </p>
          <p className="sl-texto">Así se construye una carrera en bienes raíces: saliendo a la calle todos los días. ¡Gracias, {primer}!</p>
          <div className="sl-stats">
            <p><strong>{recorridos}</strong><span>recorridos en el mes</span></p>
            <p><strong>{opciones}</strong><span>opciones mostradas</span></p>
            {lugarOpciones && <p><strong>{lugarOpciones}°</strong><span>lugar de la oficina en opciones mostradas</span></p>}
          </div>
          <Marca />
        </div>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Acumulado del año (Operaciones)                                      */
/* ------------------------------------------------------------------ */
export function SlideAcumulado({
  tipo, volumen, operaciones, hasta, year, onAviso, apartados,
}: {
  tipo: 'ventas' | 'rentas';
  /** Apartados vigentes del mes en curso: se muestran aparte, NO se suman al total. */
  apartados?: { mes: number; monto: number; ops: number };
  volumen: number[];
  operaciones: number[];
  /** Último mes con datos (1-12) */
  hasta: { mes: number; dia: number };
  year: number;
  onAviso: (m: string) => void;
}) {
  const meses = volumen.slice(0, hasta.mes);
  const ops = operaciones.slice(0, hasta.mes);
  const total = meses.reduce((s, v) => s + v, 0);
  const totOps = ops.reduce((s, v) => s + v, 0);
  const tope = Math.max(1, ...meses);
  const mejor = meses.indexOf(Math.max(...meses));
  const Icono = tipo === 'ventas' ? Building2 : House;
  const rango = `1 ene – ${hasta.dia} ${MESES_CORTOS[hasta.mes - 1].toLowerCase()} ${year}`;
  const ap = apartados && apartados.ops > 0 && apartados.mes <= hasta.mes ? apartados : null;
  const fmtBar = (v: number) => (tipo === 'ventas' ? mxnM(v) : v >= 100_000 ? `$${Math.round(v / 1000)} mil` : mxn(v));

  return (
    <Diapositiva etiqueta={`Acumulado ${tipo} ${year}`} archivo={`acumulado-${tipo}-${year}`} tema={`acum sl--${tipo}`} onAviso={onAviso}>
      <TrendingUp className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-acum">
        <div className="sl-acum__izq">
          <span className="sl-ico"><Icono aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">Acumulado {year} · {rango}</p>
          <h2 className="sl-h2">{tipo === 'ventas' ? 'Ventas cerradas' : 'Rentas cerradas'}</h2>
          <p className="sl-cifra">{tipo === 'ventas' ? mxnM(total) : mxn(total)}</p>
          <p className="sl-cifra__sub">valor total de las operaciones</p>
          <div className="sl-stats sl-stats--col">
            <p><strong>{totOps}</strong><span>operaciones cerradas</span></p>
            <p><strong>{totOps ? (tipo === 'ventas' ? mxnM(total / totOps) : mxn(total / totOps)) : '—'}</strong><span>promedio por operación</span></p>
            <p><strong>{MESES_CORTOS[mejor]}</strong><span>mejor mes</span></p>
            {ap && (
              <p className="sl-stat--apartado"><strong>{tipo === 'ventas' ? mxnM(ap.monto) : mxn(ap.monto)}</strong><span>{ap.ops} apartado{ap.ops === 1 ? '' : 's'} en proceso en {MESES_CORTOS[ap.mes - 1].toLowerCase()} · aún no cerrados, no suman al total</span></p>
            )}
          </div>
          <Marca />
        </div>
        <div className="sl-acum__der">
          <div className="sl-barras">
            {meses.map((v, k) => (
              <div key={k} className={`sl-barra${k === mejor ? ' sl-barra--top' : ''}`}>
                <span className="sl-barra__val">{v ? fmtBar(v) : '—'}</span>
                <span className="sl-barra__col"><span style={{ height: `${Math.max(1.5, (v / tope) * 100)}%` }} /></span>
                <span className="sl-barra__ops">{ops[k]} op{ops[k] === 1 ? '' : 's'}{ap && ap.mes === k + 1 ? ` + ${ap.ops} apart.` : ''}</span>
                <span className="sl-barra__mes">{MESES_CORTOS[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Semestre: recorridos vs opciones mostradas, mes por mes, 2 trimestres */
/* ------------------------------------------------------------------ */
const MESES_LARGOS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function SlideSemestre({
  recorridos, opciones, mesFinal, year, enCurso, onAviso,
}: {
  recorridos: number[];
  opciones: number[];
  /** Último mes del semestre (1-12). */
  mesFinal: number;
  year: number;
  /** Mes que todavía no termina (se marca "en curso"). */
  enCurso?: number;
  onAviso: (m: string) => void;
}) {
  const inicio = Math.max(1, mesFinal - 5);
  const meses = Array.from({ length: mesFinal - inicio + 1 }, (_, k) => inicio + k);
  const trimestres = [meses.slice(0, 3), meses.slice(3, 6)].filter((t) => t.length);
  const tope = Math.max(1, ...meses.map((m) => Math.max(recorridos[m - 1] || 0, opciones[m - 1] || 0)));
  const pct = (m: number) => ((recorridos[m - 1] || 0) ? Math.round(((opciones[m - 1] || 0) / recorridos[m - 1]) * 100) : 0);
  const rango = (t: number[]) => `${MESES_LARGOS_ES[t[0] - 1]} – ${MESES_LARGOS_ES[t[t.length - 1] - 1]}`;

  return (
    <Diapositiva etiqueta="Semestre · recorridos y opciones" archivo={`semestre-recorridos-opciones-${year}`} tema="semestre sl--azulista" onAviso={onAviso}>
      <div className="sl-sem">
        <header className="sl-sem__head">
          <div>
            <p className="sl-eyebrow">Último semestre · {MESES_LARGOS_ES[inicio - 1]} – {MESES_LARGOS_ES[mesFinal - 1]} {year}</p>
            <h2 className="sl-h2">Recorridos y opciones mostradas</h2>
          </div>
          <div className="sl-sem__leyenda">
            <span><i className="sl-sem__dot sl-sem__dot--rec" />Recorridos</span>
            <span><i className="sl-sem__dot sl-sem__dot--opc" />Opciones mostradas</span>
            <span><b>%</b> opciones mostradas respecto a los recorridos</span>
          </div>
        </header>

        <div className="sl-sem__tris">
          {trimestres.map((t, k) => {
            const prom = Math.round(t.reduce((s, m) => s + pct(m), 0) / t.length);
            return (
              <section key={k} className="sl-tri">
                <header className="sl-tri__head">
                  <p className="sl-tri__n">{k === 0 ? '1er' : '2do'} trimestre</p>
                  <p className="sl-tri__rango">{rango(t)}</p>
                </header>
                <div className="sl-tri__meses">
                  {t.map((m) => {
                    const r = recorridos[m - 1] || 0;
                    const o = opciones[m - 1] || 0;
                    return (
                      <div key={m} className="sl-mes">
                        <p className="sl-mes__nombre">{MESES_LARGOS_ES[m - 1]}</p>
                        <p className="sl-mes__pct">{pct(m)}<small>%</small></p>
                        <p className="sl-mes__ratio">{r ? (o / r).toFixed(1) : '0'} opciones por recorrido</p>
                        {m === enCurso && <p className="sl-mes__curso">Mes en curso</p>}
                        <div className="sl-mes__fila">
                          <span className="sl-mes__etq">Recorridos</span>
                          <span className="sl-mes__barra sl-mes__barra--rec"><span style={{ width: `${(r / tope) * 100}%` }} /></span>
                          <strong>{r}</strong>
                        </div>
                        <div className="sl-mes__fila">
                          <span className="sl-mes__etq">Opciones</span>
                          <span className="sl-mes__barra sl-mes__barra--opc"><span style={{ width: `${(o / tope) * 100}%` }} /></span>
                          <strong>{o}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="sl-tri__pie">Promedio del trimestre: <strong>{prom}%</strong></p>
              </section>
            );
          })}
        </div>

        <footer className="sl-sem__pie">
          <span>Ejemplo: 200% = se mostraron 2 opciones por cada recorrido. Totales de la oficina por mes, no acumulados.</span>
          <Marca />
        </footer>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Lados RE/MAX Terra (Operaciones) — trabajo en equipo                  */
/* ------------------------------------------------------------------ */
// Nombre corto: el que se usa en Teams; si no está en un equipo, nombre + primer apellido.
const CORTOS_EXTRA: Record<string, string> = { 'Alma Veronica Flores Guzman': 'Verónica Flores', 'Consuelo Ramírez': 'Cons Ramírez' };
let cortosTeams: Record<string, string> = {};
export const registrarCortos = (equipos: { integrantes: { nombre: string; canonico: string }[] }[]) => {
  cortosTeams = Object.fromEntries(equipos.flatMap((e) => e.integrantes.map((i) => [i.canonico, i.nombre])));
};
const corto = (n: string) => {
  if (cortosTeams[n]) return cortosTeams[n];
  if (CORTOS_EXTRA[n]) return CORTOS_EXTRA[n];
  const p = n.split(/\s+/).filter(Boolean);
  return p.length <= 2 ? n : `${p[0]} ${p[1]}`;
};

export function SlideLados({
  lados, hasta, year, onAviso,
}: {
  lados: LadosTerra;
  hasta: { mes: number; dia: number };
  year: number;
  onAviso: (m: string) => void;
}) {
  const meses = Array.from({ length: hasta.mes }, (_, k) => k);
  const equipo = lados.series.equipo;
  const directas = lados.series.directas;
  const tope = Math.max(1, ...meses.map((k) => (equipo[k] + directas[k]) * 2));
  const ops100 = lados.operacionesEquipo + lados.operacionesDirectas;
  const pctOficina = lados.ladosTotales ? Math.round((lados.ladosTerra / lados.ladosTotales) * 100) : 0;
  const rango = `1 ene – ${hasta.dia} ${MESES_CORTOS[hasta.mes - 1].toLowerCase()} ${year}`;

  return (
    <Diapositiva etiqueta={`Acumulado de lados ${year}`} archivo={`acumulado-lados-terra-${year}`} tema="acum sl--equipo" onAviso={onAviso}>
      <Handshake className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-acum">
        <div className="sl-acum__izq">
          <span className="sl-ico"><Handshake aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">Acumulado {year} · {rango}</p>
          <h2 className="sl-h2">Lados 100% RE/MAX Terra</h2>
          <p className="sl-cifra">{lados.ladosDobleTerra}</p>
          <p className="sl-cifra__sub">lados en {ops100} operaciones donde lado 1 y lado 2 son de la oficina</p>
          <div className="sl-stats sl-stats--col">
            <p><strong>{lados.operacionesEquipo}</strong><span>operaciones entre compañeros · {lados.operacionesEquipo * 2} lados</span></p>
            <p><strong>{lados.operacionesDirectas}</strong><span>directas, un mismo asesor con los 2 lados · {lados.operacionesDirectas * 2} lados</span></p>
            <p><strong>{pctOficina}%</strong><span>{lados.ladosTerra} de {lados.ladosTotales} lados de todas las operaciones son nuestros</span></p>
          </div>
          <Marca />
        </div>
        <div className="sl-acum__der">
          <div className="sl-barras sl-barras--lados">
            {meses.map((k) => {
              const e = equipo[k] * 2;
              const d = directas[k] * 2;
              return (
                <div key={k} className="sl-barra">
                  <span className="sl-barra__val">{e + d || '—'}</span>
                  <span className="sl-barra__col sl-barra__col--pila">
                    <span className="sl-pila sl-pila--dir" style={{ height: `${(d / tope) * 100}%` }} />
                    <span className="sl-pila sl-pila--eq" style={{ height: `${(e / tope) * 100}%` }} />
                  </span>
                  <span className="sl-barra__ops">{equipo[k]} en equipo</span>
                  <span className="sl-barra__mes">{MESES_CORTOS[k]}</span>
                </div>
              );
            })}
          </div>
          <p className="sl-leyenda-lados">
            <span><i className="sl-pila sl-pila--eq" />Entre compañeros de la oficina</span>
            <span><i className="sl-pila sl-pila--dir" />Directas (mismo asesor)</span>
            <span>Número arriba = lados 100% Terra del mes</span>
          </p>
        </div>
      </div>
    </Diapositiva>
  );
}

type ModoRanking = 'equipo' | 'directas' | 'lados';
const MODOS: Record<ModoRanking, {
  etiqueta: string; archivo: string; tema: string; titulo: string; dato: string; nota: string;
  cols: [string, string, string]; vacio: string;
}> = {
  equipo: {
    etiqueta: 'Reconocimiento · trabajo en equipo', archivo: 'reconocimiento-trabajo-en-equipo', tema: 'lista sl--oro',
    titulo: 'Trabajo en equipo', dato: 'operaciones con un compañero de la oficina',
    nota: 'Cuenta cada operación cerrada donde lado 1 y lado 2 son dos asesores distintos de RE/MAX Terra. Empates: más ventas, luego mayor volumen.',
    cols: ['Ops', 'Venta', 'Renta'], vacio: 'Todavía no hay operaciones entre compañeros este año.',
  },
  directas: {
    etiqueta: 'Reconocimiento · operaciones directas', archivo: 'reconocimiento-operaciones-directas', tema: 'lista sl--opcionadas',
    titulo: 'Operaciones directas', dato: 'operaciones con los 2 lados suyos',
    nota: 'Cuenta cada operación cerrada donde el mismo asesor llevó comprador y vendedor (o arrendador y arrendatario). Empates: más ventas, luego mayor volumen.',
    cols: ['Directas', 'Venta', 'Renta'], vacio: 'Todavía no hay operaciones directas este año.',
  },
  lados: {
    etiqueta: 'Reconocimiento · más lados RE/MAX Terra', archivo: 'reconocimiento-mas-lados-terra', tema: 'lista sl--equipo',
    titulo: 'Más lados RE/MAX Terra', dato: 'lados en operaciones 100% de la oficina',
    nota: 'Solo operaciones con lado 1 y lado 2 de RE/MAX Terra: con un compañero suma 1 lado a cada quien; una directa suma los 2 lados. Empates: más ventas, luego mayor volumen.',
    cols: ['Lados', 'Equipo', 'Direc.'], vacio: 'Todavía no hay operaciones 100% Terra este año.',
  },
};

export function SlideRankingLados({
  lados, modo, year, onAviso,
}: {
  lados: LadosTerra;
  modo: ModoRanking;
  year: number;
  onAviso: (m: string) => void;
}) {
  const M = MODOS[modo];
  const filas = (modo === 'equipo' ? lados.ranking : modo === 'directas' ? lados.rankingDirectas : lados.rankingLadosTotal).map((r) => {
    const x = r as typeof lados.rankingLadosTotal[number];
    const valores: [number, number, number] = modo === 'lados' ? [x.lados, x.equipo, x.directas] : [r.operaciones, r.ventas, r.rentas];
    const sub = modo === 'equipo'
      ? `con ${r.socios.map((s) => `${s.nombre.startsWith('Ex asesor') ? 'ex asesor' : corto(s.nombre).split(' ')[0]}${s.operaciones > 1 ? ` ×${s.operaciones}` : ''}`).join(', ')}`
      : modo === 'lados'
        ? ''
        : `${r.ventas} venta${r.ventas === 1 ? '' : 's'} · ${r.rentas} renta${r.rentas === 1 ? '' : 's'}`;
    return { lugar: r.lugar, nombre: r.nombre, valores, sub };
  });
  const primeros = filas.filter((r) => r.lugar === 1);
  const top = primeros[0];
  const nCols = filas.length <= 9 ? 1 : 2;
  const porCol = Math.ceil(filas.length / nCols);
  const bloques = Array.from({ length: nCols }, (_, k) => filas.slice(k * porCol, (k + 1) * porCol));
  const tope = Math.max(1, ...filas.map((r) => r.valores[0]));
  const icono = modo === 'directas' ? KeyRound : Handshake;
  const Icono = icono;

  return (
    <Diapositiva etiqueta={M.etiqueta} archivo={`${M.archivo}-${year}`} tema={M.tema} onAviso={onAviso}>
      <Icono className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista sl-lista--equipo">
        <div className="sl-lista__izq">
          <p className="sl-pastilla sl-pastilla--oro">Reconocimiento {year}</p>
          <h2 className="sl-h2">{M.titulo}</h2>
          {top ? (
            <div className="sl-ganador">
              <div className="sl-medalla sl-medalla--chica">
                <span className="sl-medalla__cinta sl-medalla__cinta--i" />
                <span className="sl-medalla__cinta sl-medalla__cinta--d" />
                <Avatar nombre={top.nombre} lugar={1} className="sl-av--hero" />
                <span className="sl-medalla__estrella"><Star aria-hidden="true" strokeWidth={2} /></span>
              </div>
              <p className="sl-ganador__lugar">1er lugar{primeros.length > 1 ? ' · empate' : ''}</p>
              <p className="sl-ganador__nombre">{primeros.map((p) => corto(p.nombre)).join(' y ')}</p>
              <p className="sl-ganador__dato"><strong>{top.valores[0]}</strong> {M.dato}</p>
            </div>
          ) : (
            <p className="sl-texto">{M.vacio}</p>
          )}
          <p className="sl-texto sl-texto--chico">{M.nota}</p>
          <Marca />
        </div>
        <div className="sl-lista__der">
          <div className={`sl-tabla sl-tabla--c${nCols} sl-tabla--equipo`}>
            {bloques.map((bl, k) => (
              <div key={k} className="sl-tabla__bloque">
                <div className="sl-fila sl-fila--head sl-fila--eq">
                  <span />
                  <span>Asesor</span>
                  {M.cols.map((c) => <span key={c} className="sl-num">{c}</span>)}
                </div>
                {bl.map((r) => (
                  <div key={r.nombre} className={`sl-fila sl-fila--eq${r.lugar <= 3 ? ` sl-fila--l${r.lugar}` : ''}`}>
                    <span className="sl-fila__lugar">{r.lugar}</span>
                    <span className="sl-fila__dos">
                      <span className="sl-fila__nombre">{corto(r.nombre)}</span>
                      {r.sub && <span className="sl-fila__socios">{r.sub}</span>}
                    </span>
                    <span className="sl-num sl-num--fuerte">
                      {nCols === 1 && <span className="sl-fila__barra"><span style={{ width: `${Math.max(4, (r.valores[0] / tope) * 100)}%` }} /></span>}
                      {r.valores[0]}
                    </span>
                    <span className="sl-num">{r.valores[1] || '—'}</span>
                    <span className="sl-num">{r.valores[2] || '—'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Diapositiva>
  );
}

/* ------------------------------------------------------------------ */
/* Apartados en proceso del mes (aparte de los cierres)                 */
/* ------------------------------------------------------------------ */
export function SlideApartados({
  ap, periodo, mes, onAviso,
}: {
  ap: DashboardData['apartadosEnCurso'];
  periodo: string;
  mes: string;
  onAviso: (m: string) => void;
}) {
  const items: TopItem[] = [];
  let lugar = 0, prev = -1;
  ap.porAsesor.forEach((a, i) => {
    if (a.ops !== prev) { lugar = i + 1; prev = a.ops; }
    items.push({ lugar, nombre: nombreCorto(a.nombre), valor: a.ops, venta: a.ventas, renta: a.rentas } as TopItem);
  });
  const total = ap.ventas + ap.rentas;
  return (
    <Diapositiva etiqueta={`Operaciones ${mes}`} archivo={`operaciones-${periodo.toLowerCase().replace(/\s+/g, '-')}`} tema="lista sl--ventas" onAviso={onAviso}>
      <Building2 className="sl-agua" aria-hidden="true" strokeWidth={1} />
      <div className="sl-lista">
        <div className="sl-lista__izq">
          <span className="sl-ico"><Building2 aria-hidden="true" strokeWidth={2.2} /></span>
          <p className="sl-eyebrow">{periodo} · corte {ap.corte}</p>
          <h2 className="sl-h2">Operaciones {mes}</h2>
          <p className="sl-texto">Operaciones de la oficina en {mes} por asesor.</p>
          <div className="sl-kpis">
            <p><strong>{ap.operaciones}</strong><span>operaciones {mes}</span></p>
            <p><strong>{mxnM(total)}</strong><span>valor total</span></p>
          </div>
          <Marca />
        </div>
        <div className="sl-lista__der">
          <Tabla items={items} conLugar columnas={[
            { titulo: 'Operaciones', valor: (i) => i.valor, fuerte: true, barra: true },
            { titulo: 'Venta', valor: (i) => i.venta ?? 0, angosta: true },
            { titulo: 'Renta', valor: (i) => i.renta ?? 0, angosta: true },
          ]} />
          {ap.porAsesor.length < ap.operaciones && (
            <p className="sl-texto sl-texto--chico">Las operaciones compartidas entre dos asesores aparecen con cada uno; el total de la oficina las cuenta una vez.</p>
          )}
        </div>
      </div>
    </Diapositiva>
  );
}

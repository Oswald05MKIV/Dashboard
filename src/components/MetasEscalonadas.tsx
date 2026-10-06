import { useRef } from 'react';
import type { DashboardData } from '../types';
import { MESES_CORTOS, META_OPCIONADAS_NOVATO, PESOS_INDICE } from '../config';
import { fMoney, fNum } from '../lib/metrics';
import { NIVELES, ORDEN_NIVELES, fechaCorta } from '../lib/metasNiveles';
import type { ClaveNivel, ContextoMetas, FilaEscudero, FilaNivel } from '../lib/metasNiveles';
import { EmblemaNivel, EscudoIniciales, RitmoBadge, blasonDe } from './heraldica';
import { TorneoEscuderos, TorneoNiveles } from './TorneoJustas';
import { BotonCaptura } from './TopsJulio';

export type VistaMetas = 'tabla' | 'torneo';

function Switch({ vista, onVista }: { vista: VistaMetas; onVista: (v: VistaMetas) => void }) {
  return (
    <div className="seg rn-switch" role="group" aria-label="Vista de metas">
      <button type="button" className={vista === 'tabla' ? 'on' : ''} onClick={() => onVista('tabla')}>Tabla</button>
      <button type="button" className={vista === 'torneo' ? 'on' : ''} onClick={() => onVista('torneo')}>Torneo</button>
    </div>
  );
}

/** Mes de 12, fecha de hoy y fecha de corte de los datos. */
export function ContextoTiempo({ ctx }: { ctx: ContextoMetas }) {
  const hoy = `${ctx.hoy.anio}-${String(ctx.hoy.mes).padStart(2, '0')}-${String(ctx.hoy.dia).padStart(2, '0')}`;
  return (
    <div className="rn-contexto">
      <span className="rn-chip rn-chip--fuerte">Mes {ctx.mes} de 12</span>
      <span className="rn-chip">Ritmo al día de hoy · {fechaCorta(hoy)}</span>
      <span className="rn-chip">Montos al último corte · {fechaCorta(ctx.fechaCorte)}</span>
    </div>
  );
}

function TablaNivel({ data, k, filas, onSelect }: { data: DashboardData; k: ClaveNivel; filas: FilaNivel[]; onSelect: (n: string) => void }) {
  const info = NIVELES[k];
  return (
    <div className="rn-tabla-nivel">
      <div className="rn-heraldo rn-heraldo--compacto">
        <EmblemaNivel nivel={k} alto={30} />
        <div>
          <p className="rn-heraldo__eyebrow">Meta {info.etiqueta} · {filas.length} {filas.length === 1 ? 'asesor' : 'asesores'}</p>
          <h4 className="rn-heraldo__titulo">{info.territorio}</h4>
        </div>
      </div>
      {!filas.length ? (
        <p className="rn-vacio">Aún nadie ha llegado a este nivel.</p>
      ) : (
        <div className="table-wrap">
          <table className="data rn-tabla">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Nivel</th>
                <th className="r">Meta</th>
                <th className="r">Debería llevar</th>
                <th className="r">Lleva</th>
                <th className="r">% de ritmo</th>
                <th className="r">% meta anual</th>
                <th className="r">Falta</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ a, m }) => (
                <tr key={a.nombre} className="clickable" onClick={() => onSelect(a.nombre)}>
                  <td>
                    <span className="rn-quien">
                      <EscudoIniciales nombre={a.nombre} color={blasonDe(data, a).color} alto={26} />
                      <span>
                        <span className="rn-quien__nombre">{a.nombre}</span>
                        {m.yaCasi && <span className="rn-casi">Te faltan {fMoney(m.falta)} para los {info.etiqueta}</span>}
                      </span>
                    </span>
                  </td>
                  <td>{info.etiqueta}</td>
                  <td className="r num">{fMoney(m.meta)}</td>
                  <td className="r num">{fMoney(m.deberiaLlevar)}</td>
                  <td className="r num">{fMoney(m.lleva)}</td>
                  <td className="r"><RitmoBadge pct={m.pctRitmo} /></td>
                  <td className="r num">{m.pctMeta.toFixed(2)}%</td>
                  <td className="r num">{fMoney(m.falta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MetaAnualEscalonada({ data, ctx, porNivel, vista, onVista, onSelect, onAviso }: {
  data: DashboardData;
  ctx: ContextoMetas;
  porNivel: Record<ClaveNivel, FilaNivel[]>;
  vista: VistaMetas;
  onVista: (v: VistaMetas) => void;
  onSelect: (n: string) => void;
  onAviso: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="rn-card section" ref={ref}>
      <header className="rn-card__top">
        <div>
          <h3 className="rn-card__title">Meta anual escalonada · 360K → 500K → 1M</h3>
          <p className="rn-card__note">
            Año calendario: del 1 de enero al 31 de diciembre de {data.year}; el 1 de enero todos regresan a 360K en cero.
            Debería llevar = meta × mes ÷ 12. % de ritmo = lleva ÷ debería llevar.
          </p>
        </div>
        <div className="rn-acciones">
          <Switch vista={vista} onVista={onVista} />
          <BotonCaptura destino={ref} archivo={`metas-escalonadas-${vista}-mes-${ctx.mes}-${data.year}`} onAviso={onAviso} />
        </div>
      </header>
      <ContextoTiempo ctx={ctx} />
      <p className="rn-medicion">
        <strong>Cómo se mide:</strong> 360K con comisión oficina + asesor (X + Y). 500K y 1M con la comisión total de la
        operación, incluidas las operaciones compartidas (con otro asesor de Terra o con un externo, cada asesor recibe el total completo).
      </p>
      {ctx.anioNuevoSinDatos && (
        <p className="rn-aviso">Arrancó {ctx.hoy.anio}: todos inician en la meta 360K con $0 hasta que se carguen los cierres del año nuevo.</p>
      )}
      {vista === 'tabla' ? (
        [...ORDEN_NIVELES].reverse().map((k) => <TablaNivel key={k} data={data} k={k} filas={porNivel[k]} onSelect={onSelect} />)
      ) : (
        <TorneoNiveles data={data} porNivel={porNivel} ctx={ctx} onSelect={onSelect} />
      )}
    </section>
  );
}

const pct0 = (v: number | null) => (v == null ? null : `${v.toFixed(0)}%`);

export function EscuderosEnFormacion({ data, ctx, escuderos, vista, onVista, onSelect, onAviso }: {
  data: DashboardData;
  ctx: ContextoMetas;
  escuderos: FilaEscudero[];
  vista: VistaMetas;
  onVista: (v: VistaMetas) => void;
  onSelect: (n: string) => void;
  onAviso: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hayProvisional = escuderos.some((e) => e.ind.fuente === 'provisional');
  const sinArchivo = !data.capacitacionArchivo;
  const pesoTxt = `opcionadas ${PESOS_INDICE.opcionadas * 100}%, asistencia ${PESOS_INDICE.asistencia * 100}%, participación ${PESOS_INDICE.participacion * 100}%`;
  return (
    <section className="rn-card rn-card--escuderos section" ref={ref}>
      <header className="rn-card__top">
        <div>
          <h3 className="rn-card__title">Escuderos en formación</h3>
          <p className="rn-card__note">
            Quienes están en capacitación no compiten en metas de dinero: avanzan con su índice de formación (0–100):
            {' '}{pesoTxt}. Si falta un componente, su peso se reparte entre los demás.
          </p>
        </div>
        <div className="rn-acciones">
          <Switch vista={vista} onVista={onVista} />
          <BotonCaptura destino={ref} archivo={`escuderos-mes-${ctx.mes}-${data.year}`} onAviso={onAviso} />
        </div>
      </header>
      {!escuderos.length && <p className="rn-vacio">No hay asesores en capacitación en este momento.</p>}
      {escuderos.length > 0 && vista === 'tabla' && (
        <div className="table-wrap">
          <table className="data rn-tabla">
            <thead>
              <tr>
                <th>Asesor</th>
                <th className="r">Índice</th>
                <th className="r">Opcionadas</th>
                <th className="r">Meta opcionadas</th>
                <th className="r">Asistencia</th>
                <th className="r">Participación</th>
                <th>Siguiente paso</th>
              </tr>
            </thead>
            <tbody>
              {escuderos.map(({ a, ind }) => {
                const marca = ind.fuente === 'provisional' ? '*' : '';
                return (
                  <tr key={a.nombre} className="clickable" onClick={() => onSelect(a.nombre)}>
                    <td>
                      <span className="rn-quien">
                        <EscudoIniciales nombre={a.nombre} color={blasonDe(data, a).color} alto={26} />
                        <span className="rn-quien__nombre">{a.nombre}</span>
                      </span>
                    </td>
                    <td className="r"><strong className="rn-indice rn-indice--chico">{ind.indice.toFixed(0)}</strong></td>
                    <td className="r num" title={`Desde ${MESES_CORTOS[ind.opcionadas.desdeMes - 1]} · ${ind.opcionadas.meses} ${ind.opcionadas.meses === 1 ? 'mes' : 'meses'}`}>{fNum(ind.opcionadas.valor)}</td>
                    <td className="r num">{fNum(ind.opcionadas.meta)}</td>
                    <td className="r num">{pct0(ind.asistencia) ? `${pct0(ind.asistencia)}${marca}` : <span className="rn-sin">Sin datos</span>}</td>
                    <td className="r num">{pct0(ind.participacion) ? `${pct0(ind.participacion)}${marca}` : <span className="rn-sin">Sin datos</span>}</td>
                    <td className="rn-msg">{ind.mensaje}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {escuderos.length > 0 && vista === 'torneo' && <TorneoEscuderos data={data} escuderos={escuderos} onSelect={onSelect} />}
      <p className="rn-card__foot">
        Opcionadas: de OPCIONES.xlsx desde el inicio de su capacitación (o su mes de ingreso), contra la meta de
        {' '}{META_OPCIONADAS_NOVATO} por mes.
        {' '}Asistencia = (Sí + ½ Retardo) ÷ (sesiones − Justificadas). Participación = 70% calificación promedio ÷ 5 + 30% frecuencia.
        {hayProvisional && ' * Estimación provisional de la oficina mientras se llena CAPACITACION.xlsx.'}
        {sinArchivo && ' Sin archivo de capacitación en /data: quien no tiene estimación aparece "sin datos de asistencia/participación".'}
      </p>
    </section>
  );
}

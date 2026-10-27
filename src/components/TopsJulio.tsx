import { useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { capturar } from '../lib/captura';
import dashboardJson from '../generated/dashboard.json';
import type { DashboardData } from '../types';
import { MESES_LARGOS } from '../config';
import { mesPorDefecto, topsDelMes } from '../lib/tops';
import { MINIMO_RENTAS, MINIMO_VENTAS, lugarEnOpciones } from '../lib/tops';
import { SlideFelicitacion, SlideMinimo, SlideNoOpcionaron, SlideRecorridosLeads, SlideSinRecorridos, SlideTop } from './Diapositivas';
import './tops-teams.css';

// Los tops se calculan solos desde dashboard.json: no hay archivo que editar a mano.
const DATA = dashboardJson as unknown as DashboardData;

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
  ancho,
}: {
  destino: RefObject<HTMLElement | null>;
  archivo: string;
  etiqueta?: string;
  solido?: boolean;
  onAviso: (m: string) => void;
  /** Ancho exacto de la imagen (p. ej. 1920 para 16:9). */
  ancho?: number;
}) {
  const [ocupado, setOcupado] = useState(false);

  const tomar = async () => {
    const nodo = destino.current;
    if (!nodo) return;
    setOcupado(true);
    nodo.classList.add('tt-capturando');
    try {
      onAviso(await capturar(nodo, archivo, { ancho }));
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

export default function TopsJulio() {
  const { aviso, mostrar } = useAviso();
  const meses = DATA.mesesDisponibles.filter((m) => m >= 7).sort((a, b) => b - a);
  const [mes, setMes] = useState(mesPorDefecto(DATA));
  const DATOS = useMemo(() => topsDelMes(DATA, mes), [mes]);

  // Reconocimiento: Daniela Morales (oct 2026)
  const dani = DATA.advisors.find((a) => /^daniela morales/i.test(a.nombre));
  const i = mes - 1;
  // Lugar en opciones mostradas (con empates), sin Verónica ni el coordinador.
  const lugarDani = dani ? lugarEnOpciones(DATOS, 'Daniela Morales') : null;

  return (
    <div className="tt-root tp-root">
      <header className="tt-head">
        <div>
          <p className="tt-eyebrow">RE/MAX Terra · {DATOS.periodo}</p>
          <h2 className="tt-title">Tops del mes</h2>
          <p className="tt-sub">
            Imágenes 16:9 listas para compartir: cada botón Capturar descarga la diapositiva en 1920×1080. Rentas y ventas
            no muestran montos y solo aparecen quienes alcanzan el mínimo del mes.
          </p>
        </div>
        <div className="tt-acciones">
          <select className="tt-cap" value={mes} onChange={(e) => setMes(+e.target.value)} aria-label="Mes">
            {meses.map((m) => (
              <option key={m} value={m}>{MESES_LARGOS[m - 1]}{m === DATA.currentMonth ? ' (en curso)' : ''}</option>
            ))}
          </select>
        </div>
      </header>

      <section>
        <h3 className="sl-seccion__t">Primeros lugares</h3>
        <p className="sl-seccion__s">Actividad registrada en el mes y operaciones cerradas dentro del mes.</p>
        <div className="sl-rejilla">
          {DATOS.orden.map((k) => (
            <SlideTop key={`${mes}-${k}`} datos={DATOS} clave={k} onAviso={mostrar} />
          ))}
        </div>
      </section>

      <section className="sl-seccion">
        <h3 className="sl-seccion__t">Recorridos, leads y opcionadas</h3>
        <p className="sl-seccion__s">
          Listas completas del mes. Los marcados en verde en OPCIONES (situación personal) no aparecen en las advertencias.
        </p>
        <div className="sl-rejilla">
          <SlideRecorridosLeads key={`rl-${mes}`} datos={DATOS} onAviso={mostrar} />
          <SlideSinRecorridos key={`sr-${mes}`} datos={DATOS} onAviso={mostrar} />
          <SlideNoOpcionaron key={`no-${mes}`} datos={DATOS} onAviso={mostrar} />
        </div>
      </section>

      <section className="sl-seccion">
        <h3 className="sl-seccion__t">Comunicados</h3>
        <p className="sl-seccion__s">Reglas nuevas del cuadro de honor y reconocimientos.</p>
        <div className="sl-rejilla">
          <SlideMinimo tipo="ventas" minimo={MINIMO_VENTAS} onAviso={mostrar} />
          <SlideMinimo tipo="rentas" minimo={MINIMO_RENTAS} onAviso={mostrar} />
          {dani && (
            <SlideFelicitacion
              nombre="Daniela Morales"
              periodo={DATOS.periodo}
              recorridos={dani.actividad.recorridos[i] || 0}
              lugarOpciones={lugarDani}
              opciones={dani.actividad.opciones[i] || 0}
              onAviso={mostrar}
            />
          )}
        </div>
      </section>

      <p className="tt-foot">
        Atribución por Asesor 1 en cada operación. Un mismo lugar repetido indica empate. Verónica Flores no entra en recorridos,
        opciones ni opcionadas.
      </p>

      {aviso && <div className="tt-toast">{aviso}</div>}
    </div>
  );
}

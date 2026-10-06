// Captura un nodo del DOM como PNG: lo descarga y, si el navegador lo permite,
// también lo deja en el portapapeles para pegarlo directo en WhatsApp/Slack.
// html2canvas se carga desde CDN la primera vez que se usa, así no hay que
// instalar nada en el proyecto. Si prefieres tenerlo local: npm i html2canvas
// y cambia cargarHtml2Canvas por: import html2canvas from 'html2canvas'.

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

let pendiente: Promise<any> | null = null;

function cargarHtml2Canvas(): Promise<any> {
  const w = window as any;
  if (w.html2canvas) return Promise.resolve(w.html2canvas);
  if (pendiente) return pendiente;
  pendiente = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN;
    s.async = true;
    s.onload = () => resolve((window as any).html2canvas);
    s.onerror = () => reject(new Error('No se pudo cargar el generador de imágenes'));
    document.head.appendChild(s);
  });
  return pendiente;
}

const MARGEN = 18; // margen blanco alrededor de la imagen final, en px de CSS

// html2canvas pinta cada <svg> como imagen, y una imagen no puede descargar
// tipografías web: sin esto, los textos de El Reino / Torneo / Mapa saldrían con
// la serif de respaldo. Se incrustan (data:) las @font-face de estas familias
// dentro de los SVG del clon que se captura. Si algo falla, se usa el respaldo.
const FAMILIAS_SVG = ['Cinzel', 'EB Garamond'];
type FuenteSvg = { familia: string; css: string };
let fuentesSvg: Promise<FuenteSvg[]> | null = null;

const leerComoData = (blob: Blob) =>
  new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(blob);
  });

function fuentesIncrustadas(): Promise<FuenteSvg[]> {
  if (fuentesSvg) return fuentesSvg;
  fuentesSvg = (async () => {
    const link = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).find((l) =>
      l.href.includes('fonts.googleapis.com'),
    );
    if (!link) return [];
    const css = await (await fetch(link.href)).text();
    // Solo el subconjunto "latin" (incluye acentos y ñ). Son fuentes variables:
    // un mismo archivo sirve para todos los pesos, así que va una sola vez.
    const unicos = new Map<string, { familia: string; estilo: string; url: string }>();
    for (const b of css.split('}')) {
      if (!b.includes('@font-face') || !b.includes('U+0000-00FF')) continue;
      const familia = FAMILIAS_SVG.find((f) => b.includes(`'${f}'`));
      const url = b.match(/url\((https:[^)]+)\)/)?.[1];
      if (!familia || !url) continue;
      const estilo = /font-style:\s*italic/.test(b) ? 'italic' : 'normal';
      unicos.set(`${familia}|${estilo}|${url}`, { familia, estilo, url });
    }
    return Promise.all(
      Array.from(unicos.values()).map(async ({ familia, estilo, url }) => ({
        familia,
        css: `@font-face{font-family:'${familia}';font-style:${estilo};font-weight:100 900;src:url(${await leerComoData(await (await fetch(url)).blob())}) format('woff2');}`,
      })),
    );
  })().catch(() => {
    fuentesSvg = null;
    return [];
  });
  return fuentesSvg;
}

/** Mete en cada SVG con texto del documento clonado solo las familias que usa. */
function incrustarFuentes(doc: Document, fuentes: FuenteSvg[]) {
  if (!fuentes.length) return;
  const vista = doc.defaultView;
  doc.querySelectorAll('svg').forEach((svg) => {
    const textos = Array.from(svg.querySelectorAll('text'));
    if (!textos.length) return;
    const usadas = new Set(textos.map((t) => (vista ? vista.getComputedStyle(t).fontFamily : t.style.fontFamily)));
    const css = fuentes
      .filter((f) => Array.from(usadas).some((u) => u.includes(f.familia)))
      .map((f) => f.css)
      .join('\n');
    if (!css) return;
    const estilo = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
    estilo.textContent = css;
    svg.insertBefore(estilo, svg.firstChild);
  });
}

export async function capturar(nodo: HTMLElement | null, archivo: string): Promise<string> {
  if (!nodo) throw new Error('No encontré la sección a capturar');
  const html2canvas = await cargarHtml2Canvas();
  // Esperar las tipografías (Cinzel / EB Garamond, Inter…) para que la imagen
  // no salga con la fuente de respaldo, y un cuadro para que se apliquen los
  // estilos de captura (.tt-capturando) antes de medir.
  if (document.fonts?.ready) await document.fonts.ready;
  const cssFuentes = await fuentesIncrustadas();
  await new Promise((r) => {
    requestAnimationFrame(() => r(null));
    setTimeout(() => r(null), 60); // si la pestaña está oculta no hay cuadros
  });

  const escala = Math.min(2, window.devicePixelRatio || 1) * 1.5;
  const caja = nodo.getBoundingClientRect();

  const bruto: HTMLCanvasElement = await html2canvas(nodo, {
    backgroundColor: '#ffffff',
    scale: escala,
    useCORS: true,
    logging: false,
    // Tomar el tamaño real del contenido, no solo lo que se ve en pantalla.
    width: Math.ceil(Math.max(nodo.scrollWidth, caja.width)),
    height: Math.ceil(Math.max(nodo.scrollHeight, caja.height)),
    // Sin esto la imagen sale desfasada cuando la página está scrolleada.
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    onclone: (doc: Document) => incrustarFuentes(doc, cssFuentes),
  });

  // Marco blanco: se dibuja el resultado sobre un lienzo un poco más grande.
  const m = Math.round(MARGEN * escala);
  const canvas = document.createElement('canvas');
  canvas.width = bruto.width + m * 2;
  canvas.height = bruto.height + m * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bruto, m, m);
  }

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen'))), 'image/png'),
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${archivo}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  try {
    const item = new (window as any).ClipboardItem({ 'image/png': blob });
    await (navigator.clipboard as any).write([item]);
    return 'Imagen descargada y copiada al portapapeles';
  } catch {
    return 'Imagen descargada';
  }
}

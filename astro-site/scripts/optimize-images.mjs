// Genera las variantes responsive de las fotos de fondo (public/images/clinic) y reduce logos que se
// descargaban mucho más grandes de lo que se muestran. Se ejecuta a mano con `npm run optimize-images`
// (el resultado se versiona; el build no lo necesita) y es idempotente.
//
// - Fotos de fondo: por cada foto crea `<nombre>-<ancho>w.avif` (todos los anchos) y `<nombre>-<ancho>w.webp`
//   (los anchos menores al original; el original sigue siendo el .webp de mayor tamaño y el respaldo para
//   navegadores sin AVIF). También escribe src/data/imageVariants.json, que lee ResponsiveImg.astro para
//   armar <picture>/srcset y las dimensiones intrínsecas (width/height).
// - Logos: se achican EN SITIO a un ancho máximo (2x–3x el tamaño con que se muestran) solo si son más anchos.
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
const MANIFEST = resolve(ROOT, 'src/data/imageVariants.json');

// Fotos usadas como fondo (SectionBackdrop / PageHero) o como foto de sección grande.
const PHOTOS = [
  '/images/clinic/562-endodontics-london-ontario-clinic-building.webp',
  '/images/clinic/562-endodontics-london-ontario-clinic-reception.webp',
  '/images/clinic/562-endodontics-london-ontario-endodontic-treatment-patient-and-assistants.webp',
  '/images/clinic/562-endodontics-london-ontario-endodontist-treating-patient-with-microscope.webp',
  '/images/clinic/562-endodontics-london-ontario-treatment-room-wide.webp',
  '/images/clinic/562-endodontics-london-ontario-treatment-room.webp',
];
const WIDTHS = [800, 1200];
const AVIF_QUALITY = 50;
const WEBP_QUALITY = 65;

// ruta pública -> ancho máximo (px)
const LOGOS = {
  '/images/logos/gentlewave-authorized-practice-logo.webp': 480,
  '/logo/logo-white.webp': 600,
};

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

const manifest = {};
for (const url of PHOTOS) {
  const file = resolve(PUBLIC, '.' + url);
  const { width, height } = await sharp(file).metadata();
  const widths = [...WIDTHS.filter((w) => w < width), width];
  const base = file.replace(/\.webp$/, '');
  for (const w of widths) {
    const avif = `${base}-${w}w.avif`;
    if (!(await exists(avif))) {
      await sharp(file).resize({ width: w, withoutEnlargement: true }).avif({ quality: AVIF_QUALITY, effort: 6 }).toFile(avif);
      console.log('creado', avif.replace(PUBLIC, ''));
    }
    if (w < width) {
      const webp = `${base}-${w}w.webp`;
      if (!(await exists(webp))) {
        await sharp(file).resize({ width: w }).webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(webp);
        console.log('creado', webp.replace(PUBLIC, ''));
      }
    }
  }
  manifest[url] = { width, height, widths };
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

for (const [url, maxWidth] of Object.entries(LOGOS)) {
  const file = resolve(PUBLIC, '.' + url);
  // Se lee a memoria (no por ruta) para no dejar el archivo abierto al reescribirlo en Windows.
  const input = await readFile(file);
  const { width } = await sharp(input).metadata();
  if (width <= maxWidth) continue;
  const buffer = await sharp(input).resize({ width: maxWidth }).webp({ quality: 85, alphaQuality: 100, effort: 6 }).toBuffer();
  await writeFile(file, buffer);
  console.log(`logo reducido ${url}: ${width}px -> ${maxWidth}px`);
}

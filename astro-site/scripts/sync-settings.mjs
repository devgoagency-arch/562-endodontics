// Sincroniza los datos de la clínica (teléfono, correo, horario, dirección y PDF del referral) desde el
// WordPress headless antes de construir el sitio. Se ejecuta con `npm run sync-settings` y como `prebuild`.
//
// - Si WP_API_URL no está definida, o WordPress no responde / devuelve algo inválido, avisa y sale con
//   código 0 conservando src/data/site-settings.json y el PDF actuales: el build nunca falla por WordPress.
// - Endpoint: ${WP_API_URL}/wp-json/endo562/v1/settings (público, solo lectura, sin credenciales).
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SETTINGS_FILE = resolve(ROOT, 'src/data/site-settings.json');
const PDF_FILE = resolve(ROOT, 'public/files/562-endodontics-patient-referral-form.pdf');
const TIMEOUT_MS = 10_000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const REQUIRED_KEYS = ['phone', 'email', 'hours', 'opens', 'closes', 'street', 'city', 'province', 'postal'];
const OPTIONAL_KEYS = ['referral_pdf'];

const warn = (msg) => console.warn(`[sync-settings] AVISO: ${msg}`);
const info = (msg) => console.log(`[sync-settings] ${msg}`);

// Valida la respuesta y devuelve el objeto limpio (solo las claves esperadas), o lanza un Error con el motivo.
function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('la respuesta no es un objeto JSON');
  const clean = {};
  for (const key of REQUIRED_KEYS) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`falta la clave "${key}" o no es un texto`);
    clean[key] = data[key].trim();
  }
  for (const key of OPTIONAL_KEYS) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] !== 'string') throw new Error(`la clave "${key}" no es un texto`);
    clean[key] = typeof data[key] === 'string' ? data[key].trim() : '';
  }
  if (clean.phone.replace(/\D/g, '').length < 10) throw new Error('"phone" debe tener al menos 10 dígitos');
  for (const key of ['opens', 'closes']) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean[key])) throw new Error(`"${key}" debe tener formato HH:MM`);
  }
  return clean;
}

async function fetchWithTimeout(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: '*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

// Descarga el PDF a un archivo temporal, lo verifica (%PDF y < 15 MB) y solo entonces reemplaza el existente.
async function syncPdf(pdfUrl) {
  let parsed;
  try {
    parsed = new URL(pdfUrl);
  } catch {
    warn('"referral_pdf" no es una URL válida; se conserva el PDF actual.');
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    warn('"referral_pdf" debe ser http(s); se conserva el PDF actual.');
    return;
  }
  const tmp = `${PDF_FILE}.tmp`;
  try {
    const res = await fetchWithTimeout(pdfUrl);
    const declared = Number(res.headers.get('content-length'));
    if (declared > MAX_PDF_BYTES) throw new Error('el PDF pesa más de 15 MB');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length >= MAX_PDF_BYTES) throw new Error('el PDF pesa más de 15 MB');
    if (buf.subarray(0, 4).toString('latin1') !== '%PDF') throw new Error('el archivo no empieza con %PDF');
    await mkdir(dirname(PDF_FILE), { recursive: true });
    await writeFile(tmp, buf);
    await rename(tmp, PDF_FILE);
    info(`PDF del referral actualizado desde ${parsed.host} (${buf.length} bytes).`);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    warn(`no se pudo actualizar el PDF del referral (${err.message}); se conserva el actual.`);
  }
}

async function main() {
  const base = (process.env.WP_API_URL || '').trim().replace(/\/+$/, '');
  if (!base) {
    info('WP_API_URL no está definida; se usan los datos guardados en src/data/site-settings.json.');
    return;
  }

  let settings;
  try {
    const res = await fetchWithTimeout(`${base}/wp-json/endo562/v1/settings`);
    settings = validate(await res.json());
  } catch (err) {
    warn(`no se pudieron leer los datos de WordPress (${err.message}); se conservan los guardados.`);
    return;
  }

  let previous = '';
  try {
    previous = await readFile(SETTINGS_FILE, 'utf8');
  } catch {
    // primer uso: no hay archivo previo
  }
  const next = `${JSON.stringify(settings, null, 2)}\n`;
  if (next !== previous) {
    await writeFile(SETTINGS_FILE, next, 'utf8');
    info('src/data/site-settings.json actualizado desde WordPress.');
  } else {
    info('Los datos de WordPress coinciden con los guardados.');
  }

  if (settings.referral_pdf) await syncPdf(settings.referral_pdf);
}

main().catch((err) => {
  warn(`error inesperado (${err.message}); se conservan los datos guardados.`);
});

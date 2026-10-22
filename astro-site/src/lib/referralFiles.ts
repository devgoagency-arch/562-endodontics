// Archivos adjuntos del referral (radiografías, PDF, etc.), guardados en un Vercel Blob PRIVADO.
// El navegador los sube directo al Blob (sin pasar por la función, que solo recibe 4.5 MB) con un
// "ticket" firmado; el correo de la clínica trae enlaces firmados que vencen.
//
// Seguridad: el ticket y los enlaces llevan una firma HMAC. La clave sale de REFERRAL_SIGNING_SECRET
// o, si no existe, del token del Blob (BLOB_READ_WRITE_TOKEN), que Vercel crea al conectar el Blob.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const TICKET_TTL_SECONDS = 30 * 60; // 30 min para subir los archivos y enviar el formulario
export const RETENTION_DAYS = 365; // los archivos se borran solos a los 12 meses (ver api/cleanup-files)
export const LINK_TTL_SECONDS = RETENTION_DAYS * 24 * 60 * 60; // los enlaces del correo duran lo mismo que el archivo

// Mismos tipos que permitía el formulario de WordPress (JetFormBuilder).
export const ALLOWED_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export const ALLOWED_CONTENT_TYPES = [...new Set(Object.values(ALLOWED_TYPES))];

const secret = () => {
  const key = import.meta.env.REFERRAL_SIGNING_SECRET || import.meta.env.BLOB_READ_WRITE_TOKEN;
  if (!key) throw new Error('Missing REFERRAL_SIGNING_SECRET or BLOB_READ_WRITE_TOKEN');
  return key as string;
};

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('hex');

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const now = () => Math.floor(Date.now() / 1000);

// Ticket: "<carpeta>.<vence>.<firma>". La carpeta es aleatoria y única por referral.
export function createTicket(): { ticket: string; folder: string } {
  const folder = randomBytes(12).toString('hex');
  const exp = now() + TICKET_TTL_SECONDS;
  return { ticket: `${folder}.${exp}.${sign(`ticket:${folder}.${exp}`)}`, folder };
}

export function verifyTicket(ticket: unknown): { folder: string } | null {
  if (typeof ticket !== 'string') return null;
  const [folder, exp, signature] = ticket.split('.');
  if (!/^[0-9a-f]{24}$/.test(folder ?? '') || !/^\d+$/.test(exp ?? '') || !signature) return null;
  if (Number(exp) < now()) return null;
  return safeEqual(signature, sign(`ticket:${folder}.${exp}`)) ? { folder } : null;
}

// Nombre seguro para la ruta de almacenamiento (el nombre original se conserva aparte, para mostrarlo).
export function safeFileName(name: string): string {
  const base = name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '_').replace(/^\.+/, '');
  return (base || 'file').slice(-120);
}

export const extensionOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

export interface FileEntry {
  name: string; // nombre original, tal como lo escribió el dentista
  size: number;
  pathname: string; // ruta dentro del Blob
}

// Valida la lista que manda el navegador. Solo acepta rutas dentro de la carpeta firmada del ticket.
export function parseManifest(raw: unknown, folder: string): FileEntry[] | null {
  if (typeof raw !== 'string' || raw === '') return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || list.length > MAX_FILES) return null;
  const files: FileEntry[] = [];
  for (const item of list) {
    const { name, size, pathname } = (item ?? {}) as Record<string, unknown>;
    if (typeof name !== 'string' || typeof pathname !== 'string' || typeof size !== 'number') return null;
    if (name.length > 200 || size < 0 || size > MAX_FILE_BYTES) return null;
    if (!pathname.startsWith(`referrals/${folder}/`) || pathname.includes('..')) return null;
    if (!(extensionOf(name) in ALLOWED_TYPES)) return null;
    files.push({ name, size, pathname });
  }
  return files;
}

// Enlace de descarga firmado: /api/referral-file?p=<ruta>&n=<nombre>&e=<vence>&s=<firma>
export function signedLink(origin: string, file: FileEntry): string {
  const exp = now() + LINK_TTL_SECONDS;
  const params = new URLSearchParams({ p: file.pathname, n: file.name, e: String(exp) });
  params.set('s', sign(`file:${file.pathname}|${file.name}|${exp}`));
  return `${origin}/api/referral-file?${params.toString()}`;
}

export function verifyLink(params: URLSearchParams): { pathname: string; name: string } | null {
  const pathname = params.get('p'), name = params.get('n'), exp = params.get('e'), signature = params.get('s');
  if (!pathname || !name || !exp || !signature || !/^\d+$/.test(exp)) return null;
  if (Number(exp) < now() || !pathname.startsWith('referrals/')) return null;
  return safeEqual(signature, sign(`file:${pathname}|${name}|${exp}`)) ? { pathname, name } : null;
}

// Archivos con más de RETENTION_DAYS de antigüedad (los que borra la tarea programada).
export function selectExpired(blobs: { pathname: string; uploadedAt: Date | string }[], nowMs = Date.now()): string[] {
  const cutoff = nowMs - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff).map((b) => b.pathname);
}

export const formatBytes = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

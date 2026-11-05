// Dimensiones intrínsecas (px) de una imagen de public/ (ruta pública "/images/..."), leídas al construir el
// sitio. Se usan como atributos width/height de <img> para que el navegador reserve el espacio antes de que
// cargue (sin saltos de diseño). Con URLs externas o si falla la lectura devuelve {} y no se ponen atributos.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const cache = new Map<string, { width?: number; height?: number }>();

export async function imageSize(src: string): Promise<{ width?: number; height?: number }> {
  if (!src.startsWith('/')) return {};
  const cached = cache.get(src);
  if (cached) return cached;
  let size: { width?: number; height?: number } = {};
  try {
    const meta = await sharp(await readFile(path.join(process.cwd(), 'public', src))).metadata();
    if (meta.width && meta.height) size = { width: meta.width, height: meta.height };
  } catch {}
  cache.set(src, size);
  return size;
}

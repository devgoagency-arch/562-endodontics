import type { APIRoute } from 'astro';
import { get } from '@vercel/blob';
import { verifyLink } from '../../lib/referralFiles';

// Descarga de un archivo del referral (Blob privado). Solo funciona con el enlace firmado que va en el
// correo de la clínica y vence a los 12 meses. Conserva el nombre original del archivo.
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const link = verifyLink(url.searchParams);
  if (!link) return new Response('This link is invalid or has expired.', { status: 403 });

  const result = await get(link.pathname, { access: 'private' }).catch(() => null);
  if (!result || result.statusCode !== 200) return new Response('File not found.', { status: 404 });

  // Imágenes y PDF se abren en el navegador (clic derecho → guardar como); el resto se descarga.
  const filename = encodeURIComponent(link.name);
  const contentType = result.blob.contentType || 'application/octet-stream';
  const inline = /^image\/(jpeg|png)$|^application\/pdf$/.test(contentType);
  return new Response(result.stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
};

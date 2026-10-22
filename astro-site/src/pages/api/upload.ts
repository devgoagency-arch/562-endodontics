import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ALLOWED_CONTENT_TYPES, MAX_FILE_BYTES, verifyTicket } from '../../lib/referralFiles';

// Paso 2: Vercel Blob llama aquí para entregar al navegador un token de subida de UN archivo. Solo se
// concede si el ticket es válido y la ruta queda dentro de su carpeta; con tipo y tamaño limitados.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const ticket = verifyTicket(clientPayload);
        if (!ticket) throw new Error('Invalid or expired upload ticket');
        if (!pathname.startsWith(`referrals/${ticket.folder}/`) || pathname.includes('..')) throw new Error('Invalid upload path');
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Blob upload token error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};

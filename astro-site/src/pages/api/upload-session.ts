import type { APIRoute } from 'astro';
import { CaptchaNotConfiguredError, clientIp, verifyTurnstile } from '../../lib/turnstile';
import { createTicket } from '../../lib/referralFiles';

// Paso 1 de la subida de archivos del referral: el navegador manda el token del captcha y recibe un
// "ticket" firmado (carpeta aleatoria + vencimiento de 30 min). Sin ticket válido no se puede subir.
export const prerender = false;

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  let token = '';
  try {
    token = String(((await request.json()) as { turnstile?: string }).turnstile ?? '');
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  try {
    if (!(await verifyTurnstile(token, clientIp(request)))) return json({ error: 'Captcha verification failed' }, 400);
  } catch (error) {
    console.error('Captcha verification error (upload-session)', error);
    return json({ error: error instanceof CaptchaNotConfiguredError ? 'Captcha not configured' : 'Captcha verification unavailable' }, 500);
  }

  try {
    return json(createTicket(), 200);
  } catch (error) {
    console.error('Upload ticket error', error);
    return json({ error: 'File storage not configured' }, 500);
  }
};

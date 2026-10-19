// Verificación de Cloudflare Turnstile en el servidor. El widget del navegador solo genera
// un token: sin esta comprobación no protege nada. Falla cerrado: sin clave secreta, o si
// Cloudflare no responde, el formulario no se envía.
const SECRET_KEY = import.meta.env.TURNSTILE_SECRET_KEY;

export class CaptchaNotConfiguredError extends Error {
  constructor() {
    super('Turnstile is not configured (TURNSTILE_SECRET_KEY)');
  }
}

export const TURNSTILE_FIELD = 'cf-turnstile-response';

export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  if (!SECRET_KEY) throw new CaptchaNotConfiguredError();
  if (!token) return false;

  const body = new URLSearchParams({ secret: SECRET_KEY, response: token });
  if (ip) body.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!response.ok) throw new Error(`Turnstile siteverify failed (${response.status})`);

  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

// Primera dirección de x-forwarded-for (la del visitante en Vercel).
export const clientIp = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

import type { APIRoute } from 'astro';
import { CaptchaNotConfiguredError, TURNSTILE_FIELD, clientIp, verifyTurnstile } from '../../lib/turnstile';
import { MAIL_FROM, escapeHtml, isEmail, sendMail } from '../../lib/mail';
import { saveSubscriber, subscribersConfigured } from '../../lib/subscribers';

// Suscripción al newsletter (pie de página): avisa a la clínica por correo y guarda el correo en la lista
// de suscriptores del WordPress. Basta con que uno de los dos funcione para no perder al suscriptor.
export const prerender = false;

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  // Campo trampa anti-spam: si viene lleno es un bot; se responde OK sin hacer nada.
  if (formData.get('website')) return json({ ok: true }, 200);

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!isEmail(email) || email.length > 191) return json({ error: 'Invalid email', missing: ['email'] }, 400);

  try {
    const token = String(formData.get(TURNSTILE_FIELD) ?? '');
    if (!(await verifyTurnstile(token, clientIp(request)))) return json({ error: 'Captcha verification failed' }, 400);
  } catch (error) {
    console.error('Captcha verification error', error);
    return json({ error: error instanceof CaptchaNotConfiguredError ? 'Captcha not configured' : 'Captcha verification unavailable' }, 500);
  }

  const results = await Promise.allSettled([
    sendMail({
      to: [MAIL_FROM],
      subject: `New newsletter subscriber: ${email}`,
      html: `<p>A new person subscribed to the 562 endodontics newsletter from the website:</p><p><strong>${escapeHtml(email)}</strong></p>${
        subscribersConfigured ? '<p>The address was also added to the Subscribers list in the website admin.</p>' : ''
      }`,
    }),
    subscribersConfigured ? saveSubscriber(email, 'Website footer') : Promise.reject(new Error('Subscriber list not configured')),
  ]);
  results.forEach((result, i) => {
    if (result.status === 'rejected' && !(i === 1 && !subscribersConfigured)) {
      console.error(i === 0 ? 'Failed to send subscriber email' : 'Failed to save subscriber to WordPress', result.reason);
    }
  });
  if (results.every((result) => result.status === 'rejected')) return json({ error: 'Failed to subscribe' }, 500);

  return json({ ok: true }, 200);
};

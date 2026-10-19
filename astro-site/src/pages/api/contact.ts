import type { APIRoute } from 'astro';
import { CaptchaNotConfiguredError, TURNSTILE_FIELD, clientIp, verifyTurnstile } from '../../lib/turnstile';
import { MAIL_FROM, MailNotConfiguredError, escapeHtml, isEmail, sendMail } from '../../lib/mail';

// Formulario de contacto general (ContactCta.astro) — mismo patrón que /api/referral:
// valida server-side y envía el aviso a la clínica desde su Microsoft 365 (ver lib/mail.ts).
export const prerender = false;

const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'email'];

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  // Campo trampa anti-spam: los humanos no lo ven; si viene lleno es un bot.
  // Se responde OK sin enviar nada para no darle pistas.
  if (formData.get('website')) return json({ ok: true }, 200);

  const missing = REQUIRED_FIELDS.filter((field) => !formData.get(field));
  if (missing.length > 0) return json({ error: 'Missing required fields', missing }, 400);

  const contact: Record<string, string> = Object.fromEntries(
    [...new Set(formData.keys())]
      .filter((key) => key !== 'website' && key !== TURNSTILE_FIELD)
      .map((key) => [key, formData.getAll(key).join(', ')])
  );
  if (!isEmail(contact.email)) return json({ error: 'Invalid email', missing: ['email'] }, 400);

  // Captcha (Cloudflare Turnstile): se verifica antes de mandar cualquier correo.
  try {
    const token = String(formData.get(TURNSTILE_FIELD) ?? '');
    if (!(await verifyTurnstile(token, clientIp(request)))) return json({ error: 'Captcha verification failed' }, 400);
  } catch (error) {
    console.error('Captcha verification error', error);
    return json({ error: error instanceof CaptchaNotConfiguredError ? 'Captcha not configured' : 'Captcha verification unavailable' }, 500);
  }

  const rows = Object.entries(contact)
    .map(([k, v]) => `<tr><td style="font-weight:600;padding:4px 8px;">${escapeHtml(k)}</td><td style="padding:4px 8px;">${escapeHtml(v)}</td></tr>`)
    .join('');

  try {
    await sendMail({
      to: [MAIL_FROM],
      replyTo: contact.email,
      subject: `New contact form message from ${contact.first_name} ${contact.last_name}`,
      html: `<table>${rows}</table>`,
    });
  } catch (error) {
    console.error('Failed to send contact email', error);
    return json({ error: error instanceof MailNotConfiguredError ? 'Email provider not configured' : 'Failed to send email' }, 500);
  }

  return json({ ok: true }, 200);
};

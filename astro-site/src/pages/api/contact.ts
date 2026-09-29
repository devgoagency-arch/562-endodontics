import type { APIRoute } from 'astro';

// Formulario de contacto general (ContactCta.astro) — mismo patrón que
// /api/referral: valida server-side y arma el email; el proveedor real de
// envío queda pendiente de la misma decisión de negocio (ver referral.ts).
export const prerender = false;

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'email'];

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  // Campo trampa anti-spam: los humanos no lo ven; si viene lleno es un bot.
  // Se responde OK sin enviar nada para no darle pistas.
  if (formData.get('website')) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const missing = REQUIRED_FIELDS.filter((field) => !formData.get(field));
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: 'Missing required fields', missing }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contact: Record<string, string> = Object.fromEntries(
    [...new Set(formData.keys())]
      .filter((key) => key !== 'website')
      .map((key) => [key, formData.getAll(key).join(', ')])
  );

  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'contact@562endodontics.com',
      to: ['info@562endodontics.com'],
      subject: `New contact form message from ${contact.first_name} ${contact.last_name}`,
      html: `<table>${Object.entries(contact).map(([k, v]) => `<tr><td style="font-weight:600;padding:4px 8px;">${esc(k)}</td><td style="padding:4px 8px;">${esc(v)}</td></tr>`).join('')}</table>`,
    }),
  });

  if (!resendResponse.ok) {
    console.error('Failed to send email via Resend', await resendResponse.text());
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

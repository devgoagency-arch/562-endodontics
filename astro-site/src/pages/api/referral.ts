import type { APIRoute } from 'astro';

// Se renderiza on-demand (Vercel Function), no en build time — un formulario
// con datos de paciente nunca debe quedar pre-renderizado como HTML estático.
export const prerender = false;

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Nombres alineados al formulario original (JetFormBuilder) — ver auditoría
// del cliente. `refering_doctor[]` (checkboxes) queda fuera a propósito: en
// el original es opcional/multi-selección, no un campo único requerido.
const REQUIRED_FIELDS = [
  'doctor_name', 'doctor_last_name', '_email', 'OfficePhoneNumber', 'office_name',
  'first_name', 'last_name', 'cell_phone', 'date_birth',
  'tooth_number', 'referred_for', 'tooth_status', 'restorative_treatment_planned',
  'restoration_after_treatment', '_company', 'terms_conditions',
];

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * DECISIONES PENDIENTES ANTES DE PRODUCCIÓN (no técnicas, de negocio/cumplimiento):
 *
 * 1. Almacenamiento de adjuntos (radiografías): esto es PHI bajo PIPEDA.
 *    Los Functions de Vercel tienen límite de tamaño de payload (~4.5 MB en
 *    plan Hobby) — el formulario actual permite hasta 10 MB por archivo, así
 *    que archivos grandes deben subirse directo a almacenamiento (ej. S3/R2
 *    con URL pre-firmada) desde el navegador, no pasar por esta función.
 *    Hasta que se decida, los adjuntos se validan pero NO se envían.
 * 2. Proveedor de email transaccional (Resend, Postmark, SES) — falta la
 *    API key y decidir si el hosting de datos debe ser en Canadá.
 * 3. Retención: ¿cuánto tiempo se guardan los adjuntos? ¿quién tiene acceso?
 */
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  // Campo trampa anti-spam: los humanos no lo ven; si viene lleno es un bot.
  // Se responde OK sin enviar nada para no darle pistas.
  if (formData.get('website')) return json({ ok: true }, 200);

  const missing = REQUIRED_FIELDS.filter((field) => !formData.get(field));
  if (missing.length > 0) return json({ error: 'Missing required fields', missing }, 400);

  const referral: Record<string, string> = Object.fromEntries(
    [...new Set(formData.keys())]
      .filter((key) => key !== 'media_field[]' && key !== 'website')
      .map((key) => [key, formData.getAll(key).join(', ')])
  );

  const attachments = formData.getAll('media_field[]').filter((f): f is File => f instanceof File && f.size > 0);
  const oversized = attachments.filter((f) => f.size > 10 * 1024 * 1024);
  if (oversized.length > 0) {
    return json({ error: 'File exceeds 10 MB limit', files: oversized.map((f) => f.name) }, 400);
  }

  // Sin proveedor configurado no se finge éxito: el formulario muestra el error
  // con el teléfono de la clínica en vez de decirle al dentista que todo salió bien.
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return json({ error: 'Email provider not configured' }, 500);
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'referrals@562endodontics.com',
      to: [referral._email, 'info@562endodontics.com'],
      subject: `New referral: ${referral.first_name} ${referral.last_name}`,
      html: renderReferralEmail(referral),
    }),
  });

  if (!resendResponse.ok) {
    console.error('Failed to send referral email via Resend', await resendResponse.text());
    return json({ error: 'Failed to send email' }, 500);
  }

  return json({ ok: true }, 200);
};

function renderReferralEmail(referral: Record<string, string>): string {
  const rows = Object.entries(referral)
    .map(([key, value]) => `<tr><td style="padding:4px 8px;font-weight:600;">${esc(key)}</td><td style="padding:4px 8px;">${esc(value)}</td></tr>`)
    .join('');
  return `<table>${rows}</table>`;
}

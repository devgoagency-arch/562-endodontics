import type { APIRoute } from 'astro';

// Se renderiza on-demand (Vercel Function), no en build time — un formulario
// con datos de paciente nunca debe quedar pre-renderizado como HTML estático.
export const prerender = false;

// Nombres alineados al formulario original (JetFormBuilder) — ver auditoría
// del cliente. `refering_doctor[]` (checkboxes) queda fuera a propósito: en
// el original es opcional/multi-selección, no un campo único requerido.
const REQUIRED_FIELDS = [
  'doctor_name', 'doctor_last_name', '_email', 'OfficePhoneNumber', 'office_name',
  'first_name', 'last_name', 'cell_phone', 'date_birth',
  'tooth_number', 'referred_for', 'tooth_status', 'restorative_treatment_planned',
  'restoration_after_treatment', '_company', 'terms_conditions',
];

/**
 * DECISIONES PENDIENTES ANTES DE PRODUCCIÓN (no técnicas, de negocio/cumplimiento):
 *
 * 1. Almacenamiento de adjuntos (radiografías): esto es PHI bajo PIPEDA.
 *    Los Functions de Vercel tienen límite de tamaño de payload (~4.5 MB en
 *    plan Hobby) — el formulario actual permite hasta 10 MB por archivo, así
 *    que archivos grandes deben subirse directo a almacenamiento (ej. S3/R2
 *    con URL pre-firmada) desde el navegador, no pasar por esta función.
 * 2. Proveedor de email transaccional (Resend, Postmark, SES) — falta la
 *    API key y decidir si el hosting de datos debe ser en Canadá.
 * 3. Retención: ¿cuánto tiempo se guardan los adjuntos? ¿quién tiene acceso?
 *
 * Mientras esas decisiones no estén tomadas, este endpoint válida y arma el
 * payload pero el envío real de email/almacenamiento queda marcado con TODO.
 */
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  const missing = REQUIRED_FIELDS.filter((field) => !formData.get(field));
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: 'Missing required fields', missing }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const referral = Object.fromEntries(
    [...formData.entries()].filter(([key]) => key !== 'media_field[]')
  );

  const attachments = formData.getAll('media_field[]').filter((f): f is File => f instanceof File && f.size > 0);
  const oversized = attachments.filter((f) => f.size > 10 * 1024 * 1024);
  if (oversized.length > 0) {
    return new Response(JSON.stringify({ error: 'File exceeds 10 MB limit', files: oversized.map((f) => f.name) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: reemplazar por el proveedor real una vez decidido (ver notas arriba).
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'referrals@562endodontics.com',
        to: [referral._email as string, 'info@562endodontics.com'],
        subject: `New referral: ${referral.first_name} ${referral.last_name}`,
        html: renderReferralEmail(referral),
        // Adjuntos: Resend acepta base64 hasta ~40MB combinados; para archivos
        // grandes preferir un link a almacenamiento en vez de adjuntar aquí.
      }),
    }).catch(() => {
      // No se bloquea la respuesta al usuario por un fallo de envío de email;
      // se registra para seguimiento manual. Sustituir por logging real.
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

function renderReferralEmail(referral: Record<string, FormDataEntryValue>): string {
  const rows = Object.entries(referral)
    .map(([key, value]) => `<tr><td style="padding:4px 8px;font-weight:600;">${key}</td><td style="padding:4px 8px;">${value}</td></tr>`)
    .join('');
  return `<table>${rows}</table>`;
}

import type { APIRoute } from 'astro';
import { CaptchaNotConfiguredError, TURNSTILE_FIELD, clientIp, verifyTurnstile } from '../../lib/turnstile';
import { MAIL_FROM, MailNotConfiguredError, isEmail, sendMail } from '../../lib/mail';
import { clinicEmail, doctorEmail, patientEmail } from '../../lib/referralEmail';

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

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * DECISIONES PENDIENTES ANTES DE PRODUCCIÓN (no técnicas, de negocio/cumplimiento):
 *
 * 1. Adjuntos (radiografías): son datos de salud (PHI). Los Functions de Vercel limitan el
 *    tamaño del payload (~4.5 MB en el plan Hobby) y el formulario permite hasta 10 MB por
 *    archivo, así que los archivos grandes deben subirse directo a un almacenamiento (ej.
 *    S3/R2 con URL pre-firmada). Hasta que se decida, los adjuntos se validan pero NO se envían.
 * 2. Retención: ¿cuánto tiempo se guardan los adjuntos? ¿quién tiene acceso?
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
      .filter((key) => key !== 'media_field[]' && key !== 'website' && key !== TURNSTILE_FIELD)
      .map((key) => [key, formData.getAll(key).join(', ')])
  );
  if (!isEmail(referral._email)) return json({ error: 'Invalid email', missing: ['_email'] }, 400);

  // Captcha (Cloudflare Turnstile): se verifica antes de mandar cualquier correo.
  try {
    const token = String(formData.get(TURNSTILE_FIELD) ?? '');
    if (!(await verifyTurnstile(token, clientIp(request)))) return json({ error: 'Captcha verification failed' }, 400);
  } catch (error) {
    console.error('Captcha verification error', error);
    return json({ error: error instanceof CaptchaNotConfiguredError ? 'Captcha not configured' : 'Captcha verification unavailable' }, 500);
  }

  const attachments = formData.getAll('media_field[]').filter((f): f is File => f instanceof File && f.size > 0);
  const oversized = attachments.filter((f) => f.size > 10 * 1024 * 1024);
  if (oversized.length > 0) {
    return json({ error: 'File exceeds 10 MB limit', files: oversized.map((f) => f.name) }, 400);
  }

  // Aviso a la clínica. Si falla, no se finge éxito: el formulario muestra el error con
  // el teléfono de la clínica en vez de decirle al dentista que todo salió bien.
  try {
    const mail = clinicEmail(referral);
    await sendMail({ to: [MAIL_FROM], replyTo: referral._email, ...mail });
  } catch (error) {
    console.error('Failed to send referral email', error);
    return json({ error: error instanceof MailNotConfiguredError ? 'Email provider not configured' : 'Failed to send email' }, 500);
  }

  // Confirmación para el dentista que refiere. El remitente es siempre la clínica; si falla, la
  // clínica ya tiene el referral.
  try {
    await sendMail({ to: [referral._email], replyTo: MAIL_FROM, ...doctorEmail(referral) });
  } catch (error) {
    console.error('Failed to send referral copy to the referring doctor', error);
  }

  // Aviso al paciente: solo si la clínica lo activó (REFERRAL_NOTIFY_PATIENT=true) y el
  // dentista dejó un correo válido. Lleva únicamente datos de contacto de la clínica.
  if (import.meta.env.REFERRAL_NOTIFY_PATIENT === 'true' && referral._patient_email && isEmail(referral._patient_email)) {
    try {
      await sendMail({ to: [referral._patient_email], replyTo: MAIL_FROM, ...patientEmail(referral) });
    } catch (error) {
      console.error('Failed to send referral notice to the patient', error);
    }
  }

  return json({ ok: true }, 200);
};


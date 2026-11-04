import type { APIRoute } from 'astro';
import { CaptchaNotConfiguredError, TURNSTILE_FIELD, clientIp, verifyTurnstile } from '../../lib/turnstile';
import { get } from '@vercel/blob';
import { INLINE_ATTACHMENTS_MAX, MAIL_FROM, MailNotConfiguredError, MailSendError, isEmail, sendMail, sendMailWithAttachments, type MailAttachment } from '../../lib/mail';
import { clinicEmail, doctorEmail, patientEmail } from '../../lib/referralEmail';
import { postToWordPress, wordpressConfigured } from '../../lib/wordpress';
import { referralRows } from '../../lib/referralFields';
import { ALLOWED_TYPES, extensionOf, parseManifest, signedLink, verifyTicket, type FileEntry } from '../../lib/referralFiles';

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

// Baja del Blob privado los archivos del referral para adjuntarlos al correo (de uno en uno).
async function loadAttachments(files: FileEntry[]): Promise<MailAttachment[]> {
  const attachments: MailAttachment[] = [];
  for (const file of files) {
    const result = await get(file.pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${file.pathname}`);
    attachments.push({
      name: file.name,
      contentType: ALLOWED_TYPES[extensionOf(file.name)] ?? 'application/octet-stream',
      data: new Uint8Array(await new Response(result.stream).arrayBuffer()),
    });
  }
  return attachments;
}

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * DECISIONES PENDIENTES ANTES DE PRODUCCIÓN (no técnicas, de negocio/cumplimiento):
 *
 * 1. Adjuntos (radiografías): son datos de salud (PHI). Se guardan en un Vercel Blob PRIVADO (servidores
 *    de Vercel, no necesariamente en Canadá). La clínica debe aceptarlo.
 * 2. Retención: los enlaces del correo y los archivos duran 12 meses; luego se borran solos
 *    (api/cleanup-files, tarea programada de vercel.json).
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
      .filter((key) => !['media_field[]', 'website', 'file_ticket', 'file_manifest', TURNSTILE_FIELD].includes(key))
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

  // Los archivos NO viajan en este envío (la función solo recibe 4.5 MB): el navegador ya los subió al
  // Blob privado y manda su lista junto con el ticket firmado. Se aceptan solo rutas dentro de su carpeta.
  if (formData.getAll('media_field[]').some((f) => f instanceof File && f.size > 0)) {
    return json({ error: 'Files must be uploaded before submitting' }, 400);
  }
  let files: FileEntry[] = [];
  const manifest = String(formData.get('file_manifest') ?? '');
  if (manifest) {
    try {
      const ticket = verifyTicket(String(formData.get('file_ticket') ?? ''));
      if (!ticket) return json({ error: 'Invalid or expired upload ticket' }, 400);
      const parsed = parseManifest(manifest, ticket.folder);
      if (!parsed) return json({ error: 'Invalid file list' }, 400);
      files = parsed;
    } catch (error) {
      console.error('File ticket error', error);
      return json({ error: 'File storage not configured' }, 500);
    }
  }
  const origin = new URL(request.url).origin;
  const clinicFiles = files.map((f) => ({ name: f.name, size: f.size, url: signedLink(origin, f) }));
  const doctorFiles = files.map((f) => ({ name: f.name, size: f.size }));

  // Aviso a la clínica. Si falla, no se finge éxito: el formulario muestra el error con
  // el teléfono de la clínica en vez de decirle al dentista que todo salió bien.
  try {
    // Con archivos, primero se intenta adjuntarlos al correo (como hacía WordPress): hasta ~2.8 MB en total
    // va directo; más que eso necesita el permiso Mail.ReadWrite en Azure. Si no se puede, sale el correo
    // normal con los enlaces de descarga.
    let sent = false;
    if (files.length > 0) {
      try {
        const attachments = await loadAttachments(files);
        const total = attachments.reduce((sum, file) => sum + file.data.byteLength, 0);
        const mail = { to: [MAIL_FROM], replyTo: referral._email, ...clinicEmail(referral, clinicFiles, true) };
        if (total <= INLINE_ATTACHMENTS_MAX) await sendMail({ ...mail, attachments });
        else await sendMailWithAttachments(mail, attachments);
        sent = true;
      } catch (error) {
        if (error instanceof MailSendError) throw error;
        console.error('Could not attach the files; sending the email with download links only', error);
      }
    }
    if (!sent) await sendMail({ to: [MAIL_FROM], replyTo: referral._email, ...clinicEmail(referral, clinicFiles) });
  } catch (error) {
    console.error('Failed to send referral email', error);
    return json({ error: error instanceof MailNotConfiguredError ? 'Email provider not configured' : 'Failed to send email' }, 500);
  }

  // Copia en la sección "Referrals" del WordPress de la clínica (datos + enlaces a los documentos). El correo es
  // lo principal: si esto falla solo se registra, no se le avisa al dentista.
  if (wordpressConfigured) {
    try {
      await postToWordPress('referral', { fields: referral, rows: referralRows(referral), files: clinicFiles });
    } catch (error) {
      console.error('Failed to save the referral in WordPress', error);
    }
  }

  // Confirmación para el dentista que refiere. El remitente es siempre la clínica; si falla, la
  // clínica ya tiene el referral.
  try {
    await sendMail({ to: [referral._email], replyTo: MAIL_FROM, ...doctorEmail(referral, doctorFiles) });
  } catch (error) {
    console.error('Failed to send referral copy to the referring doctor', error);
  }

  // Aviso al paciente: solo si la clínica lo activó (REFERRAL_NOTIFY_PATIENT=true) y el
  // dentista dejó un correo válido. Lleva únicamente datos de contacto de la clínica.
  const notifyPatient = ['true', '1', 'yes'].includes(String(import.meta.env.REFERRAL_NOTIFY_PATIENT ?? '').trim().toLowerCase());
  if (notifyPatient && referral._patient_email && isEmail(referral._patient_email)) {
    try {
      await sendMail({ to: [referral._patient_email], replyTo: MAIL_FROM, ...patientEmail(referral) });
    } catch (error) {
      console.error('Failed to send referral notice to the patient', error);
    }
  }

  return json({ ok: true }, 200);
};


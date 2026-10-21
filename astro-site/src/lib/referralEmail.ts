// Correos del formulario de referral: uno para la clínica, uno para el dentista que refiere y
// (opcional) uno para el paciente. Son HTML con estilos en línea y tablas, que es lo único que
// renderizan bien los clientes de correo (Outlook incluido). Sin imágenes: Outlook de escritorio
// no soporta WebP y las imágenes remotas suelen bloquearse.
import { hours } from '../data/business';
import { escapeHtml } from './mail';

type Referral = Record<string, string>;
type Row = [label: string, value: string | undefined];

export interface BuiltEmail {
  subject: string;
  html: string;
}

const BRAND = '#B13E25';
const BEIGE = '#E3DBD4';
const INK = '#484B54';
const PHONE = '(519) 601-3636';
const ADDRESS = '562 Waterloo Street, London, Ontario N6B 2P9';

const formatDate = (iso?: string) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
};

const clean = (value?: string) => (value ?? '').trim();

function sectionsOf(r: Referral): { title: string; rows: Row[] }[] {
  return [
    {
      title: 'Referring dentist',
      rows: [
        ['Name', `Dr. ${clean(r.doctor_name)} ${clean(r.doctor_last_name)}`],
        ['Office', r.office_name],
        ['Email', r._email],
        ['Office phone', r.OfficePhoneNumber],
        ['Preferred provider', r['refering_doctor[]']],
      ],
    },
    {
      title: 'Patient',
      rows: [
        ['Name', `${clean(r.first_name)} ${clean(r.last_name)}`],
        ['Date of birth', formatDate(r.date_birth)],
        ['Preferred phone', r.cell_phone],
        ['Home phone', r.home_phone],
        ['Email', r._patient_email],
      ],
    },
    {
      title: 'Referral',
      rows: [
        ['Referred for', r.referred_for],
        ['Tooth number(s)', r.tooth_number],
        ['Tooth status', r.tooth_status],
        ['Restorative treatment planned by referring dentist', r.restorative_treatment_planned],
        ['Restoration after treatment', r.restoration_after_treatment],
      ],
    },
    {
      title: 'Insurance',
      rows: [
        ['Company', r._company],
        ['Member / certificate ID', r.member_id_policy],
        ['Group / policy #', r.group_number],
        ['Policy holder', r.policy_holder],
        ['Policy holder date of birth', formatDate(r.policy_holder_date_birth)],
        ['Policy holder address', r.policy_holder_address],
      ],
    },
    { title: 'Special accommodation', rows: [['Notes', r.special_considerations]] },
  ];
}

function renderSections(r: Referral): string {
  return sectionsOf(r)
    .map(({ title, rows }) => {
      const visible = rows.filter(([, value]) => clean(value));
      if (visible.length === 0) return '';
      const body = visible
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 12px 6px 0;width:38%;vertical-align:top;font-size:14px;color:#777;">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top;font-size:15px;color:${INK};">${escapeHtml(clean(value))}</td></tr>`
        )
        .join('');
      return `<tr><td style="padding:18px 0 4px;"><div style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${BRAND};border-bottom:2px solid ${BEIGE};padding-bottom:6px;">${escapeHtml(title)}</div></td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>`;
    })
    .join('');
}

const isEmergency = (r: Referral) => r.referred_for === 'Emergency Appointment';
const wantsSedation = (r: Referral) => clean(r.dental_anxiety_sedation) !== '';

function badges(r: Referral): string {
  const items: string[] = [];
  if (isEmergency(r)) items.push('EMERGENCY APPOINTMENT');
  if (wantsSedation(r)) items.push('Dental anxiety: please discuss sedation options');
  if (items.length === 0) return '';
  const chips = items
    .map((text, i) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:14px;font-size:13px;font-weight:bold;color:#fff;background:${i === 0 && isEmergency(r) ? '#C0392B' : BRAND};">${escapeHtml(text)}</span>`)
    .join('');
  return `<tr><td style="padding:14px 0 0;">${chips}</td></tr>`;
}

function layout(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2eeea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2eeea;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:${INK};">
<tr><td style="background:${BRAND};padding:20px 28px;"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#f3d6cd;">562 endodontics</div><div style="font-size:22px;font-weight:bold;color:#ffffff;padding-top:4px;">${escapeHtml(title)}</div></td></tr>
<tr><td style="padding:8px 28px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner}</table></td></tr>
<tr><td style="background:${BEIGE};padding:16px 28px;font-size:13px;color:${INK};">562 endodontics · ${escapeHtml(ADDRESS)} · ${PHONE}</td></tr>
</table>
</td></tr></table></body></html>`;
}

const intro = (html: string) => `<tr><td style="padding:18px 0 0;font-size:16px;line-height:1.5;color:${INK};">${html}</td></tr>`;

const submittedAt = () =>
  new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' });

export function clinicEmail(r: Referral): BuiltEmail {
  const patient = `${clean(r.first_name)} ${clean(r.last_name)}`;
  const doctor = `Dr. ${clean(r.doctor_name)} ${clean(r.doctor_last_name)}`;
  const inner =
    intro(`New referral from <strong>${escapeHtml(doctor)}</strong> (${escapeHtml(clean(r.office_name))}) for <strong>${escapeHtml(patient)}</strong>.<br><span style="font-size:13px;color:#777;">Received ${escapeHtml(submittedAt())} (Eastern time). Reply to this email to answer the referring dentist.</span>`) +
    badges(r) +
    renderSections(r);
  return {
    subject: `${isEmergency(r) ? 'URGENT - ' : ''}New referral: ${patient} (${clean(r.referred_for)})`,
    html: layout('New referral received', inner),
  };
}

export function doctorEmail(r: Referral): BuiltEmail {
  const patient = `${clean(r.first_name)} ${clean(r.last_name)}`;
  const next = [
    'Our team reviews the referral and your notes.',
    `We contact ${escapeHtml(clean(r.first_name))} at ${escapeHtml(clean(r.cell_phone))} to schedule the appointment.`,
    'After the consultation we send you a written report with our findings and recommendations.',
  ]
    .map((step, i) => `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;"><strong style="color:${BRAND};">${i + 1}.</strong> ${step}</td></tr>`)
    .join('');
  const urgent = isEmergency(r)
    ? `<tr><td style="padding:14px 0 0;font-size:15px;color:#C0392B;"><strong>This referral is marked as an emergency.</strong> If it cannot wait, please also call us at ${PHONE}.</td></tr>`
    : '';
  const inner =
    intro(`Thank you for referring <strong>${escapeHtml(patient)}</strong> to 562 endodontics. We have received your referral. A copy is included below for your records.`) +
    urgent +
    `<tr><td style="padding:18px 0 4px;"><div style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${BRAND};border-bottom:2px solid ${BEIGE};padding-bottom:6px;">What happens next</div></td></tr>` +
    next +
    badges(r) +
    renderSections(r) +
    `<tr><td style="padding:20px 0 0;font-size:14px;color:#777;">Questions or changes? Reply to this email or call us at ${PHONE}.</td></tr>`;
  return { subject: `Referral received: ${patient} | 562 endodontics`, html: layout('We received your referral', inner) };
}

// Mensaje al paciente: solo datos de contacto de la clínica. NUNCA lleva datos clínicos, de seguro ni
// quién es el doctor más allá del apellido.
export function patientEmail(r: Referral): BuiltEmail {
  const urgent = isEmergency(r)
    ? `<tr><td style="padding:14px 0 0;font-size:15px;line-height:1.5;color:#C0392B;"><strong>If you have severe pain or swelling, please call us right away at ${PHONE}.</strong></td></tr>`
    : '';
  const inner =
    intro(`Hello ${escapeHtml(clean(r.first_name))},<br><br>Dr. ${escapeHtml(clean(r.doctor_last_name))} has referred you to 562 endodontics, a practice dedicated to root canal treatment and other endodontic care. Our team will contact you at <strong>${escapeHtml(clean(r.cell_phone))}</strong> to schedule your appointment.`) +
    urgent +
    `<tr><td style="padding:18px 0 4px;"><div style="font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${BRAND};border-bottom:2px solid ${BEIGE};padding-bottom:6px;">How to find us</div></td></tr>` +
    `<tr><td style="padding:6px 0;font-size:15px;line-height:1.6;">${escapeHtml(ADDRESS)}<br>Patient parking is behind the building, marked &ldquo;DENTAL&rdquo;.<br>Hours: ${escapeHtml(hours.weekday)}<br>Phone: ${PHONE}</td></tr>` +
    `<tr><td style="padding:18px 0 0;font-size:13px;color:#777;">If you were not expecting this message, please let us know by replying to this email.</td></tr>`;
  return { subject: 'Your referral to 562 endodontics', html: layout('Your referral to 562 endodontics', inner) };
}

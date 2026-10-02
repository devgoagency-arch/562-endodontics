import type { APIRoute } from 'astro';
import { hours, businessSchema } from '../data/business';
import { doctors } from '../data/doctors';

// /llms.txt: resumen en Markdown del sitio para asistentes de IA (propuesta
// llmstxt.org). Se genera a partir de los mismos datos que usan el JSON-LD y
// el resto del sitio, para no duplicar horario, teléfono ni doctores.
export const prerender = true;

const treatments = [
  ['Root Canal Treatment', '/endodontic-treatments/root-canal/', 'Microscope-guided root canal treatment with in-house CBCT imaging.'],
  ['Endodontic Retreatment', '/endodontic-treatments/endodontic-retreatment/', 'Care for failed or symptomatic root canals, including why treatment fails and when to refer.'],
  ['Apical Surgery', '/endodontic-treatments/apical-surgery/', 'Microscope-guided root-end surgery when retreatment is not enough, with referral criteria and prognosis.'],
  ['Cracked Teeth', '/endodontic-treatments/cracked-teeth/', 'Diagnosis and management of cracked and split teeth.'],
  ['Dental Trauma', '/endodontic-treatments/dental-trauma/', 'Same-day care for fractures, luxation and avulsion injuries.'],
];

const pages = [
  ['About Us', '/about-us/', 'The endodontists and their training.'],
  ['Our Dental Clinic', '/our-clinic/', 'The clinic building, services and parking.'],
  ['High Tech Facility', '/high-tech-facility/', 'Operating microscope, CBCT, GentleWave, Fotona laser and QuickSleeper anesthesia.'],
  ['Referrals', '/referrals/', 'How dentists refer a patient: online form or printable form.'],
  ['Professional Development', '/professional-development/', 'Clinical shadowing for students, dental staff and dentists.'],
  ['Contact Us', '/contact-us/', 'Address, phone, hours and contact form.'],
  ['Privacy Policy', '/privacy-policy/', 'How the clinic handles personal information.'],
];

export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const link = ([title, path, text]: string[]) => `- [${title}](${url(path)}): ${text}`;
  const a = businessSchema.address;

  const body = `# 562 endodontics

> Endodontic specialists in London, Ontario, dedicated exclusively to root canal treatment, retreatment, apical surgery, cracked teeth and dental trauma. Dentists refer patients to the clinic, and patients can also seek care directly.

- Address: ${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}, Canada (patient parking behind the building, marked "DENTAL")
- Phone: (519) 601-3636
- Email: ${businessSchema.email}
- Hours: ${hours.weekday}; ${hours.wednesday}
- Area served: ${businessSchema.areaServed.join('; ')}

## Endodontic treatments

${treatments.map(link).join('\n')}

## Clinic and team

${pages.map(link).join('\n')}

## Doctors

${doctors.map((d) => `- ${d.name.includes(d.credentials) ? d.name : `${d.name}, ${d.credentials}`}`).join('\n')}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

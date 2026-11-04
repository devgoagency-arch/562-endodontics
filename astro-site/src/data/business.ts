// Datos del negocio: fuente única para teléfono, correo, horario y dirección (Header, Footer,
// Contact Us, home, correos del referral, llms.txt, etc. lo importan de aquí) y para el JSON-LD que
// usa Google para mostrar la clínica en el mapa y en resultados enriquecidos. Los valores salen de
// src/data/site-settings.json, que scripts/sync-settings.mjs rellena desde el WordPress de la clínica
// al construir el sitio (si WP_API_URL no está definida se queda el snapshot que ya hay en el repo).
import { doctors } from './doctors';
import settings from './site-settings.json';

const ROAD_TYPES: Record<string, string> = {
  street: 'St', avenue: 'Ave', road: 'Rd', boulevard: 'Blvd', drive: 'Dr', lane: 'Ln', court: 'Ct', crescent: 'Cres', place: 'Pl',
};
const PROVINCES: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island',
  QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
};

// "562 Waterloo Street" -> "562 Waterloo St" (o "st" si lower es true).
function abbreviateStreet(street: string, lower = false): string {
  return street.replace(/\s(\w+)$/, (match, word: string) => {
    const abbr = ROAD_TYPES[word.toLowerCase()];
    if (!abbr) return match;
    return ` ${lower ? abbr.toLowerCase() : abbr}`;
  });
}

const digits = settings.phone.replace(/\D/g, '').slice(-10);
const [area, exchange, line] = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)];

export const phone: string = settings.phone;
export const phoneHref = `tel:+1${digits}`;
// "(519) 601-ENDO (3636)": solo aplica mientras el número termine en 3636 (ENDO); si cambia, se usa el número normal.
export const phoneVanity: string = line === '3636' ? `(${area}) ${exchange}-ENDO (${line})` : settings.phone;
export const phoneVanityWide: string = line === '3636' ? `(${area}) ${exchange} - ENDO (${line})` : settings.phone;
export const email: string = settings.email;
export const emailHref = `mailto:${settings.email}`;

export const hours = {
  weekday: settings.hours,
};

const provinceName = PROVINCES[settings.province.toUpperCase()] ?? settings.province;
const mapsQuery = `${abbreviateStreet(settings.street).replace(/ /g, '+')},+${settings.city.replace(/ /g, '+')},+${settings.province}+${settings.postal.replace(/ /g, '+')}`;

export const address = {
  street: settings.street,
  city: settings.city,
  province: settings.province,
  postal: settings.postal,
  // Formas usadas en el sitio: "562 Waterloo st, London, ON, N6B 2P9" (cabecera, pie, contacto, home).
  oneLine: `${abbreviateStreet(settings.street, true)}, ${settings.city}, ${settings.province}, ${settings.postal}`,
  streetShort: abbreviateStreet(settings.street),
  provinceName,
  cityProvince: `${settings.city}, ${provinceName}`,
  fullAddress: `${settings.street}, ${settings.city}, ${provinceName} ${settings.postal}`,
  mapsUrl: `https://www.google.com/maps/place/${mapsQuery}`,
  mapsEmbedUrl: `https://www.google.com/maps?q=${mapsQuery}&output=embed`,
};

export const businessSchema = {
  '@context': 'https://schema.org',
  '@type': ['Dentist', 'MedicalBusiness'],
  '@id': 'https://562endodontics.com/#clinic',
  name: '562 endodontics',
  description:
    'Endodontic specialists in London, Ontario, dedicated exclusively to root canal treatment, retreatment, apical surgery, cracked teeth and dental trauma.',
  url: 'https://562endodontics.com/',
  logo: 'https://562endodontics.com/logo/logo-black.webp',
  image: 'https://562endodontics.com/og-image.jpg',
  telephone: `+1-${area}-${exchange}-${line}`,
  email: settings.email,
  // "Dentistry" es el único valor de MedicalSpecialty de schema.org que aplica
  // aquí ("Endodontic" no es un valor válido de la enumeración).
  medicalSpecialty: 'Dentistry',
  // Enlaza cada doctor (schema.org Person, ver about-us.astro) de vuelta a la
  // clínica, para que la relación quede en los dos sentidos.
  employee: doctors.map((doc) => ({ '@id': `https://562endodontics.com/about-us/#${doc.id}` })),
  address: {
    '@type': 'PostalAddress',
    streetAddress: address.streetShort,
    addressLocality: settings.city,
    addressRegion: settings.province,
    postalCode: settings.postal,
    addressCountry: 'CA',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 42.9903484, longitude: -81.2444725 },
  hasMap: address.mapsUrl,
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: settings.opens, closes: settings.closes },
  ],
  areaServed: ['London, Ontario', 'Middlesex County, Ontario'],
  sameAs: [
    'https://maps.app.goo.gl/xLKyStzwr9GVsnHC9',
    'https://www.instagram.com/562endodontics/',
    'https://www.linkedin.com/in/jacqueline-lopez-gross-dds-msc-frcd-c-2041102/',
  ],
};

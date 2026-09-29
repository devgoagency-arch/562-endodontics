// Datos del negocio: fuente única para el horario (Header, Footer, Contact Us y
// el bloque de contacto del home lo importan de aquí) y para el JSON-LD que usa
// Google para mostrar la clínica en el mapa y en resultados enriquecidos. Si
// cambia el horario, el teléfono o la dirección, se actualiza solo aquí.
import { doctors } from './doctors';

export const hours = {
  weekday: 'Mon, Tue, Thu & Fri 8:30am–5pm',
  wednesday: 'Wed 8:30am–4pm',
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
  telephone: '+1-519-601-3636',
  email: 'info@562endodontics.com',
  // "Dentistry" es el único valor de MedicalSpecialty de schema.org que aplica
  // aquí ("Endodontic" no es un valor válido de la enumeración).
  medicalSpecialty: 'Dentistry',
  // Enlaza cada doctor (schema.org Person, ver about-us.astro) de vuelta a la
  // clínica, para que la relación quede en los dos sentidos.
  employee: doctors.map((doc) => ({ '@id': `https://562endodontics.com/about-us/#${doc.id}` })),
  address: {
    '@type': 'PostalAddress',
    streetAddress: '562 Waterloo St',
    addressLocality: 'London',
    addressRegion: 'ON',
    postalCode: 'N6B 2P9',
    addressCountry: 'CA',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 42.9903484, longitude: -81.2444725 },
  hasMap: 'https://www.google.com/maps/place/562+Waterloo+St,+London,+ON+N6B+2P9',
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Thursday', 'Friday'], opens: '08:30', closes: '17:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Wednesday', opens: '08:30', closes: '16:00' },
  ],
  areaServed: ['London, Ontario', 'Middlesex County, Ontario'],
  sameAs: [
    'https://www.instagram.com/562endodontics/',
    'https://www.linkedin.com/in/jacqueline-lopez-gross-dds-msc-frcd-c-2041102/',
  ],
};

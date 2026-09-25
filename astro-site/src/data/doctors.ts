// Datos de los doctores (fuente única para About Us y futuras páginas).
// Nota: los nombres difieren entre About y Referrals en el sitio original
// ("R. Greg Carr" vs "R. Gregory Carr", "Ines" vs "Inés"); aquí se usa la
// versión de About Us hasta que el cliente confirme la oficial.
export interface Doctor {
  name: string;
  photo: string;
  bio: string[];
}

export const doctors: Doctor[] = [
  {
    name: 'Dr. Jacqueline Lopez Gross',
    photo: '/images/about/jacqueline.jpg',
    bio: [
      "Born in Caracas Venezuela. She received her Master's of Science degree in Endodontics from the University of Toronto in 2018 and is a Fellow of the Royal College of Dentists of Canada.",
      'Prior to her specialty training she completed an Advanced Program in Endodontics at New York University in 2012.',
      'She received the award for "Best Oral Research Presentation" at the American Association of Endodontics Annual meeting in 2018 and received a Research Award from the International College of Prosthodontics and IFEA in 2019. She is now dedicated to private practice and to supporting the community as a teacher and a volunteer. Currently she is a lecturer in the Graduate Endodontic Program at University of Toronto, an Adjunct Clinical Professor at the University of Western Ontario and a volunteer specialist at The Wright Clinic.',
    ],
  },
  {
    name: 'Dr. Ines Marín Betancourt',
    photo: '/images/about/ines.jpg',
    bio: [
      'Earned her DDS in Venezuela and completed specialty training in Endodontics in Colombia. In 2024, she was selected for the prestigious Dental Specialty Assessment and Training Program (DSATP) at the University of Toronto, which accepts only one internationally trained specialist each year. She is now a Board Certified Endodontist and Fellow of the Royal College of Dentists of Canada.',
      'She has taught Endodontics in Venezuela and Canada and served as an Adjunct Clinical Professor at the Schulich School of Medicine & Dentistry, Western University. Known for her expertise and approachable style, she is committed to advancing the field and delivering the highest standard of patient care.',
    ],
  },
  {
    name: 'Dr. Manfred Friedman',
    photo: '/images/about/manfred.jpg',
    bio: [
      "Graduated in South Africa in 1971 and emigrated to Canada 35 years ago. He taught the undergrad endodontic course at Schulich School of Medicine and Dentistry at Western University from 1995 to 2021. He has restricted his practice to Endodontics since 1997. He was recently awarded with the 'CY Lung award' for his outstanding contribution to the undergraduate program at Western University.",
      'Manny is currently one of the lead speakers in endodontics and restorative for the dental community in Canada.',
      'Dr. Friedman is an active member of the American Association of Endodontics, Ontario Dental Association, Canada Dental Association, International Association of Dental Traumatology and American College of Dentists.',
    ],
  },
  {
    name: 'Dr. R. Greg Carr, DDS',
    photo: '/images/about/greg-carr.jpg',
    bio: [
      'Dr. R. Greg Carr earned his dental degree from the University of Western Ontario in 1983. In 2005, he completed a Post-Doctoral Scholars Program in Graduate Endodontics at the University of Michigan, further enhancing his expertise in the field. Dr. Carr also holds an Intravenous Sedation Certification from the Medical College of Georgia.',
      'With a strong commitment to education, Dr. Carr served for several years as an adjunct clinical professor in the Division of Operative Dentistry and Endodontics at the University of Western Ontario, School of Dentistry. He continues to be an adjunct clinical lecturer in the Department of Cariology, Restorative Sciences, and Endodontics at the University of Michigan School of Dentistry.',
      'Dr. Carr successfully operated his own private endodontic practice in London, Ontario, for 25 years. In 2025, he joined the team at 562 Endodontics, where he continues to provide exceptional endodontic care while sharing his extensive knowledge and experience with both patients and colleagues.',
    ],
  },
];

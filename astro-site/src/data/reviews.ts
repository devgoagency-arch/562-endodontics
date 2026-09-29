// Reviews de Google mostrados en la home. Se mantienen A MANO: una vez al mes (con
// el despliegue mensual) se revisa la ficha de Google y se actualiza este archivo.
//
// Cómo actualizar:
//  1. Abrir la ficha (GOOGLE_REVIEWS_URL), copiar la nota y el total de opiniones a
//     `summary`.
//  2. Agregar los reviews nuevos AL PRINCIPIO de `reviews` (más recientes primero),
//     con el texto original completo (si Google lo muestra "Traducido", usar el
//     original, no la traducción). `date` = mes aproximado en formato AAAA-MM.
//     `avatar`: foto de perfil descargada a public/images/testimonials/ (96px,
//     WebP). Si el reviewer solo tiene la letra por defecto de Google, no se usa
//     avatar y la tarjeta muestra la inicial con los colores del sitio.
//  3. Se muestran los primeros SHOW_COUNT; el resto queda a un clic en Google.
//  4. Actualizar `updated` y desplegar.
export const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/place/562+endodontics/@42.9903523,-81.2470474,17z/data=!4m8!3m7!1s0x2524958feb895251:0xe2b837b72752dba0!8m2!3d42.9903484!4d-81.2444725!9m1!1b1!16s%2Fg%2F11kj05rchr';

export const summary = { rating: 4.9, count: 208, updated: '2026-09' };
export const SHOW_COUNT = 6;

export interface Review {
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date?: string; // AAAA-MM (aproximado)
  text: string;
  avatar?: string;
  url?: string;
}

export const reviews: Review[] = [
  {
    author: 'Moira Trickey',
    rating: 5,
    date: '2026-08',
    text: 'I recently visited 562 endodontics with an emergency situation. I was welcomed so well into the clinic. I was taken care of immediately and I am so happy with the results. Dr Lopez and her team are so friendly and made me feel very comfortable and confident about the process. I would recommend to go here for their outstanding service.',
  },
  {
    author: 'Michaela Cholier',
    rating: 5,
    date: '2026-08',
    text: 'Dr Jackie Lopez is not just a Doctor....Her, Lu and her staff are your friends. Friends that are there for you when needed. They are so welcoming, kind and amiable. I have very high anxiety for dentists and I am claustrophobic. From the 3 D xray to the end of my root canal Dr Lopez and Lu were very understanding, patient and supportive. A few good laughs in between showed that they are human, not just "working robots", lol. It was the best dental experience I\'ve had for many years. They are the best!! Thank you so very much.',
  },
  {
    author: 'Tia Fraser',
    rating: 5,
    date: '2026-07',
    avatar: '/images/testimonials/tia-fraser.webp',
    text: 'I had a great experience at this endodontic clinic for my root canal. The team was welcoming, professional, and kind, and they made me feel comfortable throughout the procedure. The root canal went smoothly, recovery was easy, and I had no complications at all. I would highly recommend this clinic to anyone needing endodontic treatment.',
  },
  {
    author: 'Steve Delguidice',
    rating: 5,
    date: '2026-02',
    avatar: '/images/testimonials/steve-delguidice.webp',
    text: 'My experience at 562 endodontics was very professional from the consultation to the expert work performed by Doctor Car and assistant Lisa. Very thorough and comforting and educational. It was a Top Gun performance and I am very impressed with the equipment used, even a laser was used to thoroughly complete my root canal surgery. This is very professional and impressive service and I experienced no discomfort during or after but was well prepared for some and not a thing. There is no doubt that doctor Car is a expert and i can not speak highly enough of the treatment provided. Very impressed and highly recommend this place if your in need of a root canal.',
  },
  {
    author: 'Jodi Hall',
    rating: 5,
    avatar: '/images/testimonials/jodi-hall.webp',
    url: 'https://maps.app.goo.gl/nEGgn4WY9JRtnSSHA',
    text: "I recently had a root canal at 562 endodontics, and I honestly can't say enough to sing their praises. From the professionalism and warmth of the office staff and dental hygienists, to the care provided by Dr. Lopez Gross, I was so pleased with my experience.",
  },
  {
    author: 'Rob Ure',
    rating: 5,
    avatar: '/images/testimonials/rob-ure.webp',
    url: 'https://maps.app.goo.gl/VPPtbJ3qocV2gxji9',
    text: 'Dr. Carr was fantastic - the staff were phenomenal - nervous as I was, I was put at ease from the moment I walked in. Highly recommend these fantastic people.',
  },
  {
    author: 'Louise Simler',
    rating: 5,
    avatar: '/images/testimonials/louise-simler.webp',
    url: 'https://maps.app.goo.gl/qtimFzSkS2DRuaJy5',
    text: "My experience here was amazing. I was a total wreck going in. I'm not a fan of the dentist, but the people here were amazing. They made me feel so at ease.",
  },
  {
    author: 'Ryan Allison',
    rating: 5,
    avatar: '/images/testimonials/ryan-allison.webp',
    url: 'https://maps.app.goo.gl/S6HN51FdyaE9Bcs46',
    text: 'Having a Root Canal is an unpleasant experience, but the warmth and care from everyone in this clinic made this a very positive experience. Excellent bedside manner from everyone at this professional and well-equipped clinic.',
  },
  {
    author: 'Kathleen Gunther',
    rating: 5,
    avatar: '/images/testimonials/kathleen-gunther.webp',
    url: 'https://maps.app.goo.gl/tKtKxkZ7S1WMgo1r9',
    text: 'What a great team! Sam at the front desk is excellence in customer service personified; Lisa, who did my xrays and assisted the doctor, was so attentive; and Dr. Lopez was friendly and professional.',
  },
];

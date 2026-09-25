/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta extraída del sitio actual (WordPress/Elementor) para
        // mantener continuidad de marca durante la migración.
        brand: {
          rust: '#B13E25',   // acentos, botones primarios, links
          rustDark: '#8f3019',
          tan: '#C7B4A1',    // botones secundarios
          ink: '#484B54',    // texto de cuerpo
          beige: '#E3DBD4',  // fondos de sección alternados
        },
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

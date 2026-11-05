import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// output: 'static' + adaptador -> las páginas son estáticas por defecto (rápidas,
// cacheadas en el edge de Vercel) y cualquier página o endpoint puede optar por
// renderizarse on-demand (export const prerender = false), como /api/contact.
export default defineConfig({
  // Dominio de producción: lo usan el sitemap, las URLs canónicas y las etiquetas Open Graph.
  site: 'https://562endodontics.com',
  output: 'static',
  // Astro 7 cambió el valor por defecto a 'jsx' (reglas de espacios de React), que pega palabras
  // separadas por saltos de línea junto a enlaces/negritas. true = comportamiento de Astro 5.
  compressHTML: true,
  // El CSS (Tailwind + fuentes, ~11 KB) va dentro del HTML en vez de en un archivo aparte: así no bloquea el
  // primer pintado con una petición extra y las fuentes se descubren antes.
  build: { inlineStylesheets: 'always' },
  // Dominios desde los que se sirve el sitio. Astro 5 solo confía en el nombre del sitio que manda
  // Vercel (x-forwarded-host) si está en esta lista; sin ella toma "localhost" y su protección contra
  // envíos de otros sitios (checkOrigin) rechaza con 403 TODOS los formularios (/api/contact y
  // /api/referral). Cualquier dominio nuevo donde se publique el sitio debe agregarse aquí.
  security: {
    allowedDomains: [
      { hostname: '562endodontics.com', protocol: 'https' },
      { hostname: 'www.562endodontics.com', protocol: 'https' },
      { hostname: '**.vercel.app', protocol: 'https' },
    ],
  },
  // URLs del WordPress actual cuyo slug cambió en el sitio nuevo (301 = permanente,
  // conserva el posicionamiento). El resto de slugs coincide con los originales.
  redirects: {
    '/high-tech-facility-2-2/': { status: 301, destination: '/about-us/' },
    '/high-tech-facility-2/': { status: 301, destination: '/our-clinic/' },
    // Páginas técnicas/de prueba del WordPress viejo que Google tiene indexadas (plantillas de Elementor,
    // pie de página y la entrada "Hello world"): no existen en el sitio nuevo, van a la portada.
    '/footer-562/': { status: 301, destination: '/' },
    '/hello-world/': { status: 301, destination: '/' },
    '/elementor-hf/home/': { status: 301, destination: '/' },
    '/elementor-hf/home-2/': { status: 301, destination: '/' },
    '/elementor-hf/our-dental-clinic-2/': { status: 301, destination: '/' },
  },
  adapter: vercel({
    webAnalytics: { enabled: true },
    // /api/referral baja los archivos del Blob y los adjunta al correo: con 10 archivos de 10 MB necesita más
    // que los 10 s por defecto.
    maxDuration: 60,
  }),
  integrations: [sitemap({ filter: (page) => !/\/(404|500)\/?$/.test(page) })],
  vite: {
    plugins: [tailwindcss()],
  },
});

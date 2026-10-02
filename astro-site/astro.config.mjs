import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// output: 'static' + adaptador -> las páginas son estáticas por defecto (rápidas,
// cacheadas en el edge de Vercel) y cualquier página o endpoint puede optar por
// renderizarse on-demand (export const prerender = false), como /api/contact.
export default defineConfig({
  // Dominio de producción: lo usan el sitemap, las URLs canónicas y las etiquetas Open Graph.
  site: 'https://562endodontics.com',
  output: 'static',
  // URLs del WordPress actual cuyo slug cambió en el sitio nuevo (301 = permanente,
  // conserva el posicionamiento). El resto de slugs coincide con los originales.
  redirects: {
    '/high-tech-facility-2-2': { status: 301, destination: '/about-us/' },
    '/high-tech-facility-2-2/': { status: 301, destination: '/about-us/' },
    '/high-tech-facility-2': { status: 301, destination: '/our-clinic/' },
    '/high-tech-facility-2/': { status: 301, destination: '/our-clinic/' },
  },
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [tailwind(), sitemap({ filter: (page) => !/\/(404|500)\/?$/.test(page) })],
});

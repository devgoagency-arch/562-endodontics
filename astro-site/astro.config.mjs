import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';

// output: 'hybrid' -> las páginas son estáticas por defecto (rápidas, cacheadas
// en el edge de Vercel) pero cualquier página puede optar por renderizarse
// on-demand (export const prerender = false) si necesitas datos siempre frescos
// sin esperar al webhook de rebuild.
export default defineConfig({
  output: 'hybrid',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [tailwind()],
});

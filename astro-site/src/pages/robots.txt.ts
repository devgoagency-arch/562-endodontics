import type { APIRoute } from 'astro';

// Endpoint en vez de archivo estático para poder bloquear TODO en los borradores
// (previews de rama, local) y no solo con <meta noindex> — mismo criterio que
// BaseLayout.astro. VERCEL_ENV solo es "production" en el dominio de producción.
export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const isProductionDeploy = import.meta.env.VERCEL_ENV === 'production';
  const body = isProductionDeploy
    ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

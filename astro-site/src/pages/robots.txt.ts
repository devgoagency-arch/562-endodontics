import type { APIRoute } from 'astro';

// Endpoint en vez de archivo estático para poder bloquear TODO en los borradores
// (previews de rama, local) y no solo con <meta noindex> — mismo criterio que
// BaseLayout.astro. VERCEL_ENV solo es "production" en el dominio de producción.
export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const isProductionDeploy = import.meta.env.VERCEL_ENV === 'production';
  // En producción se permite explícitamente a los rastreadores de asistentes de IA (GEO: que puedan leer el
  // sitio y citarlo). Cada grupo repite Disallow: /api/ porque un grupo específico ignora el grupo "*".
  const aiCrawlers = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended']
    .map((bot) => `User-agent: ${bot}\nAllow: /\nDisallow: /api/\n`)
    .join('\n');
  const body = isProductionDeploy
    ? `User-agent: *\nAllow: /\nDisallow: /api/\n\n${aiCrawlers}\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

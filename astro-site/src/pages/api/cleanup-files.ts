import type { APIRoute } from 'astro';
import { del, list } from '@vercel/blob';
import { selectExpired } from '../../lib/referralFiles';

// Tarea programada (vercel.json, cada domingo): borra los archivos de referrals con más de 12 meses.
// Vercel la llama con "Authorization: Bearer <CRON_SECRET>"; sin ese secreto configurado no hace nada.
// Prueba sin borrar: /api/cleanup-files?dryRun=1 (con el mismo encabezado).
export const prerender = false;

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ request, url }) => {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) return json({ error: 'CRON_SECRET is not configured' }, 500);
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);

  const dryRun = url.searchParams.get('dryRun') === '1';
  const expired: string[] = [];
  let total = 0;
  let cursor: string | undefined;
  try {
    do {
      const page = await list({ prefix: 'referrals/', cursor, limit: 1000 });
      total += page.blobs.length;
      expired.push(...selectExpired(page.blobs));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    if (!dryRun) {
      for (let i = 0; i < expired.length; i += 100) await del(expired.slice(i, i + 100));
    }
  } catch (error) {
    console.error('Cleanup of referral files failed', error);
    return json({ error: 'Cleanup failed' }, 500);
  }
  return json({ dryRun, total, deleted: dryRun ? 0 : expired.length, wouldDelete: dryRun ? expired.length : undefined }, 200);
};

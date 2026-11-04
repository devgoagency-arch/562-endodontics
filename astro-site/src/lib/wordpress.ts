// Comunicación del sitio con el WordPress de la clínica (plugins 562-subscribers.php y 562-referrals.php en
// wp-content/mu-plugins). Se autentica con un secreto compartido: WP_API_SECRET aquí y ENDO562_API_SECRET en
// wp-config.php deben ser el mismo texto.
const WP_URL = String(import.meta.env.WP_API_URL ?? '').trim().replace(/\/+$/, '');
const SECRET = import.meta.env.WP_API_SECRET;

export const wordpressConfigured = Boolean(WP_URL && SECRET);

export async function postToWordPress(route: string, body: unknown): Promise<void> {
  if (!wordpressConfigured) throw new Error('WordPress is not configured (WP_API_URL, WP_API_SECRET)');
  const response = await fetch(`${WP_URL}/wp-json/endo562/v1/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Endo562-Secret': SECRET },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`WordPress ${route} request failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
}

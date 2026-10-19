// Envío de correo con Microsoft Graph, desde el Microsoft 365 de la clínica (el mismo
// buzón info@ que usa hoy el WordPress con WP Mail SMTP). Los datos de los formularios
// salen del propio tenant de la clínica, sin pasar por un servicio de correo de terceros.
//
// Requiere una aplicación de Azure (registro de aplicación) con el permiso de aplicación
// Mail.Send y consentimiento del administrador; ver .env.example para las variables.
// Conviene limitarla a un solo buzón con una política de acceso de Exchange.
const TENANT_ID = import.meta.env.AZURE_TENANT_ID;
const CLIENT_ID = import.meta.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.AZURE_CLIENT_SECRET;

export const MAIL_FROM: string = import.meta.env.MAIL_FROM || 'info@562endodontics.com';

export class MailNotConfiguredError extends Error {
  constructor() {
    super('Microsoft 365 mail is not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
  }
}

export const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Los asuntos llevan texto escrito por el visitante: sin saltos de línea.
export const cleanSubject = (value: string) => value.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);

export const isEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) throw new MailNotConfiguredError();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) throw new Error(`Microsoft token request failed (${response.status}): ${await response.text()}`);

  const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}

interface Mail {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

// Envía como MAIL_FROM y lo guarda en Enviados. Graph responde 202 cuando acepta el mensaje.
export async function sendMail({ to, subject, html, replyTo }: Mail): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_FROM)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: cleanSubject(subject),
        body: { contentType: 'HTML', content: html },
        toRecipients: to.map((address) => ({ emailAddress: { address } })),
        ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
      },
      saveToSentItems: true,
    }),
  });
  if (!response.ok) throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${await response.text()}`);
}

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
  attachments?: MailAttachment[]; // solo en sendMail, y hasta INLINE_ATTACHMENTS_MAX en total
}

// sendMail acepta ~4 MB por petición y los adjuntos viajan en base64 (+33 %): hasta 2.8 MB de archivos
// en total caben sin permisos extra. Más que eso necesita sendMailWithAttachments.
export const INLINE_ATTACHMENTS_MAX = 2.8 * 1024 * 1024;

// Envía como MAIL_FROM y lo guarda en Enviados. Graph responde 202 cuando acepta el mensaje.
export async function sendMail({ to, subject, html, replyTo, attachments = [] }: Mail): Promise<void> {
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
        ...(attachments.length > 0
          ? {
              attachments: attachments.map((file) => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: file.name,
                contentType: file.contentType,
                contentBytes: Buffer.from(file.data).toString('base64'),
              })),
            }
          : {}),
      },
      saveToSentItems: true,
    }),
  });
  if (!response.ok) throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${await response.text()}`);
}

export interface MailAttachment {
  name: string;
  contentType: string;
  data: Uint8Array;
}

// El último paso (enviar el borrador) falló: no se debe reintentar por otra vía, el mensaje pudo salir.
export class MailSendError extends Error {}

const GRAPH = 'https://graph.microsoft.com/v1.0';
const INLINE_ATTACHMENT_MAX = 3 * 1024 * 1024; // hasta 3 MB va en una sola petición
const UPLOAD_CHUNK = 12 * 320 * 1024; // las sesiones de carga piden múltiplos de 320 KiB (máx. 4 MB)

// Envía el correo con archivos adjuntos de cualquier tamaño: crea un borrador, le sube los adjuntos
// (los grandes por sesión de carga) y lo envía. sendMail directo solo admite ~4 MB en total.
// Requiere además el permiso de aplicación Mail.ReadWrite (sin él Graph responde 403 al crear el borrador).
export async function sendMailWithAttachments({ to, subject, html, replyTo }: Mail, attachments: MailAttachment[]): Promise<void> {
  const token = await getAccessToken();
  const auth = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...auth, 'Content-Type': 'application/json' };
  const call = async (url: string, init: RequestInit, label: string) => {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`Microsoft Graph ${label} failed (${response.status}): ${await response.text()}`);
    return response;
  };

  const user = `${GRAPH}/users/${encodeURIComponent(MAIL_FROM)}`;
  const draft = (await (
    await call(
      `${user}/messages`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          subject: cleanSubject(subject),
          body: { contentType: 'HTML', content: html },
          toRecipients: to.map((address) => ({ emailAddress: { address } })),
          ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
        }),
      },
      'create draft'
    )
  ).json()) as { id: string };
  const messageUrl = `${user}/messages/${encodeURIComponent(draft.id)}`;

  try {
    for (const file of attachments) {
      const size = file.data.byteLength;
      if (size <= INLINE_ATTACHMENT_MAX) {
        await call(
          `${messageUrl}/attachments`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: file.name,
              contentType: file.contentType,
              contentBytes: Buffer.from(file.data).toString('base64'),
            }),
          },
          'add attachment'
        );
        continue;
      }
      const session = (await (
        await call(
          `${messageUrl}/attachments/createUploadSession`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: file.name, size, contentType: file.contentType } }),
          },
          'create upload session'
        )
      ).json()) as { uploadUrl: string };
      for (let start = 0; start < size; start += UPLOAD_CHUNK) {
        const end = Math.min(start + UPLOAD_CHUNK, size);
        // La URL de la sesión ya trae su propia autorización: no lleva el encabezado Authorization.
        await call(
          session.uploadUrl,
          { method: 'PUT', headers: { 'Content-Range': `bytes ${start}-${end - 1}/${size}` }, body: file.data.subarray(start, end) },
          'upload attachment chunk'
        );
      }
    }
  } catch (error) {
    await fetch(messageUrl, { method: 'DELETE', headers: auth }).catch(() => {});
    throw error;
  }

  try {
    await call(`${messageUrl}/send`, { method: 'POST', headers: auth }, 'send draft');
  } catch (error) {
    throw new MailSendError((error as Error).message);
  }
}

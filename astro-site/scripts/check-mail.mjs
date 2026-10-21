// Prueba la conexión con Microsoft 365 (la misma que usa el sitio para enviar los formularios)
// y dice exactamente qué rechaza Microsoft. NUNCA imprime secretos ni el token.
//
// Uso (desde la carpeta astro-site, con las variables AZURE_* en el archivo .env local):
//   node --env-file=.env scripts/check-mail.mjs           # comprueba el token y los permisos
//   node --env-file=.env scripts/check-mail.mjs --send    # además envía UN correo de prueba a MAIL_FROM
const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
const MAIL_FROM = process.env.MAIL_FROM || 'info@562endodontics.com';
const send = process.argv.includes('--send');

async function main() {
  const ok = (m) => console.log('  ✔', m);
  const bad = (m) => console.log('  ✘', m);

  console.log('1) Variables');
  for (const [name, value] of Object.entries({ AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET })) {
    value ? ok(`${name} presente (${name === 'AZURE_CLIENT_SECRET' ? `${value.length} caracteres` : value})`) : bad(`${name} NO está definida`);
  }
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) { process.exitCode = 1; return; };
  if (/\s/.test(AZURE_CLIENT_SECRET) || /\s/.test(AZURE_CLIENT_ID) || /\s/.test(AZURE_TENANT_ID)) bad('Hay espacios o saltos de línea dentro de algún valor: vuelve a copiarlo sin espacios');

  console.log('\n2) Token de Microsoft');
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    bad(`Microsoft rechazó el token (HTTP ${tokenResponse.status})`);
    console.log('    Código:', tokenBody.error);
    console.log('    Detalle:', String(tokenBody.error_description || '').split('\r\n')[0]);
    const hint = {
      AADSTS7000215: 'El secreto es incorrecto (mal copiado, incompleto o es el "Secret ID" en vez del "Value").',
      AADSTS7000222: 'El secreto está vencido.',
      AADSTS700016: 'El Client ID no existe en este tenant (Client ID o Tenant ID incorrecto).',
      AADSTS90002: 'El Tenant ID es incorrecto.',
    };
    const code = Object.keys(hint).find((c) => String(tokenBody.error_description || '').includes(c));
    if (code) console.log('    →', hint[code]);
    { process.exitCode = 1; return; };
  }
  ok('Token obtenido: el Tenant ID, el Client ID y el secreto son correctos');

  console.log('\n3) Permisos que trae el token');
  const payload = JSON.parse(Buffer.from(tokenBody.access_token.split('.')[1], 'base64url').toString());
  const roles = payload.roles || [];
  console.log('    Permisos de aplicación (roles):', roles.length ? roles.join(', ') : '(NINGUNO)');
  if (roles.includes('Mail.Send')) ok('Tiene el permiso Mail.Send de tipo Application');
  else bad('NO tiene Mail.Send de tipo Application. Si IT lo dio como "Delegated", o no concedió el consentimiento de administrador, el sitio no puede enviar. (Si lo limitaron con RBAC de Exchange, este campo sale vacío y es normal: pruebe con --send.)');

  if (!send) {
    console.log('\nPara probar el envío real a', MAIL_FROM, 'ejecuta de nuevo con --send');
    return;
  }

  console.log(`\n4) Envío de prueba a ${MAIL_FROM}`);
  const mailResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_FROM)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: 'Prueba tecnica del sitio nuevo (puede ignorarse)',
        body: { contentType: 'Text', content: 'Prueba de conexion del sitio web nuevo con Microsoft 365.' },
        toRecipients: [{ emailAddress: { address: MAIL_FROM } }],
      },
      saveToSentItems: true,
    }),
  });
  if (mailResponse.ok) {
    ok(`Microsoft aceptó el envío (HTTP ${mailResponse.status}). Revisa la bandeja de ${MAIL_FROM}.`);
  } else {
    const err = (await mailResponse.json().catch(() => ({}))).error || {};
    bad(`Microsoft rechazó el envío (HTTP ${mailResponse.status})`);
    console.log('    Código:', err.code);
    console.log('    Mensaje:', err.message);
    const hint = {
      ErrorAccessDenied: 'Sin permiso: el permiso no es de tipo Application, falta el consentimiento de administrador, o la app no puede enviar como ese buzón.',
      MailboxNotEnabledForRESTAPI: 'El buzón no tiene licencia o no es un buzón válido de Exchange Online.',
      ErrorInvalidUser: 'MAIL_FROM no corresponde a un usuario existente.',
      Authorization_RequestDenied: 'Sin permiso suficiente para esa operación.',
    };
    if (hint[err.code]) console.log('    →', hint[err.code]);
    { process.exitCode = 1; return; };
  }

}

await main();

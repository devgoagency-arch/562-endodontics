# Guía de configuración: correo, captcha y dominio

Para publicar el sitio nuevo de 562 endodontics. Pensada para hacerse paso a paso, sin saber de programación.
Estado de la guía: octubre de 2026. Los nombres de los menús de Microsoft, Vercel y Bluehost cambian de vez en cuando: si un botón no está donde dice, busca el nombre en la pantalla.

**Regla de oro:** las contraseñas y los secretos **nunca** se mandan por chat, correo ni WhatsApp. Se escriben directamente donde se usan (Vercel) o se guardan en un gestor de contraseñas.

---

## 0. Mapa: qué está dónde

| Qué | Dónde vive hoy | Para qué se entra |
|---|---|---|
| Nombre del dominio (562endodontics.com) | **GoDaddy** (registro) | Renovarlo cada año |
| DNS: quién dice a dónde apunta el dominio | **Bluehost** (servidores ns1/ns2.bluehost.com) | Apuntar el dominio al sitio nuevo |
| Correo (info@562endodontics.com) | **Microsoft 365 / Outlook** | Crear la app que envía los correos del sitio |
| Sitio web nuevo | **Vercel**, equipo "Go Agency Projects", proyecto `562-endodontics` | Variables, dominios, despliegues, registros de errores |
| Código del sitio | **GitHub**, `devgoagency-arch/562-endodontics` | Cambios del sitio |
| Captcha de los formularios | **Cloudflare Turnstile** (por crear) | Evitar spam en los formularios |
| Sitio antiguo (WordPress) | **Bluehost** (plan pagado a 3 años) | Respaldo hasta que todo esté estable |

Importante: Bluehost **no** debe cancelarse mientras sea quien maneja el DNS. Si se cancela, el sitio y el correo dejan de funcionar.

## 1. Lo que hay que reunir antes de empezar

- Acceso de **administrador global** de Microsoft 365 (normalmente la Dra. Jacqueline). Para ver quién es: https://admin.microsoft.com → Usuarios → Usuarios activos → columna de roles.
- Cuenta de Vercel con acceso al proyecto.
- Una cuenta de Cloudflare (gratuita).
- Acceso a Bluehost (para el DNS) y a GoDaddy (solo para renovar).
- Un lugar seguro (gestor de contraseñas) para guardar los datos que se generen.

---

## 2. Correo saliente: crear la aplicación en Microsoft (Entra)

El sitio envía los correos de los formularios usando el buzón info@ **por la API de Microsoft Graph**. No usa SMTP ni contraseñas de usuario. Necesita una "aplicación" propia (distinta de la que usa el WordPress).

### 2.1 Registrar la aplicación
1. Entra a **https://entra.microsoft.com** con la cuenta de administrador.
2. Menú izquierdo: **Entra ID → App registrations → + New registration**.
3. Name: `562 Website Mailer`.
4. Supported account types: **Accounts in this organizational directory only (Single tenant)**.
5. Redirect URI: **déjalo vacío**.
6. **Register**.

### 2.2 Copiar dos datos (son identificadores, no son secretos)
En la página **Overview** de la app copia y guarda:
- **Application (client) ID** → será `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → será `AZURE_TENANT_ID`

### 2.3 Crear el secreto
1. Menú de la app: **Certificates & secrets → Client secrets → + New client secret**.
2. Description: `Sitio web (Vercel)`. Expires: **24 months** (o 12).
3. **Add**.
4. Copia **inmediatamente** la columna **Value** (no "Secret ID"). Solo se muestra una vez. Será `AZURE_CLIENT_SECRET`.
5. **Pon una alarma en el calendario** un mes antes de que venza. Si el secreto vence, los formularios dejan de enviar correo.

### 2.4 NO agregar permisos aquí
No entres a "API permissions" a agregar `Mail.Send`. El permiso se da en Exchange (sección 3) y limitado a un solo buzón. Si se da aquí, la app podría enviar como cualquier persona de la organización.

### 2.5 Copiar el Object ID de la aplicación empresarial
1. Menú: **Entra ID → Enterprise applications** → busca `562 Website Mailer`.
2. En **Overview** copia el **Object ID**.
   Ojo: **no es el mismo** que el Object ID de la pantalla "App registrations". Es el de "Enterprise applications".

---

### 2.6 Cómo llegar al Tenant ID y al Client ID (sin perderse)

**Tenant ID (identifica a la organización de Microsoft 365):**
1. Entra a **https://entra.microsoft.com** y abre sesión con la cuenta de administrador.
2. Arriba a la derecha, el círculo con las iniciales de la cuenta debe mostrar el dominio de la clínica. Si hay varias organizaciones, usa **Switch directory** y elige la de 562 endodontics.
3. Menú izquierdo: **Entra ID → Overview**.
4. En el bloque **Basic information** aparece **Tenant ID**. Al lado hay un icono de copiar.

**Client ID (identifica a la aplicación):** existe solo después de registrar la app (2.1).
1. Menú izquierdo: **Entra ID → App registrations**.
2. Pestaña **All applications**. Abre `562 Website Mailer`.
3. En **Overview** aparece **Application (client) ID**, con su icono de copiar.

Si no aparece el botón **+ New registration**, la cuenta no tiene permisos suficientes: hay que entrar con la cuenta de la administradora, o que ella te asigne el rol **Application Administrator** de forma temporal.

### 2.7 ¿Esto daña el formulario actual de WordPress?
**No.** El WordPress usa su **propia aplicación** de Azure (la de WP Mail SMTP, con ID que empieza por `79e5d2fd-…`). La nueva es independiente: otro ID, otro secreto, otro permiso. Mientras se cumpla lo siguiente, el WordPress sigue enviando igual:
- **No abrir, editar ni borrar** la aplicación que ya existe. Se crea una **nueva** con "+ New registration".
- **No tocar** su secreto ni su consentimiento.
- **No desactivar** el plugin WP Mail SMTP.
- **No tocar** los registros MX ni TXT del DNS.
- Los comandos de Exchange de la sección 3 solo afectan a la aplicación nueva (`562 Website Mailer`).

Las dos aplicaciones envían desde el mismo buzón (`info@`) y no se estorban.

## 2B. Plan B (sin PowerShell): dar el permiso desde la pantalla de la aplicación

Es el camino elegido cuando nadie va a ejecutar PowerShell. Se hace todo con clics y lo hace la persona administradora de Microsoft 365. **Reemplaza** a las secciones 2.4, 2.5 y 3 (no hay que copiar el Object ID ni usar Exchange).

Después de crear la aplicación (2.1 y 2.2):
1. Menú de la aplicación: **API permissions → + Add a permission**.
2. Elegir **Microsoft Graph**, luego **Application permissions** (no "Delegated permissions").
3. Buscar `Mail.Send`, marcarlo y hacer clic en **Add permissions**.
4. De vuelta en la lista, hacer clic en **Grant admin consent for <nombre de la organización>** y confirmar con **Yes**. La columna **Status** debe mostrar un check verde con "Granted for …".
5. No agregar ningún otro permiso.
6. Crear el secreto (2.3).

**Lo que significa este plan:** la aplicación podría enviar correo como cualquier buzón de la organización, no solo como info@. El sitio siempre envía como `MAIL_FROM` (info@), así que el riesgo existe únicamente si alguien obtiene el secreto. Para reducirlo:
- El secreto vive solo en Vercel, marcado como **Sensitive**, y no se comparte por chat ni por correo.
- Usar un vencimiento de **12 meses** y renovarlo.
- Limitar quién tiene acceso al proyecto de Vercel.
- Si alguien que lo conoció se va, **crear un secreto nuevo y borrar el anterior** (Certificates & secrets).
- Más adelante, si hay una cuenta temporal de administración, se puede restringir con la sección 3.

---

## 3. (Plan A, opcional) Limitar la aplicación a un solo buzón (Exchange Online)

Esto hace que la aplicación solo pueda enviar como `info@562endodontics.com`. Es el método vigente de Microsoft (RBAC for Applications); reemplaza a las "Application Access Policies".

**Quién lo hace:** una cuenta que sea miembro del grupo de roles **Organization Management** en Exchange y tenga el rol **Exchange Administrator**. Lo más fácil: la Dra. (administradora global) lo hace en una videollamada, o te da un rol temporal.

En un computador con Windows, abre **PowerShell** y ejecuta, uno por uno (reemplaza lo que está entre `< >`):

```powershell
# Solo la primera vez en ese computador
Install-Module ExchangeOnlineManagement -Scope CurrentUser

# Iniciar sesión (aparece la ventana de Microsoft; se usa la cuenta de administrador)
Connect-ExchangeOnline -UserPrincipalName <correo-del-administrador>

# 1) Enlazar la aplicación con Exchange
New-ServicePrincipal -AppId <AZURE_CLIENT_ID> -ObjectId <Object ID de Enterprise applications> -DisplayName "562 Website Mailer"

# 2) Crear el alcance: solo el buzón info@
New-ManagementScope -Name "562 buzon info" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'info@562endodontics.com'"

# 3) Dar el permiso de enviar, solo dentro de ese alcance
New-ManagementRoleAssignment -App <Object ID de Enterprise applications> -Role "Application Mail.Send" -CustomResourceScope "562 buzon info"

# 4) Comprobar: debe decir InScope = True para info@
Test-ServicePrincipalAuthorization -Identity <Object ID de Enterprise applications> -Resource info@562endodontics.com

# 5) Comprobar con otro buzón cualquiera: debe decir InScope = False
Test-ServicePrincipalAuthorization -Identity <Object ID de Enterprise applications> -Resource <otro-correo@562endodontics.com>

Disconnect-ExchangeOnline
```

Los cambios pueden tardar **entre 30 minutos y 2 horas** en aplicarse. Si al probar el sitio sale un error de acceso, esperar y reintentar.

---

## 4. Captcha: Cloudflare Turnstile

1. Crea una cuenta gratuita en **https://dash.cloudflare.com** (no hace falta pasar el dominio a Cloudflare).
2. Menú izquierdo: **Turnstile → Add widget**.
3. Widget name: `562 endodontics`.
4. Hostnames (agregar todos): el dominio temporal de Vercel (por ejemplo `algo.vercel.app`), `562endodontics.com`, `www.562endodontics.com` y `localhost`.
5. Widget Mode: **Managed**.
6. **Create**. Copia:
   - **Site Key** (pública) → `PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** (privada) → `TURNSTILE_SECRET_KEY`

---

## 5. Cargar todo en Vercel

1. Entra a **https://vercel.com** → equipo **Go Agency Projects** → proyecto **562-endodontics**.
2. **Settings → Environment Variables**.
3. Agrega estas variables (en **Production** y, si vas a probar previews, también en **Preview**):

| Nombre | Valor |
|---|---|
| `AZURE_TENANT_ID` | el Directory (tenant) ID |
| `AZURE_CLIENT_ID` | el Application (client) ID |
| `AZURE_CLIENT_SECRET` | el Value del secreto (marcar como **Sensitive**) |
| `MAIL_FROM` | `info@562endodontics.com` |
| `PUBLIC_TURNSTILE_SITE_KEY` | la Site Key de Cloudflare |
| `TURNSTILE_SECRET_KEY` | la Secret Key de Cloudflare (marcar como **Sensitive**) |

4. **Redeploy obligatorio:** pestaña **Deployments** → el último despliegue → menú **⋯ → Redeploy**. Sin esto, la clave pública del captcha no llega a la página.

---

## 6. Probar

Con el sitio en el dominio temporal:

1. Abre la página de **Contact Us** y envía un mensaje de prueba con tus datos.
2. Revisa la bandeja de **info@562endodontics.com** (y la carpeta de **Elementos enviados** y de **Correo no deseado**).
3. Abre **Referrals**, llena el formulario completo con un correo tuyo como doctor. Deben llegar **dos** correos: el aviso a info@ y una copia a tu correo.

**Si algo falla** (Vercel → proyecto → **Logs**, filtrar por "Error"):

| Mensaje | Qué pasa |
|---|---|
| `Microsoft 365 mail is not configured` | Faltan las variables de Azure o falta el redeploy |
| `Microsoft token request failed` | Tenant, Client ID o secreto mal copiados, o secreto vencido |
| `sendMail failed (403)` | El permiso de Exchange aún no se aplicó (esperar hasta 2 h) o el alcance no coincide con info@ |
| `Captcha not configured` / `Captcha verification failed` | Faltan las claves de Cloudflare, o el dominio no está en la lista de hostnames |

---

## 7. Pasar el dominio principal al sitio nuevo (día del lanzamiento)

Hacerlo cuando la Dra. haya aprobado todo. El correo **no se ve afectado** si solo se tocan los registros indicados.

**Un día antes:** en el DNS de Bluehost, bajar el TTL de los registros A y `www` a 300 segundos (5 minutos). Así, si algo sale mal, se vuelve atrás rápido.

1. En **Vercel → proyecto → Settings → Domains → Add**: agregar `562endodontics.com` y `www.562endodontics.com`. Vercel muestra **qué registros crear** (un registro **A** para el dominio principal y un **CNAME** para `www`). Usar exactamente los valores que muestre Vercel.
2. Entrar al DNS en **Bluehost** (Domains → el dominio → DNS, o cPanel → Zone Editor; la pantalla puede variar).
3. **Cambiar** el registro A del dominio principal y el CNAME de `www` por los de Vercel.
4. **NO tocar**: los registros **MX**, los **TXT** (SPF y verificaciones de Microsoft) ni cualquier otro. Son los del correo.
5. Esperar la propagación (de minutos a unas horas). Vercel crea el certificado de seguridad (candado) solo.
6. Comprobar: `https://562endodontics.com` y `https://www.562endodontics.com` cargan el sitio nuevo, y las redirecciones antiguas (`/high-tech-facility-2/` → `/our-clinic/`, `/high-tech-facility-2-2/` → `/about-us/`) funcionan con y sin barra final.
7. Probar otra vez los dos formularios y enviar un correo de prueba a info@ desde fuera para confirmar que el correo sigue entrando.

**Si algo sale mal:** devolver el registro A y el CNAME a los valores anteriores (anotarlos antes de cambiarlos). El WordPress de Bluehost sigue intacto como respaldo.

---

## 8. Cuentas y vencimientos (para que no se pierda nada)

Guardar esta tabla en un lugar compartido, **sin contraseñas**:

| Qué | Dueño de la cuenta | Quién más tiene acceso | Vence / renueva |
|---|---|---|---|
| Dominio (GoDaddy) | | | Cada año |
| DNS y hosting antiguo (Bluehost) | | | Plan de 3 años (anotar la fecha) |
| Microsoft 365 | | | Mensual / anual |
| App "562 Website Mailer" (secreto) | | | **El secreto vence en 12 o 24 meses** |
| Vercel | | | Mensual / anual |
| Cloudflare Turnstile | | | No vence |
| GitHub | | | — |

Recomendación: que las cuentas importantes (dominio, Microsoft, Cloudflare) estén **a nombre de la clínica**, con la agencia como usuario invitado. Así, si cambia quien da el soporte, nadie queda bloqueado.

---

## Qué NO hay que hacer
- No pedir ni dar la contraseña del correo de la Dra.
- No agregar `Mail.Send` en "API permissions" de Entra.
- No tocar los registros MX/TXT del DNS.
- No cancelar Bluehost mientras maneje el DNS.
- No compartir el secreto de Azure ni las claves privadas por chat o correo.

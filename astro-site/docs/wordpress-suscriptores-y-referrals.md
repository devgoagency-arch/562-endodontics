# Suscriptores y Referrals guardados en WordPress

El sitio sigue enviando los correos a info@ como siempre. Además guarda una copia en el WordPress de la clínica
(`admin.562endodontics.com`), en dos menús del panel:

- **Referrals**: cada referral con sus datos y los enlaces a los documentos (válidos 12 meses). Se borran solos a
  los 12 meses (cambiable). Se puede borrar uno a mano.
- **Subscribers**: correos del newsletter, con descarga en CSV y opción de quitar a alguien.

Si WordPress está caído, los correos igual llegan; solo falta la copia.

## Instalación (una sola vez)

1. Subir `wordpress/562-referrals.php` y `wordpress/562-subscribers.php` a `wp-content/mu-plugins/` (junto a
   `562-clinic-data.php`). No hay que activarlos.
2. En `wp-config.php` (antes de "That's all, stop editing") agregar, con un texto largo y aleatorio (mínimo 16
   caracteres):

       define('ENDO562_API_SECRET', 'TEXTO-LARGO-Y-ALEATORIO');

3. En Vercel (Production y Preview) agregar `WP_API_SECRET` con **el mismo texto**. `WP_API_URL` ya existe.
4. Redeploy. Probar: un referral de prueba y una suscripción; deben salir en WordPress → Referrals / Subscribers.

## Seguridad (son datos de salud)

- Los endpoints rechazan todo lo que no traiga el secreto; solo administradores ven los menús.
- El WordPress debe tener contraseña fuerte + verificación en dos pasos, actualizaciones al día y respaldo.
- Retención: 365 días por defecto. Para cambiarla: `define('ENDO562_REFERRAL_RETENTION_DAYS', 365);` (0 = no borrar).
- Esto debe quedar aceptado por la clínica (datos de pacientes almacenados en el hosting de WordPress).

# 562 Endodontics — WordPress headless + Astro/Vercel

## Cómo encajan las piezas

```
wp-plugin/562-endodontics-cpts.php
  → se instala como plugin en el WordPress actual (o uno nuevo dedicado a admin).
  → registra los Custom Post Types + campos ACF + el bloque flexible de páginas.
  → dispara un Deploy Hook de Vercel cuando se publica/edita contenido.

astro-site/
  → frontend en Astro, deploy en Vercel.
  → consulta el contenido por WPGraphQL (src/lib/wordpress.ts).
  → src/pages/[...slug].astro renderiza cualquier "Página (bloques)" nueva
    creada en WP sin necesidad de deploy de código.
  → páginas a medida (home, referrals, etc.) van en su propio .astro.
```

## Requisitos en WordPress

1. Instalar y activar: **Advanced Custom Fields PRO**, **WPGraphQL**, **WPGraphQL for ACF**.
2. Subir `wp-plugin/562-endodontics-cpts.php` como plugin (vía GitHub Actions/SFTP o subida manual) y activarlo.
3. En `wp-config.php`, agregar:
   ```php
   define( 'VERCEL_DEPLOY_HOOK_URL', 'https://api.vercel.com/v1/integrations/deploy/TU_HOOK_AQUI' );
   ```
   (el Deploy Hook se crea en Vercel → Project Settings → Git → Deploy Hooks).
4. Restringir `/graphql` si el hosting lo permite (o dejarlo público de solo lectura — WPGraphQL no expone mutaciones sin autenticación por defecto).

## Requisitos en Vercel

1. Importar `astro-site/` como proyecto de Vercel (framework preset: Astro).
2. Variable de entorno `WORDPRESS_GRAPHQL_URL` apuntando al endpoint real.
3. Crear un Deploy Hook y pegarlo en `VERCEL_DEPLOY_HOOK_URL` (paso 3 de arriba) — así cada publicación en WP dispara un rebuild automático.

## Flujo de trabajo del día a día para el cliente

- **Agregar un tratamiento, miembro del equipo, FAQ o testimonio nuevo** → wp-admin, llenar el formulario del CPT correspondiente, publicar. El sitio se actualiza solo (rebuild automático).
- **Agregar una página nueva** (ej. "Promoción de verano", "Nueva sede") → wp-admin → "Páginas (bloques)" → armar con los bloques existentes (Hero, Texto+Imagen, Grid de tratamientos, FAQ, CTA) → publicar. Aparece en `562endodontics.com/slug-de-la-pagina` sin que nadie toque código.
- **Agregar un bloque nuevo que no existe** (ej. un carrusel de video) → sí requiere una iteración de desarrollo: un layout nuevo en ACF + un componente `.astro` nuevo en `src/components/blocks/`. Es la única vía que consume desarrollo, y queda disponible para siempre después.

## Siguientes pasos concretos

1. Migrar contenido real del WordPress actual a los nuevos CPTs (tratamientos, equipo, FAQs).
2. Reconstruir Home y Referrals como páginas Astro a medida, halando lo dinámico (tratamientos, equipo, FAQs) de WP.
3. Resolver el formulario de referidos (PHI + adjuntos) con una function/API route separada — no es parte de este scaffold todavía porque necesita definirse el proveedor de almacenamiento/cumplimiento PIPEDA primero.
4. Mapear URLs viejas → nuevas y configurar 301s antes del corte de DNS.

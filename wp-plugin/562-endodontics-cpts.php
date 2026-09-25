<?php
/**
 * Plugin Name: 562 Endodontics - Custom Content Types
 * Description: Registra los Custom Post Types, taxonomías y campos (ACF) que alimentan el frontend en Astro. Este archivo vive en GitHub como fuente de verdad de la ESTRUCTURA del contenido; el CONTENIDO se edita siempre desde wp-admin, nunca aquí.
 * Version: 1.0.0
 * Author: Go Estrategia Creativa
 *
 * Requisitos (instalar como plugins normales, no incluidos aquí):
 * - Advanced Custom Fields PRO
 * - WPGraphQL
 * - WPGraphQL for Advanced Custom Fields
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * 1. CUSTOM POST TYPES
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {

	// Tratamientos endodónticos
	register_post_type( 'treatment', [
		'labels' => [
			'name'          => 'Tratamientos',
			'singular_name' => 'Tratamiento',
			'add_new_item'  => 'Agregar tratamiento',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'treatment',
		'graphql_plural_name' => 'treatments',
		'menu_icon'    => 'dashicons-heart',
		'supports'     => [ 'title', 'editor', 'thumbnail', 'page-attributes' ],
		'has_archive'  => true,
		'rewrite'      => [ 'slug' => 'endodontic-treatments' ],
	] );

	// Equipo / doctores
	register_post_type( 'team_member', [
		'labels' => [
			'name'          => 'Equipo',
			'singular_name' => 'Miembro del equipo',
			'add_new_item'  => 'Agregar miembro',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'teamMember',
		'graphql_plural_name' => 'teamMembers',
		'menu_icon'    => 'dashicons-groups',
		'supports'     => [ 'title', 'editor', 'thumbnail', 'page-attributes' ],
		'has_archive'  => false,
	] );

	// Preguntas frecuentes
	register_post_type( 'faq', [
		'labels' => [
			'name'          => 'FAQs',
			'singular_name' => 'FAQ',
			'add_new_item'  => 'Agregar pregunta',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'faq',
		'graphql_plural_name' => 'faqs',
		'menu_icon'    => 'dashicons-editor-help',
		'supports'     => [ 'title', 'editor', 'page-attributes' ],
		'has_archive'  => false,
	] );

	// Recursos / desarrollo profesional (artículos, charlas, eventos)
	register_post_type( 'resource', [
		'labels' => [
			'name'          => 'Recursos',
			'singular_name' => 'Recurso',
			'add_new_item'  => 'Agregar recurso',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'resource',
		'graphql_plural_name' => 'resources',
		'menu_icon'    => 'dashicons-welcome-learn-more',
		'supports'     => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
		'has_archive'  => true,
		'rewrite'      => [ 'slug' => 'learning-opportunities' ],
	] );

	// Testimonios (respaldo manual; lo ideal es halar reseñas de Google en vivo)
	register_post_type( 'testimonial', [
		'labels' => [
			'name'          => 'Testimonios',
			'singular_name' => 'Testimonio',
			'add_new_item'  => 'Agregar testimonio',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'testimonial',
		'graphql_plural_name' => 'testimonials',
		'menu_icon'    => 'dashicons-star-filled',
		'supports'     => [ 'title', 'editor' ],
		'has_archive'  => false,
	] );

	/**
	 * Páginas flexibles: aquí es donde vive la solución a "van a surgir páginas
	 * nuevas". El editor arma la página combinando bloques (ver ACF Flexible
	 * Content más abajo) sin que nadie tenga que tocar Astro ni hacer deploy.
	 */
	register_post_type( 'flexible_page', [
		'labels' => [
			'name'          => 'Páginas (bloques)',
			'singular_name' => 'Página',
			'add_new_item'  => 'Agregar página',
		],
		'public'       => true,
		'show_in_rest' => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'flexiblePage',
		'graphql_plural_name' => 'flexiblePages',
		'menu_icon'    => 'dashicons-layout',
		'supports'     => [ 'title', 'page-attributes' ],
		'has_archive'  => false,
	] );

} );

/* -------------------------------------------------------------------------
 * 2. TAXONOMÍA: categorías de recursos (para el blog de desarrollo profesional)
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {
	register_taxonomy( 'resource_category', 'resource', [
		'labels' => [ 'name' => 'Categorías de recursos' ],
		'public'              => true,
		'show_in_graphql'     => true,
		'graphql_single_name' => 'resourceCategory',
		'graphql_plural_name' => 'resourceCategories',
		'hierarchical'        => true,
	] );
} );

/* -------------------------------------------------------------------------
 * 3. CAMPOS ACF (registrados por código = versionados en git; el CONTENIDO
 *    que se llena en cada campo siempre se edita desde wp-admin)
 * ---------------------------------------------------------------------- */

add_action( 'acf/init', function () {

	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	// --- Tratamiento ---
	acf_add_local_field_group( [
		'key'      => 'group_treatment',
		'title'    => 'Detalles del tratamiento',
		'fields'   => [
			[ 'key' => 'field_treatment_icon', 'label' => 'Ícono', 'name' => 'icon', 'type' => 'image', 'return_format' => 'url' ],
			[ 'key' => 'field_treatment_summary', 'label' => 'Resumen corto', 'name' => 'summary', 'type' => 'textarea' ],
		],
		'location' => [ [ [ 'param' => 'post_type', 'operator' => '==', 'value' => 'treatment' ] ] ],
		'show_in_graphql' => 1,
		'graphql_field_name' => 'treatmentFields',
	] );

	// --- Miembro del equipo ---
	acf_add_local_field_group( [
		'key'      => 'group_team_member',
		'title'    => 'Detalles del miembro del equipo',
		'fields'   => [
			[ 'key' => 'field_team_credentials', 'label' => 'Credenciales', 'name' => 'credentials', 'type' => 'text' ],
			[ 'key' => 'field_team_role', 'label' => 'Rol', 'name' => 'role', 'type' => 'text' ],
			[ 'key' => 'field_team_photo', 'label' => 'Foto', 'name' => 'photo', 'type' => 'image', 'return_format' => 'url' ],
		],
		'location' => [ [ [ 'param' => 'post_type', 'operator' => '==', 'value' => 'team_member' ] ] ],
		'show_in_graphql' => 1,
		'graphql_field_name' => 'teamMemberFields',
	] );

	// --- Testimonio ---
	acf_add_local_field_group( [
		'key'      => 'group_testimonial',
		'title'    => 'Detalles del testimonio',
		'fields'   => [
			[ 'key' => 'field_testimonial_author', 'label' => 'Autor', 'name' => 'author', 'type' => 'text' ],
			[ 'key' => 'field_testimonial_rating', 'label' => 'Calificación (1-5)', 'name' => 'rating', 'type' => 'number', 'min' => 1, 'max' => 5 ],
			[ 'key' => 'field_testimonial_source_url', 'label' => 'Link a la reseña (Google)', 'name' => 'source_url', 'type' => 'url' ],
		],
		'location' => [ [ [ 'param' => 'post_type', 'operator' => '==', 'value' => 'testimonial' ] ] ],
		'show_in_graphql' => 1,
		'graphql_field_name' => 'testimonialFields',
	] );

	/**
	 * Flexible Content para "Páginas (bloques)". Cada layout = un componente
	 * que ya existe en Astro (src/components/blocks/*). Agregar un layout
	 * nuevo aquí SÍ requiere código nuevo en Astro; usar los layouts
	 * existentes para armar una página nueva NO requiere código.
	 */
	acf_add_local_field_group( [
		'key'   => 'group_flexible_page',
		'title' => 'Bloques de la página',
		'fields' => [
			[
				'key'     => 'field_page_blocks',
				'label'   => 'Bloques',
				'name'    => 'blocks',
				'type'    => 'flexible_content',
				'button_label' => 'Agregar bloque',
				'layouts' => [
					'layout_hero' => [
						'key' => 'layout_hero', 'name' => 'hero', 'label' => 'Hero',
						'sub_fields' => [
							[ 'key' => 'field_hero_heading', 'name' => 'heading', 'label' => 'Título', 'type' => 'text' ],
							[ 'key' => 'field_hero_text', 'name' => 'text', 'label' => 'Texto', 'type' => 'textarea' ],
							[ 'key' => 'field_hero_image', 'name' => 'image', 'label' => 'Imagen', 'type' => 'image', 'return_format' => 'url' ],
							[ 'key' => 'field_hero_cta_label', 'name' => 'cta_label', 'label' => 'Texto del botón', 'type' => 'text' ],
							[ 'key' => 'field_hero_cta_url', 'name' => 'cta_url', 'label' => 'Link del botón', 'type' => 'url' ],
						],
					],
					'layout_text_image' => [
						'key' => 'layout_text_image', 'name' => 'text_image', 'label' => 'Texto + Imagen',
						'sub_fields' => [
							[ 'key' => 'field_ti_heading', 'name' => 'heading', 'label' => 'Título', 'type' => 'text' ],
							[ 'key' => 'field_ti_content', 'name' => 'content', 'label' => 'Contenido', 'type' => 'wysiwyg' ],
							[ 'key' => 'field_ti_image', 'name' => 'image', 'label' => 'Imagen', 'type' => 'image', 'return_format' => 'url' ],
							[ 'key' => 'field_ti_reverse', 'name' => 'reverse', 'label' => 'Invertir orden', 'type' => 'true_false' ],
						],
					],
					'layout_treatment_grid' => [
						'key' => 'layout_treatment_grid', 'name' => 'treatment_grid', 'label' => 'Grid de tratamientos',
						'sub_fields' => [
							[ 'key' => 'field_tg_heading', 'name' => 'heading', 'label' => 'Título de la sección', 'type' => 'text' ],
						],
					],
					'layout_faq' => [
						'key' => 'layout_faq', 'name' => 'faq_accordion', 'label' => 'FAQ (acordeón)',
						'sub_fields' => [
							[ 'key' => 'field_faq_heading', 'name' => 'heading', 'label' => 'Título de la sección', 'type' => 'text' ],
						],
					],
					'layout_cta' => [
						'key' => 'layout_cta', 'name' => 'cta_banner', 'label' => 'CTA',
						'sub_fields' => [
							[ 'key' => 'field_cta_heading', 'name' => 'heading', 'label' => 'Título', 'type' => 'text' ],
							[ 'key' => 'field_cta_label', 'name' => 'label', 'label' => 'Texto del botón', 'type' => 'text' ],
							[ 'key' => 'field_cta_url', 'name' => 'url', 'label' => 'Link', 'type' => 'url' ],
						],
					],
				],
			],
		],
		'location' => [ [ [ 'param' => 'post_type', 'operator' => '==', 'value' => 'flexible_page' ] ] ],
		'show_in_graphql' => 1,
		'graphql_field_name' => 'pageBlocks',
	] );

} );

/* -------------------------------------------------------------------------
 * 4. WEBHOOK: al publicar/actualizar contenido, dispara el Deploy Hook de
 *    Vercel para que el sitio se regenere con el contenido nuevo.
 *    Configura la URL real en wp-admin (ver ajuste "562e_vercel_deploy_hook_url"
 *    abajo) o pégala directo aquí como constante en wp-config.php:
 *    define( 'VERCEL_DEPLOY_HOOK_URL', 'https://api.vercel.com/v1/integrations/deploy/...' );
 * ---------------------------------------------------------------------- */

add_action( 'save_post', function ( $post_id, $post ) {

	$watched_types = [ 'treatment', 'team_member', 'faq', 'resource', 'testimonial', 'flexible_page', 'page' ];

	if ( ! in_array( $post->post_type, $watched_types, true ) ) {
		return;
	}
	if ( $post->post_status !== 'publish' ) {
		return;
	}
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	if ( ! defined( 'VERCEL_DEPLOY_HOOK_URL' ) || ! VERCEL_DEPLOY_HOOK_URL ) {
		return;
	}

	wp_remote_post( VERCEL_DEPLOY_HOOK_URL, [
		'timeout'  => 5,
		'blocking' => false,
	] );

}, 10, 2 );

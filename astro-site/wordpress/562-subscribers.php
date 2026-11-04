<?php
/**
 * Plugin Name: 562 Subscribers
 * Description: Lista de suscriptores del newsletter del sitio nuevo de 562 endodontics. Recibe los correos desde el sitio en /wp-json/endo562/v1/subscribe (protegido con un secreto) y los muestra en el menú "Subscribers", donde se pueden descargar en CSV o borrar.
 * Version: 1.0.0
 * Author: Go Agency
 *
 * Instalación: subir este archivo a wp-content/mu-plugins/ (junto a 562-clinic-data.php). No requiere activarlo.
 * Agregar en wp-config.php (antes de la línea "That's all, stop editing") un texto largo y aleatorio:
 *
 *   define('ENDO562_API_SECRET', 'TEXTO-LARGO-Y-ALEATORIO');
 *
 * El mismo texto va en Vercel como WP_API_SECRET. Sin esa constante el endpoint rechaza todo.
 * La tabla se crea sola la primera vez.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Endo562_Subscribers
{
    const DB_VERSION = '1';
    const DB_OPTION = 'endo562_subscribers_db';
    const PAGE = 'endo562-subscribers';
    const PER_PAGE = 50;

    public static function init()
    {
        add_action('init', [__CLASS__, 'maybe_install']);
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('rest_api_init', [__CLASS__, 'routes']);
        add_action('admin_post_endo562_subs_export', [__CLASS__, 'export']);
        add_action('admin_post_endo562_subs_delete', [__CLASS__, 'delete']);
    }

    private static function table()
    {
        global $wpdb;
        return $wpdb->prefix . 'endo562_subscribers';
    }

    public static function maybe_install()
    {
        if (get_option(self::DB_OPTION) === self::DB_VERSION) {
            return;
        }
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::table();
        $charset = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE $table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            email varchar(191) NOT NULL,
            source varchar(60) NOT NULL DEFAULT '',
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY email (email)
        ) $charset;");
        // Solo se marca como instalada si la tabla de verdad existe; si no, se reintenta en la siguiente carga.
        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
            update_option(self::DB_OPTION, self::DB_VERSION);
        }
    }

    /* ---------- Endpoint que usa el sitio ---------- */

    public static function routes()
    {
        register_rest_route('endo562/v1', '/subscribe', [
            'methods'             => 'POST',
            'callback'            => [__CLASS__, 'rest_subscribe'],
            'permission_callback' => [__CLASS__, 'rest_allowed'],
        ]);
    }

    public static function rest_allowed(WP_REST_Request $request)
    {
        if (!defined('ENDO562_API_SECRET') || !is_string(ENDO562_API_SECRET) || strlen(ENDO562_API_SECRET) < 16) {
            return false;
        }
        $sent = (string) $request->get_header('x-endo562-secret');
        return $sent !== '' && hash_equals(ENDO562_API_SECRET, $sent);
    }

    public static function rest_subscribe(WP_REST_Request $request)
    {
        global $wpdb;
        $email = $request->get_param('email');
        $email = is_string($email) ? strtolower(trim(sanitize_email($email))) : '';
        if ($email === '' || strlen($email) > 191 || !is_email($email)) {
            return new WP_REST_Response(['ok' => false, 'error' => 'invalid email'], 400);
        }
        $source = $request->get_param('source');
        $source = is_string($source) ? mb_substr(sanitize_text_field($source), 0, 60) : '';

        self::maybe_install();
        // IGNORE: si el correo ya existe no se duplica ni se considera error.
        $created = $wpdb->query($wpdb->prepare(
            'INSERT IGNORE INTO ' . self::table() . ' (email, source, created_at) VALUES (%s, %s, %s)',
            $email,
            $source,
            current_time('mysql')
        ));
        if ($created === false) {
            return new WP_REST_Response(['ok' => false, 'error' => 'database error'], 500);
        }
        return new WP_REST_Response(['ok' => true, 'created' => $created === 1], 200);
    }

    /* ---------- Pantalla de administración ---------- */

    public static function menu()
    {
        add_menu_page('Subscribers', 'Subscribers', 'manage_options', self::PAGE, [__CLASS__, 'render'], 'dashicons-email-alt', 5);
    }

    public static function render()
    {
        if (!current_user_can('manage_options')) {
            wp_die('You do not have permission to view this page.');
        }
        global $wpdb;
        self::maybe_install();
        $table = self::table();
        $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table");
        $page = isset($_GET['paged']) ? max(1, (int) $_GET['paged']) : 1;
        $pages = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min($page, $pages);
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT id, email, source, created_at FROM $table ORDER BY id DESC LIMIT %d OFFSET %d",
            self::PER_PAGE,
            ($page - 1) * self::PER_PAGE
        ));
        $export = wp_nonce_url(admin_url('admin-post.php?action=endo562_subs_export'), 'endo562_subs_export');
        ?>
        <div class="wrap">
            <h1>Newsletter subscribers</h1>
            <?php if (isset($_GET['deleted'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Subscriber removed.</p></div>
            <?php endif; ?>
            <p>
                <strong><?php echo esc_html(number_format_i18n($total)); ?></strong> subscribers.
                <a class="button button-primary" href="<?php echo esc_url($export); ?>">Download CSV</a>
            </p>
            <table class="widefat striped" style="max-width:900px">
                <thead><tr><th>Email</th><th>Source</th><th>Date</th><th></th></tr></thead>
                <tbody>
                <?php if (!$rows) : ?>
                    <tr><td colspan="4">No subscribers yet.</td></tr>
                <?php endif; ?>
                <?php foreach ((array) $rows as $row) : ?>
                    <?php
                    $delete = wp_nonce_url(
                        admin_url('admin-post.php?action=endo562_subs_delete&id=' . (int) $row->id),
                        'endo562_subs_delete_' . (int) $row->id
                    );
                    ?>
                    <tr>
                        <td><?php echo esc_html($row->email); ?></td>
                        <td><?php echo esc_html($row->source); ?></td>
                        <td><?php echo esc_html($row->created_at); ?></td>
                        <td><a href="<?php echo esc_url($delete); ?>" onclick="return confirm('Remove this subscriber?');">Remove</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <?php
            if ($pages > 1) {
                echo '<div class="tablenav"><div class="tablenav-pages">';
                echo wp_kses_post(paginate_links([
                    'base'      => add_query_arg('paged', '%#%', remove_query_arg('deleted')),
                    'format'    => '',
                    'current'   => $page,
                    'total'     => $pages,
                    'prev_text' => '&laquo;',
                    'next_text' => '&raquo;',
                ]));
                echo '</div></div>';
            }
            ?>
        </div>
        <?php
    }

    public static function delete()
    {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if (!current_user_can('manage_options') || !$id || !wp_verify_nonce(isset($_GET['_wpnonce']) ? (string) $_GET['_wpnonce'] : '', 'endo562_subs_delete_' . $id)) {
            wp_die('Not allowed.', '', ['response' => 403]);
        }
        global $wpdb;
        $wpdb->delete(self::table(), ['id' => $id], ['%d']);
        wp_safe_redirect(admin_url('admin.php?page=' . self::PAGE . '&deleted=1'));
        exit;
    }

    public static function export()
    {
        if (!current_user_can('manage_options') || !wp_verify_nonce(isset($_GET['_wpnonce']) ? (string) $_GET['_wpnonce'] : '', 'endo562_subs_export')) {
            wp_die('Not allowed.', '', ['response' => 403]);
        }
        global $wpdb;
        $rows = $wpdb->get_results('SELECT email, source, created_at FROM ' . self::table() . ' ORDER BY id ASC', ARRAY_A);

        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="562-newsletter-subscribers-' . gmdate('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // para que Excel abra bien los acentos
        fputcsv($out, ['Email', 'Source', 'Date'], ',', '"', '');
        foreach ((array) $rows as $row) {
            // Evita que Excel interprete un texto como fórmula.
            $line = array_map(function ($value) {
                $value = (string) $value;
                return preg_match('/^[=+\-@\t\r]/', $value) ? "'" . $value : $value;
            }, array_values($row));
            fputcsv($out, $line, ',', '"', '');
        }
        fclose($out);
        exit;
    }
}

Endo562_Subscribers::init();

<?php
/**
 * Plugin Name: 562 Referrals
 * Description: Sección "Referrals" del administrador: guarda cada referral enviado desde el sitio nuevo de 562 endodontics (datos del formulario y enlaces a los documentos) y los borra solos pasados 12 meses. Recibe los datos en /wp-json/endo562/v1/referral, protegido con un secreto.
 * Version: 1.0.0
 * Author: Go Agency
 *
 * Instalación: subir este archivo a wp-content/mu-plugins/ (junto a los otros). No requiere activarlo.
 * Usa el mismo secreto que 562-subscribers.php en wp-config.php:
 *
 *   define('ENDO562_API_SECRET', 'TEXTO-LARGO-Y-ALEATORIO');
 *
 * Opcional, para cambiar los 365 días de retención (0 = no borrar nunca):
 *
 *   define('ENDO562_REFERRAL_RETENTION_DAYS', 365);
 *
 * Son datos de salud: el administrador de este WordPress debe tener contraseña fuerte y verificación en dos pasos.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Endo562_Referrals
{
    const DB_VERSION = '1';
    const DB_OPTION = 'endo562_referrals_db';
    const PAGE = 'endo562-referrals';
    const PER_PAGE = 25;
    const CRON = 'endo562_referrals_purge';

    public static function init()
    {
        add_action('init', [__CLASS__, 'maybe_install']);
        add_action('init', [__CLASS__, 'schedule']);
        add_action(self::CRON, [__CLASS__, 'purge']);
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('rest_api_init', [__CLASS__, 'routes']);
        add_action('admin_post_endo562_referral_delete', [__CLASS__, 'delete']);
        add_action('admin_post_endo562_referrals_export', [__CLASS__, 'export']);
    }

    private static function table()
    {
        global $wpdb;
        return $wpdb->prefix . 'endo562_referrals';
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
            created_at datetime NOT NULL,
            patient varchar(191) NOT NULL DEFAULT '',
            doctor varchar(191) NOT NULL DEFAULT '',
            referred_for varchar(191) NOT NULL DEFAULT '',
            data longtext NOT NULL,
            files longtext NOT NULL,
            PRIMARY KEY  (id),
            KEY created_at (created_at)
        ) $charset;");
        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
            update_option(self::DB_OPTION, self::DB_VERSION);
        }
    }

    /* ---------- Borrado automático ---------- */

    private static function retention_days()
    {
        if (defined('ENDO562_REFERRAL_RETENTION_DAYS') && is_int(ENDO562_REFERRAL_RETENTION_DAYS) && ENDO562_REFERRAL_RETENTION_DAYS >= 0) {
            return ENDO562_REFERRAL_RETENTION_DAYS;
        }
        return 365;
    }

    public static function schedule()
    {
        if (!wp_next_scheduled(self::CRON)) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', self::CRON);
        }
    }

    public static function purge()
    {
        $days = self::retention_days();
        if ($days === 0 || get_option(self::DB_OPTION) !== self::DB_VERSION) {
            return;
        }
        global $wpdb;
        $limit = gmdate('Y-m-d H:i:s', strtotime(current_time('mysql')) - $days * DAY_IN_SECONDS);
        $wpdb->query($wpdb->prepare('DELETE FROM ' . self::table() . ' WHERE created_at < %s', $limit));
    }

    /* ---------- Endpoint que usa el sitio ---------- */

    public static function routes()
    {
        register_rest_route('endo562/v1', '/referral', [
            'methods'             => 'POST',
            'callback'            => [__CLASS__, 'rest_referral'],
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

    public static function rest_referral(WP_REST_Request $request)
    {
        global $wpdb;
        $body = $request->get_json_params();
        $raw_fields = is_array($body) && isset($body['fields']) && is_array($body['fields']) ? $body['fields'] : null;
        if (!$raw_fields) {
            return new WP_REST_Response(['ok' => false, 'error' => 'invalid fields'], 400);
        }
        $raw_fields = array_slice($raw_fields, 0, 80, true);

        $fields = [];
        foreach ($raw_fields as $key => $value) {
            $key = preg_replace('/[^A-Za-z0-9_\-\[\]]/', '', (string) $key);
            if ($key === '' || !is_string($value)) {
                continue;
            }
            $fields[$key] = mb_substr(sanitize_textarea_field($value), 0, 5000);
        }
        if (!$fields) {
            return new WP_REST_Response(['ok' => false, 'error' => 'invalid fields'], 400);
        }

        // Copia ordenada del formulario (sección, etiqueta, valor), incluidos los campos vacíos.
        $rows = [];
        $raw_rows = isset($body['rows']) && is_array($body['rows']) ? array_slice($body['rows'], 0, 120) : [];
        foreach ($raw_rows as $row) {
            if (!is_array($row) || !isset($row['label']) || !is_string($row['label'])) {
                continue;
            }
            $rows[] = [
                'section' => isset($row['section']) && is_string($row['section']) ? mb_substr(sanitize_text_field($row['section']), 0, 120) : '',
                'label'   => mb_substr(sanitize_text_field($row['label']), 0, 200),
                'value'   => isset($row['value']) && is_string($row['value']) ? mb_substr(sanitize_textarea_field($row['value']), 0, 5000) : '',
            ];
        }

        $files = [];
        $raw_files = isset($body['files']) && is_array($body['files']) ? array_slice($body['files'], 0, 20) : [];
        foreach ($raw_files as $file) {
            if (!is_array($file) || !isset($file['name'], $file['url']) || !is_string($file['name']) || !is_string($file['url'])) {
                continue;
            }
            $url = esc_url_raw($file['url'], ['https']);
            if ($url === '') {
                continue;
            }
            $files[] = [
                'name' => mb_substr(sanitize_text_field($file['name']), 0, 200),
                'size' => isset($file['size']) ? max(0, (int) $file['size']) : 0,
                'url'  => $url,
            ];
        }

        $field = function ($key) use ($fields) {
            return isset($fields[$key]) ? $fields[$key] : '';
        };
        self::maybe_install();
        // Si el INSERT falla, wpdb escribiría la consulta completa (con datos del paciente) en el log de PHP.
        $previous = $wpdb->suppress_errors(true);
        $saved = $wpdb->insert(
            self::table(),
            [
                'created_at'   => current_time('mysql'),
                'patient'      => mb_substr(trim($field('first_name') . ' ' . $field('last_name')), 0, 191),
                'doctor'       => mb_substr(trim($field('doctor_name') . ' ' . $field('doctor_last_name')), 0, 191),
                'referred_for' => mb_substr($field('referred_for'), 0, 191),
                'data'         => wp_json_encode(['fields' => $fields, 'rows' => $rows], JSON_UNESCAPED_UNICODE),
                'files'        => wp_json_encode($files, JSON_UNESCAPED_UNICODE),
            ],
            ['%s', '%s', '%s', '%s', '%s', '%s']
        );
        $wpdb->suppress_errors($previous);
        if ($saved === false) {
            return new WP_REST_Response(['ok' => false, 'error' => 'database error'], 500);
        }
        return new WP_REST_Response(['ok' => true], 200);
    }

    /* ---------- Pantalla de administración ---------- */

    public static function menu()
    {
        add_menu_page('Referrals', 'Referrals', 'manage_options', self::PAGE, [__CLASS__, 'render'], 'dashicons-clipboard', 4);
    }

    public static function render()
    {
        if (!current_user_can('manage_options')) {
            wp_die('You do not have permission to view this page.');
        }
        self::maybe_install();
        $view = isset($_GET['view']) ? (int) $_GET['view'] : 0;
        echo '<div class="wrap">';
        if ($view > 0) {
            self::render_detail($view);
        } else {
            self::render_list();
        }
        echo '</div>';
    }

    private static function label($key)
    {
        $key = trim(str_replace(['_', '[]'], [' ', ''], $key));
        return ucfirst(strtolower(preg_replace('/(?<=[a-z])(?=[A-Z])/', ' ', $key)));
    }

    /** Filas del formulario de un registro: [section, label, value], con formato simple si es un registro viejo. */
    private static function form_rows($json)
    {
        $data = json_decode((string) $json, true);
        $rows = is_array($data) && isset($data['rows']) && is_array($data['rows']) ? $data['rows'] : [];
        if (!$rows && is_array($data)) {
            $source = isset($data['fields']) && is_array($data['fields']) ? $data['fields'] : $data;
            foreach ($source as $key => $value) {
                $rows[] = ['section' => '', 'label' => self::label((string) $key), 'value' => (string) $value];
            }
        }
        $clean = [];
        foreach ($rows as $item) {
            if (!is_array($item)) {
                continue;
            }
            $clean[] = [
                'section' => isset($item['section']) ? (string) $item['section'] : '',
                'label'   => isset($item['label']) ? (string) $item['label'] : '',
                'value'   => isset($item['value']) ? (string) $item['value'] : '',
            ];
        }
        return $clean;
    }

    /** Todas las columnas (campos del formulario) que aparecen en los registros, en el orden en que salen. */
    private static function columns(array $records)
    {
        $columns = [];
        foreach ($records as $record) {
            foreach ($record['rows'] as $item) {
                $id = $item['section'] . "\x1f" . $item['label'];
                if (!isset($columns[$id])) {
                    $columns[$id] = $item;
                }
            }
        }
        return $columns;
    }

    private static function records($raw)
    {
        $records = [];
        foreach ((array) $raw as $row) {
            $values = [];
            $rows = self::form_rows(isset($row->data) ? $row->data : '');
            foreach ($rows as $item) {
                $values[$item['section'] . "\x1f" . $item['label']] = $item['value'];
            }
            $files = json_decode(isset($row->files) ? (string) $row->files : '[]', true);
            $records[] = [
                'row'    => $row,
                'rows'   => $rows,
                'values' => $values,
                'files'  => is_array($files) ? $files : [],
            ];
        }
        return $records;
    }

    private static function render_list()
    {
        global $wpdb;
        $table = self::table();
        $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table");
        $page = isset($_GET['paged']) ? max(1, (int) $_GET['paged']) : 1;
        $pages = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min($page, $pages);
        $raw = $wpdb->get_results($wpdb->prepare(
            "SELECT id, created_at, patient, doctor, referred_for, data, files FROM $table ORDER BY id DESC LIMIT %d OFFSET %d",
            self::PER_PAGE,
            ($page - 1) * self::PER_PAGE
        ));
        $records = self::records($raw);
        $columns = self::columns($records);
        $days = self::retention_days();
        $export = wp_nonce_url(admin_url('admin-post.php?action=endo562_referrals_export'), 'endo562_referrals_export');
        ?>
        <style>
            .endo562-scroll { overflow: auto; max-width: 100%; max-height: calc(100vh - 220px); background: #fff; border: 1px solid #c3c4c7; }
            .endo562-grid { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; font-size: 13px; }
            .endo562-grid th, .endo562-grid td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; white-space: nowrap; text-align: left; vertical-align: top; background: #fff; }
            .endo562-grid thead th { position: sticky; top: 0; background: #f6f7f7; z-index: 2; border-bottom: 1px solid #c3c4c7; }
            .endo562-grid tbody tr:nth-child(even) td { background: #f9f9f9; }
            .endo562-grid .sticky { position: sticky; left: 0; z-index: 1; border-right: 1px solid #c3c4c7; }
            .endo562-grid thead .sticky { z-index: 3; }
            .endo562-grid .clip { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .endo562-grid .group { font-weight: 400; color: #646970; font-size: 11px; display: block; }
        </style>
        <h1>Referrals</h1>
        <?php if (isset($_GET['deleted'])) : ?>
            <div class="notice notice-success is-dismissible"><p>Referral deleted.</p></div>
        <?php endif; ?>
        <p>
            <strong><?php echo esc_html(number_format_i18n($total)); ?></strong> referrals.
            <?php echo $days > 0 ? esc_html("They are deleted automatically after $days days.") : 'Automatic deletion is off.'; ?>
            <a class="button button-primary" href="<?php echo esc_url($export); ?>" style="margin-left:8px">Download CSV (all referrals)</a>
        </p>
        <p class="description">Scroll sideways to see every field of the form. Click a patient to open the full referral.</p>
        <div class="endo562-scroll">
            <table class="endo562-grid">
                <thead>
                    <tr>
                        <th class="sticky">Patient</th>
                        <th>Received</th>
                        <th>Files</th>
                        <?php foreach ($columns as $column) : ?>
                            <th><span class="group"><?php echo esc_html($column['section']); ?></span><?php echo esc_html($column['label']); ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                <?php if (!$records) : ?>
                    <tr><td class="sticky" colspan="<?php echo (int) (3 + count($columns)); ?>">No referrals yet.</td></tr>
                <?php endif; ?>
                <?php foreach ($records as $record) : ?>
                    <?php $open = admin_url('admin.php?page=' . self::PAGE . '&view=' . (int) $record['row']->id); ?>
                    <tr>
                        <td class="sticky"><a href="<?php echo esc_url($open); ?>"><strong><?php echo esc_html($record['row']->patient ?: '(no name)'); ?></strong></a></td>
                        <td><?php echo esc_html($record['row']->created_at); ?></td>
                        <td>
                            <?php if (!$record['files']) : ?>
                                <span style="color:#888">&mdash;</span>
                            <?php endif; ?>
                            <?php foreach ($record['files'] as $file) : ?>
                                <a href="<?php echo esc_url($file['url']); ?>" target="_blank" rel="noopener"><?php echo esc_html($file['name']); ?></a><br>
                            <?php endforeach; ?>
                        </td>
                        <?php foreach ($columns as $id => $column) : ?>
                            <?php $value = isset($record['values'][$id]) ? $record['values'][$id] : ''; ?>
                            <td><?php echo $value === '' ? '<span style="color:#888">&mdash;</span>' : '<div class="clip" title="' . esc_attr($value) . '">' . esc_html($value) . '</div>'; ?></td>
                        <?php endforeach; ?>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php
        if ($pages > 1) {
            echo '<div class="tablenav"><div class="tablenav-pages">';
            echo wp_kses_post(paginate_links([
                'base'      => add_query_arg('paged', '%#%', remove_query_arg(['deleted', 'view'])),
                'format'    => '',
                'current'   => $page,
                'total'     => $pages,
                'prev_text' => '&laquo;',
                'next_text' => '&raquo;',
            ]));
            echo '</div></div>';
        }
    }

    private static function render_detail($id)
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::table() . ' WHERE id = %d', $id));
        $back = admin_url('admin.php?page=' . self::PAGE);
        if (!$row) {
            echo '<h1>Referral not found</h1><p><a href="' . esc_url($back) . '">&larr; Back to Referrals</a></p>';
            return;
        }
        $files = json_decode((string) $row->files, true);
        $rows = self::form_rows($row->data);
        $delete = wp_nonce_url(
            admin_url('admin-post.php?action=endo562_referral_delete&id=' . (int) $row->id),
            'endo562_referral_delete_' . (int) $row->id
        );

        // Secciones del formulario, en orden.
        $sections = [];
        foreach ($rows as $item) {
            $sections[$item['section']][] = $item;
        }
        ?>
        <style>
            .endo562-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 16px; align-items: start; max-width: 1400px; }
            .endo562-card { background: #fff; border: 1px solid #c3c4c7; padding: 4px 16px 12px; }
            .endo562-card h3 { margin: 12px 0 8px; font-size: 14px; }
            .endo562-card dl { margin: 0; }
            .endo562-card .r { display: grid; grid-template-columns: 42% 1fr; gap: 12px; padding: 7px 0; border-top: 1px solid #f0f0f1; font-size: 13px; }
            .endo562-card dt { font-weight: 600; margin: 0; }
            .endo562-card dd { margin: 0; word-break: break-word; }
            .endo562-card.wide { grid-column: 1 / -1; }
            @media (max-width: 700px) { .endo562-cards { grid-template-columns: 1fr; } }
        </style>
        <p><a href="<?php echo esc_url($back); ?>">&larr; Back to Referrals</a></p>
        <h1>Referral &mdash; <?php echo esc_html($row->patient ?: '(no name)'); ?></h1>
        <p>Received <?php echo esc_html($row->created_at); ?></p>

        <div class="endo562-cards">
            <div class="endo562-card wide">
                <h3>Documents</h3>
                <?php if (is_array($files) && $files) : ?>
                    <div style="display:flex;flex-wrap:wrap;gap:16px;padding:4px 0 8px">
                    <?php foreach ($files as $file) : ?>
                        <div style="max-width:260px;font-size:13px">
                            <?php if (preg_match('/\.(jpe?g|png)$/i', (string) $file['name'])) : ?>
                                <a href="<?php echo esc_url($file['url']); ?>" target="_blank" rel="noopener"><img src="<?php echo esc_url($file['url']); ?>" alt="<?php echo esc_attr($file['name']); ?>" loading="lazy" style="display:block;max-width:260px;max-height:200px;margin-bottom:6px;border:1px solid #ccd0d4;border-radius:4px"></a>
                            <?php endif; ?>
                            <a href="<?php echo esc_url($file['url']); ?>" target="_blank" rel="noopener"><?php echo esc_html($file['name']); ?></a>
                            <?php if (!empty($file['size'])) : ?>(<?php echo esc_html(size_format((int) $file['size'])); ?>)<?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                    </div>
                    <p class="description" style="margin:0 0 6px">The download links stop working 12 months after the referral was sent.</p>
                <?php else : ?>
                    <p style="margin:6px 0 8px">No files were attached.</p>
                <?php endif; ?>
            </div>

            <?php foreach ($sections as $title => $items) : ?>
                <div class="endo562-card">
                    <h3><?php echo esc_html($title); ?></h3>
                    <dl>
                    <?php foreach ($items as $item) : ?>
                        <div class="r">
                            <dt><?php echo esc_html($item['label']); ?></dt>
                            <dd><?php echo $item['value'] === '' ? '<span style="color:#888">&mdash;</span>' : nl2br(esc_html($item['value'])); ?></dd>
                        </div>
                    <?php endforeach; ?>
                    </dl>
                </div>
            <?php endforeach; ?>
        </div>
        <p style="margin-top:20px">
            <a class="button" href="<?php echo esc_url($delete); ?>" onclick="return confirm('Delete this referral permanently?');" style="color:#b32d2e;border-color:#b32d2e">Delete this referral</a>
        </p>
        <?php
    }

    public static function delete()
    {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if (!current_user_can('manage_options') || !$id || !wp_verify_nonce(isset($_GET['_wpnonce']) ? (string) $_GET['_wpnonce'] : '', 'endo562_referral_delete_' . $id)) {
            wp_die('Not allowed.', '', ['response' => 403]);
        }
        global $wpdb;
        $wpdb->delete(self::table(), ['id' => $id], ['%d']);
        wp_safe_redirect(admin_url('admin.php?page=' . self::PAGE . '&deleted=1'));
        exit;
    }

    /** CSV con todos los referrals y todos los campos del formulario. */
    public static function export()
    {
        if (!current_user_can('manage_options') || !wp_verify_nonce(isset($_GET['_wpnonce']) ? (string) $_GET['_wpnonce'] : '', 'endo562_referrals_export')) {
            wp_die('Not allowed.', '', ['response' => 403]);
        }
        global $wpdb;
        $records = self::records($wpdb->get_results('SELECT id, created_at, patient, doctor, referred_for, data, files FROM ' . self::table() . ' ORDER BY id ASC'));
        $columns = self::columns($records);

        // Evita que Excel interprete un texto como fórmula.
        $safe = function ($value) {
            $value = (string) $value;
            return preg_match('/^[=+\-@\t\r]/', $value) ? "'" . $value : $value;
        };

        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="562-referrals-' . gmdate('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        $head = ['Received', 'Patient', 'Files (name and link)'];
        foreach ($columns as $column) {
            $head[] = ($column['section'] !== '' ? $column['section'] . ' - ' : '') . $column['label'];
        }
        fputcsv($out, array_map($safe, $head), ',', '"', '');
        foreach ($records as $record) {
            $files = [];
            foreach ($record['files'] as $file) {
                $files[] = $file['name'] . ' ' . $file['url'];
            }
            $line = [$record['row']->created_at, $record['row']->patient, implode("\n", $files)];
            foreach ($columns as $id => $column) {
                $line[] = isset($record['values'][$id]) ? $record['values'][$id] : '';
            }
            fputcsv($out, array_map($safe, $line), ',', '"', '');
        }
        fclose($out);
        exit;
    }
}

Endo562_Referrals::init();

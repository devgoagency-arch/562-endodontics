<?php
/**
 * Plugin Name: 562 Clinic Data
 * Description: Pantalla "Clinic Data" (teléfono, correo, horario, dirección y PDF del referral) para el sitio nuevo de 562 endodontics. Expone los datos en /wp-json/endo562/v1/settings y, al guardar, avisa a Vercel para que el sitio se reconstruya.
 * Version: 1.0.0
 * Author: Go Agency
 *
 * Instalación: subir este archivo a wp-content/mu-plugins/ (la carpeta se crea si no existe). No requiere
 * activarlo ni otros plugins. Para que el sitio se actualice solo al guardar, agregar en wp-config.php
 * (antes de la línea "That's all, stop editing"):
 *
 *   define('ENDO562_DEPLOY_HOOK', 'https://api.vercel.com/v1/integrations/deploy/...');
 *
 * (la URL sale de Vercel → Settings → Git → Deploy Hooks). No va en la base de datos a propósito.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Endo562_Clinic_Data
{
    const OPTION = 'endo562_settings';
    const GROUP = 'endo562_group';
    const PAGE = 'endo562-clinic-data';

    public static function init()
    {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_init', [__CLASS__, 'register']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'assets']);
        add_action('rest_api_init', [__CLASS__, 'routes']);
        // Solo se disparan cuando el valor realmente cambió.
        add_action('update_option_' . self::OPTION, [__CLASS__, 'deploy'], 10, 0);
        add_action('add_option_' . self::OPTION, [__CLASS__, 'deploy'], 10, 0);
    }

    /** Valores actuales del sitio: lo que se ve si nadie ha guardado nada todavía. */
    public static function defaults()
    {
        return [
            'phone'      => '(519) 601-3636',
            'email'      => 'info@562endodontics.com',
            'hours'      => 'Mon - Fri 8:30 am to 5:00 pm',
            'opens'      => '08:30',
            'closes'     => '17:00',
            'street'     => '562 Waterloo Street',
            'city'       => 'London',
            'province'   => 'ON',
            'postal'     => 'N6B 2P9',
            'referral_pdf_id' => 0,
        ];
    }

    public static function get()
    {
        $saved = get_option(self::OPTION, []);
        return wp_parse_args(is_array($saved) ? $saved : [], self::defaults());
    }

    /* ---------- Pantalla de administración ---------- */

    public static function menu()
    {
        add_menu_page(
            'Clinic Data',
            'Clinic Data',
            'manage_options',
            self::PAGE,
            [__CLASS__, 'render'],
            'dashicons-location',
            3
        );
    }

    public static function register()
    {
        register_setting(self::GROUP, self::OPTION, [
            'type'              => 'array',
            'sanitize_callback' => [__CLASS__, 'sanitize'],
            'default'           => self::defaults(),
        ]);
    }

    public static function sanitize($input)
    {
        $d = self::defaults();
        $old = self::get();
        $in = is_array($input) ? $input : [];

        $text = function ($key, $max = 120) use ($in, $old) {
            $value = isset($in[$key]) && is_string($in[$key]) ? sanitize_text_field($in[$key]) : $old[$key];
            $value = trim(function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max));
            return $value;
        };
        $time = function ($key) use ($in, $old) {
            $value = isset($in[$key]) && is_string($in[$key]) ? sanitize_text_field($in[$key]) : '';
            if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
                return $value;
            }
            add_settings_error(self::OPTION, 'endo562_time_' . $key, 'Opening and closing times must look like 08:30 or 17:00. The previous value was kept.');
            return $old[$key];
        };

        $out = [];
        $out['phone'] = $text('phone', 30);
        $out['hours'] = $text('hours', 80);
        $out['street'] = $text('street', 80);
        $out['city'] = $text('city', 60);
        $out['province'] = $text('province', 30);
        $out['postal'] = $text('postal', 12);
        $out['opens'] = $time('opens');
        $out['closes'] = $time('closes');

        if (strcmp($out['opens'], $out['closes']) >= 0) {
            add_settings_error(self::OPTION, 'endo562_order', 'The opening time must be earlier than the closing time. The previous times were kept.');
            $out['opens'] = $old['opens'];
            $out['closes'] = $old['closes'];
        }

        $email = isset($in['email']) && is_string($in['email']) ? sanitize_email($in['email']) : '';
        if (is_email($email)) {
            $out['email'] = $email;
        } else {
            add_settings_error(self::OPTION, 'endo562_email', 'That email address is not valid. The previous one was kept.');
            $out['email'] = $old['email'];
        }

        // Ningún dato público puede quedar vacío: se usa el valor anterior (o el original).
        foreach (['phone', 'hours', 'street', 'city', 'province', 'postal'] as $key) {
            if ($out[$key] === '') {
                $out[$key] = $old[$key] !== '' ? $old[$key] : $d[$key];
            }
        }

        $pdf = isset($in['referral_pdf_id']) ? absint($in['referral_pdf_id']) : 0;
        $out['referral_pdf_id'] = ($pdf > 0 && get_post_mime_type($pdf) === 'application/pdf') ? $pdf : 0;

        return $out;
    }

    public static function assets($hook)
    {
        if ($hook !== 'toplevel_page_' . self::PAGE) {
            return;
        }
        wp_enqueue_media();
        wp_add_inline_script('jquery-core', <<<'JS'
jQuery(function ($) {
  var frame;
  $('#endo562-pick').on('click', function (e) {
    e.preventDefault();
    frame = frame || wp.media({
      title: 'Select the referral form PDF',
      library: { type: 'application/pdf' },
      multiple: false,
      button: { text: 'Use this PDF' }
    });
    frame.off('select').on('select', function () {
      var file = frame.state().get('selection').first().toJSON();
      $('#endo562-pdf-id').val(file.id);
      $('#endo562-pdf-name').text(file.filename || file.url);
    });
    frame.open();
  });
  $('#endo562-clear').on('click', function (e) {
    e.preventDefault();
    $('#endo562-pdf-id').val(0);
    $('#endo562-pdf-name').text('Using the PDF already on the website');
  });
});
JS
        );
    }

    public static function render()
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        $s = self::get();
        $pdfId = (int) $s['referral_pdf_id'];
        $pdfFile = $pdfId ? (string) get_attached_file($pdfId) : '';
        $pdfName = $pdfFile !== '' ? basename($pdfFile) : 'Using the PDF already on the website';
        $name = self::OPTION;
        ?>
        <div class="wrap">
            <h1>Clinic Data</h1>
            <p>These details appear on every page of the website. After you press <strong>Save</strong>, the website updates by itself in about 1 to 2 minutes.</p>
            <?php if (self::hook_url() === '') : ?>
                <div class="notice notice-warning inline"><p>The automatic website update is not connected yet. Your changes are saved here, but the website will not change until it is rebuilt.</p></div>
            <?php endif; ?>
            <?php settings_errors(); ?>
            <form method="post" action="options.php">
                <?php settings_fields(self::GROUP); ?>
                <table class="form-table" role="presentation">
                    <tr><th scope="row"><label for="endo562-phone">Phone</label></th>
                        <td><input id="endo562-phone" class="regular-text" type="text" name="<?php echo esc_attr($name); ?>[phone]" value="<?php echo esc_attr($s['phone']); ?>" maxlength="30"> <span class="description">Example: (519) 601-3636</span></td></tr>
                    <tr><th scope="row"><label for="endo562-email">Email</label></th>
                        <td><input id="endo562-email" class="regular-text" type="email" name="<?php echo esc_attr($name); ?>[email]" value="<?php echo esc_attr($s['email']); ?>"></td></tr>
                    <tr><th scope="row"><label for="endo562-hours">Hours (as shown on the website)</label></th>
                        <td><input id="endo562-hours" class="regular-text" type="text" name="<?php echo esc_attr($name); ?>[hours]" value="<?php echo esc_attr($s['hours']); ?>" maxlength="80"> <span class="description">Example: Mon - Fri 8:30 am to 5:00 pm</span></td></tr>
                    <tr><th scope="row">Opening and closing time (for Google)</th>
                        <td>
                            <input type="time" name="<?php echo esc_attr($name); ?>[opens]" value="<?php echo esc_attr($s['opens']); ?>"> to
                            <input type="time" name="<?php echo esc_attr($name); ?>[closes]" value="<?php echo esc_attr($s['closes']); ?>">
                            <p class="description">Monday to Friday. Keep these in line with the hours above.</p>
                        </td></tr>
                    <tr><th scope="row"><label for="endo562-street">Street address</label></th>
                        <td><input id="endo562-street" class="regular-text" type="text" name="<?php echo esc_attr($name); ?>[street]" value="<?php echo esc_attr($s['street']); ?>" maxlength="80"></td></tr>
                    <tr><th scope="row"><label for="endo562-city">City</label></th>
                        <td><input id="endo562-city" class="regular-text" type="text" name="<?php echo esc_attr($name); ?>[city]" value="<?php echo esc_attr($s['city']); ?>" maxlength="60"></td></tr>
                    <tr><th scope="row"><label for="endo562-province">Province</label></th>
                        <td><input id="endo562-province" class="small-text" type="text" name="<?php echo esc_attr($name); ?>[province]" value="<?php echo esc_attr($s['province']); ?>" maxlength="30"> <span class="description">Two letters, for example ON</span></td></tr>
                    <tr><th scope="row"><label for="endo562-postal">Postal code</label></th>
                        <td><input id="endo562-postal" class="small-text" type="text" name="<?php echo esc_attr($name); ?>[postal]" value="<?php echo esc_attr($s['postal']); ?>" maxlength="12"></td></tr>
                    <tr><th scope="row">Patient referral form (PDF)</th>
                        <td>
                            <input id="endo562-pdf-id" type="hidden" name="<?php echo esc_attr($name); ?>[referral_pdf_id]" value="<?php echo esc_attr((string) $pdfId); ?>">
                            <p><strong id="endo562-pdf-name"><?php echo esc_html($pdfName); ?></strong></p>
                            <button type="button" class="button" id="endo562-pick">Choose or upload a PDF</button>
                            <button type="button" class="button-link" id="endo562-clear">Go back to the original PDF</button>
                            <p class="description">The new PDF replaces the download on the Referrals page after the website updates.</p>
                        </td></tr>
                </table>
                <?php submit_button('Save'); ?>
            </form>
        </div>
        <?php
    }

    /* ---------- API pública (solo datos públicos de la clínica) ---------- */

    public static function routes()
    {
        register_rest_route('endo562/v1', '/settings', [
            'methods'             => 'GET',
            'callback'            => [__CLASS__, 'rest_settings'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function rest_settings()
    {
        $s = self::get();
        $pdfId = (int) $s['referral_pdf_id'];
        $pdfUrl = $pdfId ? wp_get_attachment_url($pdfId) : '';

        $plain = function ($value) {
            return wp_specialchars_decode((string) $value, ENT_QUOTES);
        };
        $response = rest_ensure_response([
            'phone'        => $plain($s['phone']),
            'email'        => $s['email'],
            'hours'        => $plain($s['hours']),
            'opens'        => $s['opens'],
            'closes'       => $s['closes'],
            'street'       => $plain($s['street']),
            'city'         => $plain($s['city']),
            'province'     => $plain($s['province']),
            'postal'       => $plain($s['postal']),
            'referral_pdf' => $pdfUrl ? $pdfUrl : '',
        ]);
        $response->header('Cache-Control', 'no-store');
        return $response;
    }

    /* ---------- Reconstruir el sitio en Vercel al guardar ---------- */

    public static function deploy()
    {
        $url = self::hook_url();
        if ($url === '') {
            return;
        }
        wp_remote_post($url, ['timeout' => 5, 'blocking' => false]);
    }

    /** Deploy Hook de Vercel válido, o '' (solo se acepta api.vercel.com, nunca una URL arbitraria). */
    private static function hook_url()
    {
        if (!defined('ENDO562_DEPLOY_HOOK') || !is_string(ENDO562_DEPLOY_HOOK)) {
            return '';
        }
        return strpos(ENDO562_DEPLOY_HOOK, 'https://api.vercel.com/') === 0 ? ENDO562_DEPLOY_HOOK : '';
    }
}

Endo562_Clinic_Data::init();

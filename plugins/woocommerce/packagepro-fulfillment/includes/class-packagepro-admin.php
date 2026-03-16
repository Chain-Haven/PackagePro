<?php
defined('ABSPATH') || exit;

class PackagePro_Admin {

    public static function init() {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
        add_action('wp_ajax_packagepro_regenerate_code', [__CLASS__, 'ajax_regenerate_code']);
        add_action('wp_ajax_packagepro_resend_email', [__CLASS__, 'ajax_resend_email']);
    }

    public static function add_menu() {
        add_submenu_page(
            'woocommerce',
            __('PackagePro Fulfillment', 'packagepro-fulfillment'),
            __('PackagePro', 'packagepro-fulfillment'),
            'manage_woocommerce',
            'packagepro-settings',
            [__CLASS__, 'render_settings_page']
        );
    }

    public static function register_settings() {
        register_setting('packagepro_settings', 'packagepro_backend_url');
        register_setting('packagepro_settings', 'packagepro_pairing_code');
        register_setting('packagepro_settings', 'packagepro_paired');
        register_setting('packagepro_settings', 'packagepro_store_id');
        register_setting('packagepro_settings', 'packagepro_email_enabled');
    }

    public static function enqueue_assets($hook) {
        if ($hook !== 'woocommerce_page_packagepro-settings') {
            return;
        }
        wp_enqueue_style('packagepro-admin', PACKAGEPRO_PLUGIN_URL . 'assets/admin.css', [], PACKAGEPRO_VERSION);
        wp_enqueue_script('packagepro-admin', PACKAGEPRO_PLUGIN_URL . 'assets/admin.js', ['jquery'], PACKAGEPRO_VERSION, true);
        wp_localize_script('packagepro-admin', 'packageproAdmin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('packagepro_admin'),
            'rest_url' => rest_url('packagepro/v1/'),
        ]);
    }

    public static function ajax_regenerate_code() {
        check_ajax_referer('packagepro_admin', 'nonce');
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error();
        }
        $code = strtoupper(wp_generate_password(8, false, false));
        update_option('packagepro_pairing_code', $code);
        wp_send_json_success(['code' => $code]);
    }

    public static function ajax_resend_email() {
        check_ajax_referer('packagepro_admin', 'nonce');
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error();
        }
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error();
        }
        $order = wc_get_order($order_id);
        if (!$order) {
            wp_send_json_error();
        }
        $backend_url = get_option('packagepro_backend_url', '');
        $video_id = $order->get_meta('_packagepro_video_id');
        if (!$backend_url || !$video_id) {
            wp_send_json_error();
        }
        $viewer_url = rtrim($backend_url, '/') . '/view/' . $video_id;
        WC()->mailer();
        if (!class_exists('PackagePro_Email_Packing_Video')) {
            wp_send_json_error(['message' => __('Email system not available', 'packagepro-fulfillment')]);
        }
        $email = new PackagePro_Email_Packing_Video();
        $email->trigger($order_id, $order, $viewer_url);
        wp_send_json_success();
    }

    public static function render_settings_page() {
        $is_paired = get_option('packagepro_paired', false);
        $pairing_code = get_option('packagepro_pairing_code', '');
        $backend_url = get_option('packagepro_backend_url', '');
        $store_id = get_option('packagepro_store_id', '');
        $webhook_secret = get_option('packagepro_webhook_secret', '');

        if (!$pairing_code && !$is_paired) {
            $pairing_code = strtoupper(wp_generate_password(8, false, false));
            update_option('packagepro_pairing_code', $pairing_code);
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('PackagePro Fulfillment', 'packagepro-fulfillment'); ?></h1>
            
            <?php if (!$is_paired): ?>
            <div class="packagepro-pairing-section">
                <h2><?php esc_html_e('Connect to PackagePro Cloud', 'packagepro-fulfillment'); ?></h2>
                <p><?php esc_html_e('Enter this pairing code in your PackagePro admin portal to connect this store:', 'packagepro-fulfillment'); ?></p>
                <div class="packagepro-pairing-code">
                    <code style="font-size: 2em; padding: 10px 20px; background: #f0f0f0; border-radius: 5px;">
                        <?php echo esc_html($pairing_code); ?>
                    </code>
                </div>
                <p>
                    <button type="button" class="button" id="packagepro-regenerate-code">
                        <?php esc_html_e('Generate New Code', 'packagepro-fulfillment'); ?>
                    </button>
                </p>
            </div>
            <?php else: ?>
            <div class="packagepro-connected-section">
                <h2><?php esc_html_e('Connection Status', 'packagepro-fulfillment'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th><?php esc_html_e('Status', 'packagepro-fulfillment'); ?></th>
                        <td><span class="dashicons dashicons-yes-alt" style="color: green;"></span> <?php esc_html_e('Connected', 'packagepro-fulfillment'); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Backend URL', 'packagepro-fulfillment'); ?></th>
                        <td><?php echo esc_html($backend_url); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Store ID', 'packagepro-fulfillment'); ?></th>
                        <td><code><?php echo esc_html($store_id); ?></code></td>
                    </tr>
                </table>
            </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php settings_fields('packagepro_settings'); ?>
                <h2><?php esc_html_e('Settings', 'packagepro-fulfillment'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th><?php esc_html_e('Backend URL', 'packagepro-fulfillment'); ?></th>
                        <td>
                            <input type="url" name="packagepro_backend_url" value="<?php echo esc_attr($backend_url); ?>" class="regular-text" />
                            <p class="description"><?php esc_html_e('URL of your PackagePro cloud backend', 'packagepro-fulfillment'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Enable Customer Emails', 'packagepro-fulfillment'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="packagepro_email_enabled" value="1" <?php checked(get_option('packagepro_email_enabled', 1)); ?> />
                                <?php esc_html_e('Send packing video email to customers when ready', 'packagepro-fulfillment'); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <h2><?php esc_html_e('Health Check', 'packagepro-fulfillment'); ?></h2>
            <div id="packagepro-health-status">
                <button type="button" class="button button-secondary" id="packagepro-health-check">
                    <?php esc_html_e('Run Health Check', 'packagepro-fulfillment'); ?>
                </button>
                <div id="packagepro-health-results"></div>
            </div>
        </div>
        <?php
    }
}

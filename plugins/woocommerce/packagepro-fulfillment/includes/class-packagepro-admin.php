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
        register_setting('packagepro_settings', 'packagepro_email_enabled');
    }

    public static function enqueue_assets($hook) {
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        $is_settings = $hook === 'woocommerce_page_packagepro-settings';
        $is_order_screen = $screen && (
            $screen->id === 'shop_order'
            || $screen->id === 'woocommerce_page_wc-orders'
            || (function_exists('wc_get_page_screen_id') && $screen->id === wc_get_page_screen_id('shop-order'))
        );

        if (!$is_settings && !$is_order_screen) {
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
        update_option('packagepro_pairing_code_created_at', time());
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
        $viewer_url = $order->get_meta('_packagepro_viewer_url');
        if (!$viewer_url) {
            wp_send_json_error();
        }
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
        $last_webhook_error = get_option('packagepro_last_webhook_error', '');
        $last_webhook_attempt_at = get_option('packagepro_last_webhook_attempt_at', '');
        $last_sync_error = get_option('packagepro_last_sync_error', '');
        $last_sync_attempt_at = get_option('packagepro_last_sync_attempt_at', '');

        if (!$pairing_code && !$is_paired) {
            $pairing_code = strtoupper(wp_generate_password(8, false, false));
            update_option('packagepro_pairing_code', $pairing_code);
            update_option('packagepro_pairing_code_created_at', time());
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('PackagePro Fulfillment', 'packagepro-fulfillment'); ?></h1>

            <?php if (!$is_paired): ?>
            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <h2 style="margin-top: 0;"><?php esc_html_e('Connect to PackagePro', 'packagepro-fulfillment'); ?></h2>
                <p><?php esc_html_e('Use this pairing code in the PackagePro admin dashboard or desktop app to connect this store:', 'packagepro-fulfillment'); ?></p>

                <div class="packagepro-pairing-code" style="background: #f0f0f1; border-radius: 8px; padding: 24px; text-align: center; margin: 16px 0;">
                    <div style="font-size: 2.5em; font-family: monospace; font-weight: bold; letter-spacing: 0.3em; color: #2271b1;">
                        <code><?php echo esc_html($pairing_code); ?></code>
                    </div>
                    <p style="margin: 12px 0 0; color: #646970; font-size: 13px;">
                        <?php esc_html_e('Enter this code in the "Pair Store" step on packageprotectpro.com or the desktop app', 'packagepro-fulfillment'); ?>
                    </p>
                </div>

                <p style="margin-top: 16px;">
                    <button type="button" class="button" id="packagepro-regenerate-code">
                        <?php esc_html_e('Generate New Code', 'packagepro-fulfillment'); ?>
                    </button>
                </p>

                <div style="margin-top: 20px; padding: 16px; background: #fff8e5; border-left: 4px solid #dba617; border-radius: 2px;">
                    <strong><?php esc_html_e('Setup steps:', 'packagepro-fulfillment'); ?></strong>
                    <ol style="margin: 8px 0 0; padding-left: 20px;">
                        <li><?php esc_html_e('Create an account at packageprotectpro.com', 'packagepro-fulfillment'); ?></li>
                        <li><?php esc_html_e('Add this store in the admin dashboard or desktop app', 'packagepro-fulfillment'); ?></li>
                        <li><?php esc_html_e('Enter the pairing code above when prompted', 'packagepro-fulfillment'); ?></li>
                        <li><?php esc_html_e('This page will show "Connected" once pairing completes', 'packagepro-fulfillment'); ?></li>
                    </ol>
                </div>
            </div>
            <?php else: ?>
            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <h2 style="margin-top: 0;"><?php esc_html_e('Connection Status', 'packagepro-fulfillment'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th><?php esc_html_e('Status', 'packagepro-fulfillment'); ?></th>
                        <td><span class="dashicons dashicons-yes-alt" style="color: #00a32a;"></span> <?php esc_html_e('Connected', 'packagepro-fulfillment'); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Cloud Backend', 'packagepro-fulfillment'); ?></th>
                        <td><code><?php echo esc_html($backend_url); ?></code></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Store ID', 'packagepro-fulfillment'); ?></th>
                        <td><code><?php echo esc_html($store_id); ?></code></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Last webhook attempt', 'packagepro-fulfillment'); ?></th>
                        <td><?php echo esc_html($last_webhook_attempt_at ?: 'Never'); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Last reconcile attempt', 'packagepro-fulfillment'); ?></th>
                        <td><?php echo esc_html($last_sync_attempt_at ?: 'Never'); ?></td>
                    </tr>
                </table>
                <?php if ($last_webhook_error || $last_sync_error): ?>
                <div style="margin-top: 16px; padding: 12px; background: #fcf0f1; border-left: 4px solid #d63638;">
                    <?php if ($last_webhook_error): ?>
                    <p><strong><?php esc_html_e('Webhook error:', 'packagepro-fulfillment'); ?></strong> <?php echo esc_html($last_webhook_error); ?></p>
                    <?php endif; ?>
                    <?php if ($last_sync_error): ?>
                    <p><strong><?php esc_html_e('Reconcile error:', 'packagepro-fulfillment'); ?></strong> <?php echo esc_html($last_sync_error); ?></p>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
            <?php endif; ?>

            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <form method="post" action="options.php">
                    <?php settings_fields('packagepro_settings'); ?>
                    <h2 style="margin-top: 0;"><?php esc_html_e('Settings', 'packagepro-fulfillment'); ?></h2>
                    <table class="form-table">
                        <tr>
                            <th><?php esc_html_e('Customer Emails', 'packagepro-fulfillment'); ?></th>
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
            </div>

            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <h2 style="margin-top: 0;"><?php esc_html_e('Health Check', 'packagepro-fulfillment'); ?></h2>
                <button type="button" class="button button-secondary" id="packagepro-health-check">
                    <?php esc_html_e('Run Health Check', 'packagepro-fulfillment'); ?>
                </button>
                <div id="packagepro-health-results"></div>
            </div>
        </div>
        <?php
    }
}

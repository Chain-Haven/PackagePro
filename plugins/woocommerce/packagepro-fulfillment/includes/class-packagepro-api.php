<?php
defined('ABSPATH') || exit;

class PackagePro_API {

    public static function init() {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function register_routes() {
        $namespace = 'packagepro/v1';

        register_rest_route($namespace, '/pair', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'handle_pair'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($namespace, '/attach-video', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'handle_attach_video'],
            'permission_callback' => [__CLASS__, 'verify_backend_signature'],
        ]);

        register_rest_route($namespace, '/send-email', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'handle_send_email'],
            'permission_callback' => [__CLASS__, 'verify_backend_signature'],
        ]);

        register_rest_route($namespace, '/health', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'handle_health'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function verify_backend_signature($request) {
        $signature = $request->get_header('X-PackagePro-Signature');
        $timestamp = $request->get_header('X-PackagePro-Timestamp');
        $body = $request->get_body();
        $secret = get_option('packagepro_webhook_secret', '');

        if (!$signature || !$timestamp || !$secret) {
            return new WP_Error('unauthorized', 'Missing signature', ['status' => 401]);
        }

        // Reject if timestamp is older than 5 minutes
        if (abs(time() - intval($timestamp)) > 300) {
            return new WP_Error('unauthorized', 'Request expired', ['status' => 401]);
        }

        $payload = $timestamp . '.' . $body;
        $expected = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) {
            return new WP_Error('unauthorized', 'Invalid signature', ['status' => 401]);
        }

        return true;
    }

    public static function handle_pair($request) {
        $pairing_code = sanitize_text_field($request->get_param('pairing_code'));
        $backend_url = esc_url_raw($request->get_param('backend_url'));
        $store_id = sanitize_text_field($request->get_param('store_id'));

        $stored_code = get_option('packagepro_pairing_code', '');

        if (!$stored_code || strtoupper($pairing_code) !== strtoupper($stored_code)) {
            return new WP_Error('invalid_code', 'Invalid pairing code', ['status' => 400]);
        }

        // Generate WooCommerce API credentials for the backend
        $user_id = get_current_user_id() ?: 1;
        
        global $wpdb;
        $consumer_key = 'ck_' . wc_rand_hash();
        $consumer_secret = 'cs_' . wc_rand_hash();

        $wpdb->insert(
            $wpdb->prefix . 'woocommerce_api_keys',
            [
                'user_id' => $user_id,
                'description' => 'PackagePro Cloud Backend',
                'permissions' => 'read_write',
                'consumer_key' => wc_api_hash($consumer_key),
                'consumer_secret' => $consumer_secret,
                'truncated_key' => substr($consumer_key, -7),
            ],
            ['%d', '%s', '%s', '%s', '%s', '%s']
        );

        // Save pairing state
        update_option('packagepro_paired', true);
        update_option('packagepro_backend_url', $backend_url);
        update_option('packagepro_store_id', $store_id);
        delete_option('packagepro_pairing_code');

        $site_url = get_site_url();
        $store_name = get_bloginfo('name');

        return rest_ensure_response([
            'success' => true,
            'consumer_key' => $consumer_key,
            'consumer_secret' => $consumer_secret,
            'store_url' => $site_url,
            'store_name' => $store_name,
            'webhook_secret' => get_option('packagepro_webhook_secret'),
            'wc_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
        ]);
    }

    public static function handle_attach_video($request) {
        $order_id = intval($request->get_param('woo_order_id'));
        $video_id = sanitize_text_field($request->get_param('video_id'));
        $video_status = sanitize_text_field($request->get_param('video_status'));
        $station_name = sanitize_text_field($request->get_param('station_name'));
        $recorded_at = sanitize_text_field($request->get_param('recorded_at'));
        $viewer_token_hash = sanitize_text_field($request->get_param('viewer_token_hash'));

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('not_found', 'Order not found', ['status' => 404]);
        }

        $order->update_meta_data('_packagepro_video_id', $video_id);
        $order->update_meta_data('_packagepro_video_status', $video_status);
        $order->update_meta_data('_packagepro_station_name', $station_name);
        $order->update_meta_data('_packagepro_recorded_at', $recorded_at);
        $order->update_meta_data('_packagepro_viewer_token', $viewer_token_hash);
        $order->save();

        $order->add_order_note(
            sprintf(
                __('PackagePro: Packing video attached (Station: %s, Video ID: %s)', 'packagepro-fulfillment'),
                $station_name,
                $video_id
            )
        );

        return rest_ensure_response(['success' => true]);
    }

    public static function handle_send_email($request) {
        $order_id = intval($request->get_param('woo_order_id'));
        $viewer_url = esc_url_raw($request->get_param('viewer_url'));

        if (!get_option('packagepro_email_enabled', true)) {
            return rest_ensure_response(['success' => false, 'reason' => 'emails_disabled']);
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('not_found', 'Order not found', ['status' => 404]);
        }

        $mailer = WC()->mailer();
        $email = new PackagePro_Email_Packing_Video();
        $email->trigger($order_id, $order, $viewer_url);

        return rest_ensure_response(['success' => true]);
    }

    public static function handle_health($request) {
        $is_paired = get_option('packagepro_paired', false);
        $backend_url = get_option('packagepro_backend_url', '');
        
        $health = [
            'plugin_version' => PACKAGEPRO_VERSION,
            'wc_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
            'wp_version' => get_bloginfo('version'),
            'php_version' => phpversion(),
            'paired' => (bool) $is_paired,
            'hpos_enabled' => class_exists('Automattic\WooCommerce\Utilities\OrderUtil')
                && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled(),
            'timestamp' => current_time('c'),
        ];

        if ($is_paired && $backend_url) {
            $response = wp_remote_get($backend_url . '/api/health', ['timeout' => 5]);
            $health['backend_reachable'] = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
        }

        return rest_ensure_response($health);
    }
}

<?php
defined('ABSPATH') || exit;

class PackagePro_API {
    private const PAIRING_CODE_TTL_SECONDS = 900;
    private const PAIRING_RATE_LIMIT = 20;
    private const PAIRING_CODE_HASH_OPTION = 'packagepro_pairing_code_hash';
    private const PAIRING_CODE_CREATED_AT_OPTION = 'packagepro_pairing_code_created_at';
    private const PACKAGEPRO_API_KEY_OPTION = 'packagepro_wc_api_key_id';

    private static function log($message) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[PackagePro] ' . $message);
        }
    }

    private static function get_client_ip() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? 'unknown');
        if (strpos($ip, ',') !== false) {
            $parts = explode(',', $ip);
            $ip = trim($parts[0]);
        }
        return sanitize_text_field($ip);
    }

    private static function get_pairing_rate_limit_keys($ip, $store_id) {
        return [
            'packagepro_pairing_ip_' . md5((string) $ip),
            'packagepro_pairing_store_' . md5((string) $store_id),
        ];
    }

    private static function is_pairing_rate_limited($ip, $store_id) {
        foreach (self::get_pairing_rate_limit_keys($ip, $store_id) as $key) {
            $attempts = get_transient($key);
            if (is_array($attempts) && (($attempts['count'] ?? 0) >= self::PAIRING_RATE_LIMIT)) {
                return true;
            }
        }
        return false;
    }

    private static function record_pairing_attempt($ip, $store_id) {
        foreach (self::get_pairing_rate_limit_keys($ip, $store_id) as $key) {
            $attempts = get_transient($key);
            if (!is_array($attempts)) {
                $attempts = ['count' => 0, 'first' => time()];
            }
            $attempts['count'] = intval($attempts['count']) + 1;
            set_transient($key, $attempts, HOUR_IN_SECONDS);
        }
    }

    private static function validate_backend_url($backend_url) {
        $parts = wp_parse_url($backend_url);
        if (!$parts || empty($parts['host']) || empty($parts['scheme'])) {
            return false;
        }

        $host = strtolower($parts['host']);
        if ($parts['scheme'] === 'http') {
            return in_array($host, ['localhost', '127.0.0.1'], true);
        }

        return $parts['scheme'] === 'https';
    }

    private static function get_pairing_owner_user_id() {
        $users = get_users([
            'role__in' => ['administrator', 'shop_manager'],
            'number' => 1,
            'fields' => 'ID',
        ]);

        return !empty($users) ? intval($users[0]) : 0;
    }

    public static function issue_pairing_code() {
        $code = strtoupper(wp_generate_password(8, false, false));
        update_option(self::PAIRING_CODE_HASH_OPTION, wp_hash_password($code));
        update_option(self::PAIRING_CODE_CREATED_AT_OPTION, time());
        delete_option('packagepro_pairing_code');

        return [
            'code' => $code,
            'created_at' => self::get_pairing_code_created_at(),
            'expires_at' => self::get_pairing_code_expires_at(),
        ];
    }

    public static function get_pairing_code_created_at() {
        return intval(get_option(self::PAIRING_CODE_CREATED_AT_OPTION, 0));
    }

    public static function get_pairing_code_expires_at() {
        $created_at = self::get_pairing_code_created_at();
        return $created_at > 0 ? $created_at + self::PAIRING_CODE_TTL_SECONDS : 0;
    }

    public static function is_pairing_code_expired() {
        $expires_at = self::get_pairing_code_expires_at();
        return !$expires_at || time() >= $expires_at;
    }

    public static function clear_pairing_code() {
        delete_option(self::PAIRING_CODE_HASH_OPTION);
        delete_option(self::PAIRING_CODE_CREATED_AT_OPTION);
        delete_option('packagepro_pairing_code');
    }

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
            'permission_callback' => function () {
                return current_user_can('manage_woocommerce');
            },
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
        $client_ip = self::get_client_ip();
        $pairing_code = sanitize_text_field($request->get_param('pairing_code'));
        $backend_url = esc_url_raw($request->get_param('backend_url'));
        $store_id = sanitize_text_field($request->get_param('store_id'));

        if (self::is_pairing_rate_limited($client_ip, $store_id ?: 'unknown')) {
            return new WP_Error('rate_limited', __('Too many pairing attempts. Please wait and try again.', 'packagepro-fulfillment'), ['status' => 429]);
        }

        if (!$pairing_code || !$backend_url || !$store_id) {
            self::record_pairing_attempt($client_ip, $store_id ?: 'unknown');
            return new WP_Error('missing_params', __('Missing required parameters', 'packagepro-fulfillment'), ['status' => 400]);
        }

        if (!self::validate_backend_url($backend_url)) {
            self::record_pairing_attempt($client_ip, $store_id);
            return new WP_Error('invalid_backend', __('Invalid backend URL', 'packagepro-fulfillment'), ['status' => 400]);
        }

        $stored_code_hash = get_option(self::PAIRING_CODE_HASH_OPTION, '');
        $created_at = self::get_pairing_code_created_at();

        if (
            !$stored_code_hash
            || !$created_at
            || self::is_pairing_code_expired()
            || !wp_check_password(strtoupper($pairing_code), $stored_code_hash)
        ) {
            self::record_pairing_attempt($client_ip, $store_id);
            return new WP_Error('invalid_code', __('Invalid pairing code', 'packagepro-fulfillment'), ['status' => 400]);
        }

        // Generate WooCommerce API credentials for the backend
        $user_id = self::get_pairing_owner_user_id();
        if (!$user_id) {
            return new WP_Error('no_owner', __('Could not find an administrator to own the API key.', 'packagepro-fulfillment'), ['status' => 500]);
        }
        
        global $wpdb;
        $consumer_key = 'ck_' . wp_generate_password(40, false);
        $consumer_secret = 'cs_' . bin2hex(random_bytes(20));

        $existing_key_id = intval(get_option(self::PACKAGEPRO_API_KEY_OPTION, 0));
        if ($existing_key_id > 0) {
            $wpdb->delete(
                $wpdb->prefix . 'woocommerce_api_keys',
                ['key_id' => $existing_key_id],
                ['%d']
            );
        }

        $wpdb->delete(
            $wpdb->prefix . 'woocommerce_api_keys',
            [
                'user_id' => $user_id,
                'description' => 'PackagePro Cloud Backend',
            ],
            ['%d', '%s']
        );

        $hashed_key = function_exists('wc_api_hash')
            ? wc_api_hash($consumer_key)
            : hash_hmac('sha256', $consumer_key, 'wc-api');

        $inserted = $wpdb->insert(
            $wpdb->prefix . 'woocommerce_api_keys',
            [
                'user_id' => $user_id,
                'description' => 'PackagePro Cloud Backend',
                'permissions' => 'read',
                'consumer_key' => $hashed_key,
                'consumer_secret' => $consumer_secret,
                'truncated_key' => substr($consumer_key, -7),
            ],
            ['%d', '%s', '%s', '%s', '%s', '%s']
        );

        if (!$inserted) {
            return new WP_Error('api_key_insert_failed', __('Failed to create WooCommerce API key.', 'packagepro-fulfillment'), ['status' => 500]);
        }

        update_option(self::PACKAGEPRO_API_KEY_OPTION, intval($wpdb->insert_id));

        // Save pairing state
        update_option('packagepro_paired', true);
        update_option('packagepro_backend_url', $backend_url);
        update_option('packagepro_store_id', $store_id);
        self::clear_pairing_code();

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
        $viewer_url = esc_url_raw($request->get_param('viewer_url'));

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('not_found', 'Order not found', ['status' => 404]);
        }

        $order->update_meta_data('_packagepro_video_id', $video_id);
        $order->update_meta_data('_packagepro_video_status', $video_status);
        $order->update_meta_data('_packagepro_station_name', $station_name);
        $order->update_meta_data('_packagepro_recorded_at', $recorded_at);
        $order->update_meta_data('_packagepro_viewer_token', $viewer_token_hash);
        if ($viewer_url) {
            $order->update_meta_data('_packagepro_viewer_url', $viewer_url);
        }
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

        WC()->mailer();
        if (!class_exists('PackagePro_Email_Packing_Video')) {
            return new WP_Error('email_unavailable', __('Email system not available', 'packagepro-fulfillment'), ['status' => 500]);
        }
        $email = new PackagePro_Email_Packing_Video();
        $email->trigger($order_id, $order, $viewer_url);

        return rest_ensure_response(['success' => true]);
    }

    public static function handle_health($request) {
        $is_paired = get_option('packagepro_paired', false);
        $backend_url = get_option('packagepro_backend_url', '');

        $hpos_enabled = false;
        try {
            if (
                class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
                && method_exists('\Automattic\WooCommerce\Utilities\OrderUtil', 'custom_orders_table_usage_is_enabled')
            ) {
                $hpos_enabled = \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
            }
        } catch (\Exception $e) {
            // Older WC without HPOS support
        }

        $health = [
            'plugin_version' => PACKAGEPRO_VERSION,
            'paired' => (bool) $is_paired,
            'hpos_enabled' => $hpos_enabled,
            'timestamp' => current_time('c'),
        ];

        if ($is_paired && $backend_url) {
            $response = wp_remote_get($backend_url . '/api/health', ['timeout' => 5]);
            $health['backend_reachable'] = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
        }

        return rest_ensure_response($health);
    }
}

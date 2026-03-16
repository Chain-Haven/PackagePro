<?php
defined('ABSPATH') || exit;

class PackagePro_Webhooks {
    private static function log_webhook_result($message) {
        update_option('packagepro_last_webhook_error', $message);
        update_option('packagepro_last_webhook_attempt_at', current_time('c'));
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[PackagePro] ' . $message);
        }
    }

    public static function init() {
        add_action('woocommerce_new_order', [__CLASS__, 'on_order_created'], 10, 2);
        add_action('woocommerce_update_order', [__CLASS__, 'on_order_updated'], 10, 2);
        add_action('woocommerce_order_status_changed', [__CLASS__, 'on_order_status_changed'], 10, 4);
    }

    public static function on_order_created($order_id, $order = null) {
        self::send_webhook('order.created', $order_id, $order);
    }

    public static function on_order_updated($order_id, $order = null) {
        self::send_webhook('order.updated', $order_id, $order);
    }

    public static function on_order_status_changed($order_id, $from, $to, $order) {
        self::send_webhook('order.status_changed', $order_id, $order, [
            'from_status' => $from,
            'to_status' => $to,
        ]);
    }

    private static function send_webhook($topic, $order_id, $order, $extra = []) {
        $backend_url = get_option('packagepro_backend_url');
        $store_id = get_option('packagepro_store_id');
        $secret = get_option('packagepro_webhook_secret');

        if (!$backend_url || !$store_id || !$secret) {
            return;
        }

        if (!$order instanceof WC_Order) {
            $order = wc_get_order($order_id);
        }
        if (!$order) return;

        $payload = array_merge([
            'topic' => $topic,
            'store_id' => $store_id,
            'order' => [
                'id' => $order->get_id(),
                'number' => $order->get_order_number(),
                'order_key' => $order->get_order_key(),
                'status' => $order->get_status(),
                'total' => $order->get_total(),
                'billing_email' => $order->get_billing_email(),
                'billing_first_name' => $order->get_billing_first_name(),
                'billing_last_name' => $order->get_billing_last_name(),
                'shipping' => [
                    'first_name' => $order->get_shipping_first_name(),
                    'last_name' => $order->get_shipping_last_name(),
                    'address_1' => $order->get_shipping_address_1(),
                    'address_2' => $order->get_shipping_address_2(),
                    'city' => $order->get_shipping_city(),
                    'state' => $order->get_shipping_state(),
                    'postcode' => $order->get_shipping_postcode(),
                    'country' => $order->get_shipping_country(),
                ],
                'line_items' => array_map(function ($item) {
                    $product = $item->get_product();
                    return [
                        'id' => $item->get_id(),
                        'name' => $item->get_name(),
                        'sku' => ($product instanceof WC_Product) ? $product->get_sku() : '',
                        'quantity' => $item->get_quantity(),
                        'total' => $item->get_total(),
                    ];
                }, $order->get_items()),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
            ],
        ], $extra);

        $body = wp_json_encode($payload);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, $secret);

        $response = wp_remote_post($backend_url . '/api/webhooks/woo/' . $store_id, [
            'body' => $body,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-PackagePro-Signature' => $signature,
                'X-PackagePro-Timestamp' => (string) $timestamp,
                'X-PackagePro-Topic' => $topic,
            ],
            'timeout' => 15,
            'blocking' => false,
        ]);

        if (is_wp_error($response)) {
            self::log_webhook_result('Webhook delivery failed: ' . $response->get_error_message());
        } else {
            update_option('packagepro_last_webhook_error', '');
            update_option('packagepro_last_webhook_attempt_at', current_time('c'));
        }
    }
}

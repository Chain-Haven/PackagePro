<?php
defined('ABSPATH') || exit;

class PackagePro_Sync {

    public static function init() {
        add_action('packagepro_reconciliation_sync', [__CLASS__, 'run_reconciliation']);
    }

    public static function run_reconciliation() {
        $backend_url = get_option('packagepro_backend_url');
        $store_id = get_option('packagepro_store_id');
        $secret = get_option('packagepro_webhook_secret');

        if (!$backend_url || !$store_id || !$secret) {
            return;
        }

        $args = [
            'status' => ['processing', 'on-hold', 'pending'],
            'limit' => 50,
            'orderby' => 'date',
            'order' => 'DESC',
        ];

        $orders = wc_get_orders($args);

        $order_data = array_map(function ($order) {
            return [
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
            ];
        }, $orders);

        $body = wp_json_encode([
            'store_id' => $store_id,
            'orders' => $order_data,
        ]);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, $secret);

        wp_remote_post($backend_url . '/api/webhooks/woo/' . $store_id . '/reconcile', [
            'body' => $body,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-PackagePro-Signature' => $signature,
                'X-PackagePro-Timestamp' => (string) $timestamp,
            ],
            'timeout' => 30,
        ]);
    }
}

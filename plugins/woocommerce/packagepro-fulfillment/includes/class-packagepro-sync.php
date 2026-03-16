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
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
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

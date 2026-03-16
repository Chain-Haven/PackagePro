<?php
defined('ABSPATH') || exit;

class PackagePro_Webhook_Queue {
    private const QUEUE_OPTION = 'packagepro_webhook_queue';
    private const DEAD_LETTER_OPTION = 'packagepro_webhook_dead_letters';
    private const PROCESS_HOOK = 'packagepro_process_webhook_queue';
    private const MAX_ATTEMPTS = 5;

    public static function init() {
        add_action(self::PROCESS_HOOK, [__CLASS__, 'process_due_items']);
    }

    public static function enqueue($backend_url, $store_id, $topic, $body) {
        $queue = get_option(self::QUEUE_OPTION, []);
        if (!is_array($queue)) {
            $queue = [];
        }

        $item = [
            'id' => wp_generate_uuid4(),
            'backend_url' => $backend_url,
            'store_id' => $store_id,
            'topic' => $topic,
            'body' => $body,
            'attempts' => 0,
            'created_at' => current_time('c'),
            'last_attempt_at' => null,
            'last_error' => '',
            'next_attempt_at' => time(),
            'idempotency_key' => hash('sha256', $store_id . '|' . $topic . '|' . $body),
        ];

        $queue[$item['id']] = $item;
        update_option(self::QUEUE_OPTION, $queue, false);
        self::schedule_processing(time());

        return $item['id'];
    }

    public static function process_due_items() {
        $queue = get_option(self::QUEUE_OPTION, []);
        if (!is_array($queue) || empty($queue)) {
            return;
        }

        $secret = get_option('packagepro_webhook_secret');
        if (!$secret) {
            return;
        }

        $now = time();
        foreach ($queue as $id => $item) {
            $next_attempt_at = isset($item['next_attempt_at']) ? intval($item['next_attempt_at']) : 0;
            if ($next_attempt_at > $now) {
                continue;
            }

            $result = self::deliver_item($item, $secret);
            if ($result['success']) {
                self::clear_last_webhook_error();
                unset($queue[$id]);
                continue;
            }

            $attempts = isset($item['attempts']) ? intval($item['attempts']) + 1 : 1;
            $item['attempts'] = $attempts;
            $item['last_attempt_at'] = current_time('c');
            $item['last_error'] = $result['error'];

            if ($attempts >= self::MAX_ATTEMPTS) {
                self::move_to_dead_letters($item);
                unset($queue[$id]);
                self::log_webhook_result('Webhook delivery failed permanently: ' . $result['error']);
                continue;
            }

            $item['next_attempt_at'] = $now + self::get_retry_delay($attempts);
            $queue[$id] = $item;
            self::log_webhook_result('Webhook delivery failed: ' . $result['error']);
        }

        update_option(self::QUEUE_OPTION, $queue, false);
        if (!empty($queue)) {
            self::schedule_processing(self::get_next_attempt_timestamp($queue));
        }
    }

    public static function get_stats() {
        $queue = get_option(self::QUEUE_OPTION, []);
        $dead_letters = get_option(self::DEAD_LETTER_OPTION, []);
        $pending = is_array($queue) ? count($queue) : 0;
        $dead = is_array($dead_letters) ? count($dead_letters) : 0;
        $next_attempt_at = $pending > 0 ? self::get_next_attempt_timestamp($queue) : null;

        return [
            'pending' => $pending,
            'dead_letters' => $dead,
            'next_attempt_at' => $next_attempt_at ? gmdate('c', $next_attempt_at) : null,
        ];
    }

    private static function deliver_item($item, $secret) {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $item['body'], $secret);
        $response = wp_remote_post($item['backend_url'] . '/api/webhooks/woo/' . $item['store_id'], [
            'body' => $item['body'],
            'headers' => [
                'Content-Type' => 'application/json',
                'X-PackagePro-Signature' => $signature,
                'X-PackagePro-Timestamp' => (string) $timestamp,
                'X-PackagePro-Topic' => $item['topic'],
                'X-PackagePro-Idempotency-Key' => $item['idempotency_key'],
            ],
            'timeout' => 15,
            'blocking' => true,
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message(),
            ];
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 400) {
            return [
                'success' => false,
                'error' => 'HTTP ' . $code,
            ];
        }

        return ['success' => true];
    }

    private static function get_retry_delay($attempts) {
        $delays = [60, 300, 900, 3600, 21600];
        return $delays[min($attempts - 1, count($delays) - 1)];
    }

    private static function get_next_attempt_timestamp($queue) {
        $timestamps = array_map(function ($item) {
            return isset($item['next_attempt_at']) ? intval($item['next_attempt_at']) : time();
        }, $queue);

        return min($timestamps);
    }

    private static function schedule_processing($timestamp) {
        $schedule_at = max(intval($timestamp), time());
        $next_scheduled = wp_next_scheduled(self::PROCESS_HOOK);

        if ($next_scheduled && $next_scheduled <= $schedule_at) {
            return;
        }

        if ($next_scheduled) {
            wp_unschedule_event($next_scheduled, self::PROCESS_HOOK);
        }

        wp_schedule_single_event($schedule_at, self::PROCESS_HOOK);
    }

    private static function move_to_dead_letters($item) {
        $dead_letters = get_option(self::DEAD_LETTER_OPTION, []);
        if (!is_array($dead_letters)) {
            $dead_letters = [];
        }

        $item['dead_lettered_at'] = current_time('c');
        array_unshift($dead_letters, $item);
        $dead_letters = array_slice($dead_letters, 0, 25);
        update_option(self::DEAD_LETTER_OPTION, $dead_letters, false);
    }

    private static function log_webhook_result($message) {
        update_option('packagepro_last_webhook_error', $message);
        update_option('packagepro_last_webhook_attempt_at', current_time('c'));
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[PackagePro] ' . $message);
        }
    }

    private static function clear_last_webhook_error() {
        update_option('packagepro_last_webhook_error', '');
        update_option('packagepro_last_webhook_attempt_at', current_time('c'));
    }
}

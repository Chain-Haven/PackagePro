<?php
defined('ABSPATH') || exit;

class PackagePro_Order {

    public static function init() {
        add_action('add_meta_boxes', [__CLASS__, 'add_order_metabox']);
        add_filter('manage_woocommerce_page_wc-orders_columns', [__CLASS__, 'add_order_column']);
        add_action('manage_woocommerce_page_wc-orders_custom_column', [__CLASS__, 'render_order_column'], 10, 2);
        // Legacy support
        add_filter('manage_edit-shop_order_columns', [__CLASS__, 'add_order_column']);
        add_action('manage_shop_order_posts_custom_column', [__CLASS__, 'render_order_column_legacy'], 10, 2);
    }

    public static function add_order_metabox() {
        $screen = self::get_order_screen();
        
        add_meta_box(
            'packagepro-video-info',
            __('PackagePro Packing Video', 'packagepro-fulfillment'),
            [__CLASS__, 'render_metabox'],
            $screen,
            'side',
            'high'
        );
    }

    private static function get_order_screen() {
        try {
            if (
                class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
                && method_exists('\Automattic\WooCommerce\Utilities\OrderUtil', 'custom_orders_table_usage_is_enabled')
                && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()
            ) {
                return function_exists('wc_get_page_screen_id')
                    ? wc_get_page_screen_id('shop-order')
                    : 'woocommerce_page_wc-orders';
            }
        } catch (\Exception $e) {
            // Fall through to legacy screen ID
        }
        return 'shop_order';
    }

    public static function render_metabox($post_or_order) {
        $order = ($post_or_order instanceof WP_Post)
            ? wc_get_order($post_or_order->ID)
            : $post_or_order;

        if (!$order) {
            echo '<p>' . esc_html__('Order not found.', 'packagepro-fulfillment') . '</p>';
            return;
        }

        $video_id = $order->get_meta('_packagepro_video_id');
        $video_status = $order->get_meta('_packagepro_video_status');
        $station_name = $order->get_meta('_packagepro_station_name');
        $recorded_at = $order->get_meta('_packagepro_recorded_at');
        $viewer_url = $order->get_meta('_packagepro_viewer_url');

        if (!$video_id) {
            echo '<p>' . esc_html__('No packing video recorded yet.', 'packagepro-fulfillment') . '</p>';
            return;
        }

        $status_labels = [
            'ready' => '<span style="color: green;">&#10004; Ready</span>',
            'uploading' => '<span style="color: orange;">&#8635; Uploading</span>',
            'recording' => '<span style="color: blue;">&#9899; Recording</span>',
            'failed' => '<span style="color: red;">&#10008; Failed</span>',
            'deleted' => '<span style="color: gray;">&#128465; Deleted</span>',
        ];
        ?>
        <table style="width: 100%;">
            <tr>
                <td><strong><?php esc_html_e('Status:', 'packagepro-fulfillment'); ?></strong></td>
                <td><?php echo wp_kses_post($status_labels[$video_status] ?? esc_html($video_status)); ?></td>
            </tr>
            <tr>
                <td><strong><?php esc_html_e('Station:', 'packagepro-fulfillment'); ?></strong></td>
                <td><?php echo esc_html($station_name); ?></td>
            </tr>
            <tr>
                <td><strong><?php esc_html_e('Recorded:', 'packagepro-fulfillment'); ?></strong></td>
                <td><?php echo esc_html($recorded_at ? date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($recorded_at)) : '—'); ?></td>
            </tr>
        </table>
        <?php if ($video_status === 'ready'): ?>
        <p style="margin-top: 10px;">
            <?php if ($viewer_url): ?>
            <a href="<?php echo esc_url($viewer_url); ?>" class="button button-primary" target="_blank" rel="noopener noreferrer" style="margin-right: 6px;">
                <?php esc_html_e('View Video', 'packagepro-fulfillment'); ?>
            </a>
            <?php endif; ?>
            <button type="button" class="button packagepro-resend-email" data-order-id="<?php echo esc_attr($order->get_id()); ?>">
                <?php esc_html_e('Resend Customer Email', 'packagepro-fulfillment'); ?>
            </button>
        </p>
        <?php endif;
    }

    public static function add_order_column($columns) {
        $new_columns = [];
        foreach ($columns as $key => $label) {
            $new_columns[$key] = $label;
            if ($key === 'order_status') {
                $new_columns['packagepro_video'] = __('Packing Video', 'packagepro-fulfillment');
            }
        }
        return $new_columns;
    }

    public static function render_order_column($column_name, $order) {
        if ($column_name !== 'packagepro_video') return;
        
        if (is_numeric($order)) {
            $order = wc_get_order($order);
        }
        if (!$order) return;

        $video_status = $order->get_meta('_packagepro_video_status');
        if (!$video_status) {
            echo '—';
            return;
        }

        $icons = [
            'ready' => '&#10004;',
            'uploading' => '&#8635;',
            'recording' => '&#9899;',
            'failed' => '&#10008;',
            'deleted' => '&#128465;',
        ];
        $icon = $icons[$video_status] ?? null;
        if ($icon !== null) {
            echo wp_kses_post($icon);
        } else {
            echo esc_html($video_status);
        }
    }

    public static function render_order_column_legacy($column_name, $post_id) {
        if ($column_name !== 'packagepro_video') return;
        $order = wc_get_order($post_id);
        if ($order) {
            self::render_order_column($column_name, $order);
        }
    }
}

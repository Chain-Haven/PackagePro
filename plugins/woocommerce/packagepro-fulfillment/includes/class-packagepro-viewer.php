<?php
defined('ABSPATH') || exit;

class PackagePro_Viewer {

    public static function init() {
        add_action('woocommerce_order_details_after_order_table', [__CLASS__, 'show_video_link_on_order'], 10, 1);
    }

    public static function show_video_link_on_order($order) {
        $video_status = $order->get_meta('_packagepro_video_status');
        if ($video_status !== 'ready') return;

        $viewer_url = $order->get_meta('_packagepro_viewer_url');
        if (!$viewer_url) return;

        ?>
        <section class="packagepro-video-section" style="margin-top: 20px;">
            <h2><?php esc_html_e('Packing Video', 'packagepro-fulfillment'); ?></h2>
            <p><?php esc_html_e('Watch the video of your order being packed:', 'packagepro-fulfillment'); ?></p>
            <p>
                <a href="<?php echo esc_url($viewer_url); ?>" 
                   class="button" 
                   target="_blank" 
                   rel="noopener noreferrer">
                    <?php esc_html_e('View Packing Video', 'packagepro-fulfillment'); ?>
                </a>
            </p>
        </section>
        <?php
    }
}

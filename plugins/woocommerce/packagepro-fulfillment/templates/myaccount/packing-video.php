<?php
defined('ABSPATH') || exit;
?>
<section class="packagepro-video-section">
    <h2><?php esc_html_e('Packing Video', 'packagepro-fulfillment'); ?></h2>
    <p><?php esc_html_e('A video of your order being packed is available:', 'packagepro-fulfillment'); ?></p>
    <a href="<?php echo esc_url($viewer_url); ?>" class="button" target="_blank">
        <?php esc_html_e('Watch Packing Video', 'packagepro-fulfillment'); ?>
    </a>
</section>

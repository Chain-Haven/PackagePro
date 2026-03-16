<?php
defined('ABSPATH') || exit;

do_action('woocommerce_email_header', $email_heading, $email);
?>

<p><?php
printf(
    esc_html__('Hi %s,', 'packagepro-fulfillment'),
    esc_html($order->get_billing_first_name())
);
?></p>

<p><?php
printf(
    esc_html__('Great news! Your order #%s has been packed and we recorded the process for your peace of mind.', 'packagepro-fulfillment'),
    esc_html($order->get_order_number())
);
?></p>

<p style="text-align: center; margin: 30px 0;">
    <a href="<?php echo esc_url($viewer_url); ?>" 
       style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
        <?php esc_html_e('Watch Your Packing Video', 'packagepro-fulfillment'); ?>
    </a>
</p>

<p style="color: #666; font-size: 13px;">
    <?php esc_html_e('This link is unique to your order and will expire. Do not share it with others.', 'packagepro-fulfillment'); ?>
</p>

<?php
do_action('woocommerce_email_footer', $email);

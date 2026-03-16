<?php
/**
 * Plugin Name: PackagePro Fulfillment
 * Plugin URI: https://packagepro.io
 * Description: Proof-of-packing video capture and fulfillment management for WooCommerce
 * Version: 1.0.0
 * Author: PackagePro
 * Author URI: https://packagepro.io
 * Text Domain: packagepro-fulfillment
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * WC requires at least: 8.0
 * WC tested up to: 9.0
 * License: GPL-2.0+
 */

defined('ABSPATH') || exit;

define('PACKAGEPRO_VERSION', '1.0.0');
define('PACKAGEPRO_PLUGIN_FILE', __FILE__);
define('PACKAGEPRO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PACKAGEPRO_PLUGIN_URL', plugin_dir_url(__FILE__));

// HPOS compatibility declaration
add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

// Check WooCommerce is active
function packagepro_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function () {
            echo '<div class="error"><p><strong>PackagePro Fulfillment</strong> requires WooCommerce to be installed and active.</p></div>';
        });
        return false;
    }
    return true;
}

// Initialize plugin
add_action('plugins_loaded', function () {
    if (!packagepro_check_woocommerce()) {
        return;
    }

    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-admin.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-api.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-webhooks.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-order.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-email.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-sync.php';
    require_once PACKAGEPRO_PLUGIN_DIR . 'includes/class-packagepro-viewer.php';

    PackagePro_Admin::init();
    PackagePro_API::init();
    PackagePro_Webhooks::init();
    PackagePro_Order::init();
    PackagePro_Email::init();
    PackagePro_Sync::init();
    PackagePro_Viewer::init();
});

// Activation hook
register_activation_hook(__FILE__, function () {
    if (!packagepro_check_woocommerce()) {
        return;
    }

    // Generate initial webhook secret
    if (!get_option('packagepro_webhook_secret')) {
        update_option('packagepro_webhook_secret', wp_generate_password(64, true, true));
    }

    // Schedule sync cron
    if (!wp_next_scheduled('packagepro_reconciliation_sync')) {
        wp_schedule_event(time(), 'hourly', 'packagepro_reconciliation_sync');
    }

    flush_rewrite_rules();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('packagepro_reconciliation_sync');
    flush_rewrite_rules();
});

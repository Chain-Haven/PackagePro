<?php
defined('ABSPATH') || exit;

class PackagePro_Email {

    public static function init() {
        add_filter('woocommerce_email_classes', [__CLASS__, 'register_email']);
    }

    public static function register_email($emails) {
        if (class_exists('PackagePro_Email_Packing_Video')) {
            $emails['PackagePro_Email_Packing_Video'] = new PackagePro_Email_Packing_Video();
        }
        return $emails;
    }
}

if (!class_exists('WC_Email')) {
    return;
}

class PackagePro_Email_Packing_Video extends WC_Email {

    public $viewer_url = '';

    public function __construct() {
        $this->id = 'packagepro_packing_video';
        $this->title = __('Packing Video Ready', 'packagepro-fulfillment');
        $this->description = __('This email is sent to customers when their order packing video is ready to view.', 'packagepro-fulfillment');
        $this->template_html = 'emails/packing-video.php';
        $this->template_plain = 'emails/packing-video.php';
        $this->template_base = PACKAGEPRO_PLUGIN_DIR . 'templates/';
        $this->placeholders = [
            '{order_number}' => '',
            '{site_title}' => $this->get_blogname(),
        ];

        $this->customer_email = true;

        parent::__construct();

        $this->recipient = '';
    }

    public function get_default_subject() {
        return __('Your order #{order_number} packing video is ready', 'packagepro-fulfillment');
    }

    public function get_default_heading() {
        return __('Your packing video is ready!', 'packagepro-fulfillment');
    }

    public function trigger($order_id, $order = null, $viewer_url = '') {
        if (!$order) {
            $order = wc_get_order($order_id);
        }
        if (!$order) return;

        $this->object = $order;
        $this->viewer_url = $viewer_url;
        $this->recipient = $order->get_billing_email();
        $this->placeholders['{order_number}'] = $order->get_order_number();

        if (!$this->is_enabled() || !$this->get_recipient()) {
            return;
        }

        $this->send(
            $this->get_recipient(),
            $this->get_subject(),
            $this->get_content(),
            $this->get_headers(),
            $this->get_attachments()
        );
    }

    public function get_content_html() {
        return wc_get_template_html(
            $this->template_html,
            [
                'order' => $this->object,
                'viewer_url' => $this->viewer_url,
                'email_heading' => $this->get_heading(),
                'sent_to_admin' => false,
                'plain_text' => false,
                'email' => $this,
            ],
            '',
            $this->template_base
        );
    }

    public function get_content_plain() {
        return $this->get_content_html();
    }
}

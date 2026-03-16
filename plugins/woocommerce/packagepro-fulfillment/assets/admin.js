(function($) {
    'use strict';

    var pairingCountdownTimer = null;

    function escapeHtml(value) {
        return $('<div>').text(String(value)).html();
    }

    function formatCountdown(totalSeconds) {
        var safeSeconds = Math.max(totalSeconds, 0);
        var minutes = Math.floor(safeSeconds / 60);
        var seconds = safeSeconds % 60;
        return minutes + ':' + String(seconds).padStart(2, '0');
    }

    function startPairingCountdown(expiresAt) {
        var $expiry = $('.packagepro-pairing-expiry');
        if ($expiry.length === 0 || !expiresAt) {
            return;
        }

        if (pairingCountdownTimer) {
            window.clearInterval(pairingCountdownTimer);
        }

        function renderCountdown() {
            var remaining = Math.floor(expiresAt - (Date.now() / 1000));
            if (remaining <= 0) {
                $expiry.text('Code expired. Generate a new code.');
                window.clearInterval(pairingCountdownTimer);
                pairingCountdownTimer = null;
                return;
            }

            $expiry.text('Code expires in ' + formatCountdown(remaining));
        }

        renderCountdown();
        pairingCountdownTimer = window.setInterval(renderCountdown, 1000);
    }

    $('#packagepro-regenerate-code').on('click', function() {
        var $btn = $(this);
        $btn.prop('disabled', true).text('Generating...');
        
        $.ajax({
            url: packageproAdmin.ajax_url,
            method: 'POST',
            data: {
                action: 'packagepro_regenerate_code',
                nonce: packageproAdmin.nonce,
            },
            success: function(response) {
                if (response.success) {
                    $('.packagepro-pairing-code code').text(response.data.code);
                    $('.packagepro-pairing-expiry').attr('data-expires-at', response.data.expires_at || '');
                    startPairingCountdown(Number(response.data.expires_at || 0));
                }
                $btn.prop('disabled', false).text('Generate New Code');
            },
            error: function() {
                $btn.prop('disabled', false).text('Generate New Code');
            }
        });
    });

    $('#packagepro-health-check').on('click', function() {
        var $btn = $(this);
        var $results = $('#packagepro-health-results');
        $btn.prop('disabled', true).text('Checking...');
        $results.html('<p>Running health check...</p>');

        $.get(packageproAdmin.rest_url + 'health', function(data) {
            var html = '<div class="packagepro-health-results">';
            for (var key in data) {
                html += '<div class="health-item"><strong>' + escapeHtml(key) + ':</strong> ' + escapeHtml(data[key]) + '</div>';
            }
            html += '</div>';
            $results.html(html);
            $btn.prop('disabled', false).text('Run Health Check');
        }).fail(function() {
            $results.html('<p style="color: red;">Health check failed.</p>');
            $btn.prop('disabled', false).text('Run Health Check');
        });
    });

    $(document).on('click', '.packagepro-resend-email', function() {
        var orderId = $(this).data('order-id');
        var $btn = $(this);
        $btn.prop('disabled', true).text('Sending...');

        $.post(packageproAdmin.ajax_url, {
            action: 'packagepro_resend_email',
            order_id: orderId,
            nonce: packageproAdmin.nonce,
        }, function(response) {
            if (response.success) {
                $btn.text('Sent!');
            } else {
                $btn.text('Failed').prop('disabled', false);
            }
        });
    });

    startPairingCountdown(Number($('.packagepro-pairing-expiry').data('expires-at') || 0));
})(jQuery);

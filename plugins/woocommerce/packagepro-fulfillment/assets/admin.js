(function($) {
    'use strict';

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
                html += '<div class="health-item"><strong>' + key + ':</strong> ' + data[key] + '</div>';
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
})(jQuery);

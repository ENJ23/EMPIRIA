const http = require('http');

const loginData = JSON.stringify({
    correo: 'admin@empiria.com',
    password: 'Admin123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const makePaymentRequest = (token) => {
    // FETCH EVENTS to get ID
    const getReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/events',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            const events = JSON.parse(data).events;
            if (!events || events.length === 0) {
                console.error('❌ No events found to test payment');
                return;
            }
            const eventId = events[0]._id;
            console.log('✅ Testing with event:', eventId);

            const paymentData = JSON.stringify({
                eventId: eventId,
                quantity: 1,
                ticketType: 'general'
            });

            const payReq = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/payments/create-preference',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': paymentData.length,
                    'x-token': token
                }
            }, (payRes) => {
                console.log(`✅ Payment Status: ${payRes.statusCode}`);
                let pData = '';
                payRes.on('data', c => pData += c);
                payRes.on('end', () => {
                    const response = JSON.parse(pData);
                    console.log('\n=== PAYMENT PREFERENCE RESPONSE ===');
                    console.log('Status:', response.status);
                    console.log('Message:', response.msg);
                    console.log('Preference ID:', response.preference_id);
                    console.log('Payment ID:', response.payment_id);
                    console.log('Init Point (Payment URL):', response.init_point);
                    console.log('\n📱 Open this URL in your browser to make the payment:');
                    console.log(response.init_point);
                    console.log('\nAfter payment, the webhook will create a ticket in the database.');
                });
            });
            payReq.write(paymentData);
            payReq.end();
        });
    });
    getReq.end();
};

const req = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.token) {
            console.log('✅ Login successful, got token');
            console.log('⏳ Creating payment preference...\n');
            makePaymentRequest(json.token);
        } else {
            console.error('❌ Login failed:', json);
        }
    });
});

req.write(loginData);
req.end();

const http = require('http');

const loginData = JSON.stringify({
    correo: 'admin@empiria.com', // Using the admin created earlier
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
    // Need a valid Event ID. Since we seeded the DB, let's just GET events first to find one.
    // Simplifying: I'll hardcode the ID from previous output if possible, but better to fetch it.
    // Let's assume the seeded event ID: '69449bfe366eb90a6d4aae18' (from previous step log) or fetch fresh.

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
                console.error('No events found to test payment');
                return;
            }
            const eventId = events[0]._id;
            console.log('Testing with event:', eventId);

            const paymentData = JSON.stringify({
                eventId: eventId,
                quantity: 1
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
                console.log(`Payment Status: ${payRes.statusCode}`);
                let pData = '';
                payRes.on('data', c => pData += c);
                payRes.on('end', () => console.log('Payment Response:', pData));
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
            console.log('Login successful, got token');
            makePaymentRequest(json.token);
        } else {
            console.error('Login failed:', json);
        }
    });
});

req.write(loginData);
req.end();

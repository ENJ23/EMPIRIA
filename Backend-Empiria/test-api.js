const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response Structure Keys:', Object.keys(json));
            if (json.events) {
                console.log('Number of events:', json.events.length);
                if (json.events.length > 0) {
                    console.log('Sample event keys:', Object.keys(json.events[0]));
                    console.log('Sample event date type:', typeof json.events[0].date);
                    console.log('Sample event _id:', json.events[0]._id);
                }
            } else {
                console.log('Events field missing!');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();

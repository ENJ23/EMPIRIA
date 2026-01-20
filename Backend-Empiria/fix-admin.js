const http = require('http');

// Paso 1: Crear admin2
const data = JSON.stringify({
    correo: 'admin2@empiria.com',
    contraseña: 'Admin123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-admin',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Admin user created successfully!');
            console.log('-----------------------------------');
            console.log('Email:    admin2@empiria.com');
            console.log('Password: Admin123');
            console.log('-----------------------------------');
        } else {
            console.error(`\n❌ Error creating admin (${res.statusCode}):`);
            console.error(responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Request error:', error.message);
    console.error('Ensure the backend server is running on localhost:3000');
});

req.write(data);
req.end();

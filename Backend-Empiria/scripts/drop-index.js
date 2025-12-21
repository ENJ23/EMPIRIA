const mongoose = require('mongoose');
require('dotenv').config(); 

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/empiria';

console.log('Connecting to MongoDB at:', uri);

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected.');
        try {
            console.log('Attempting to drop index "qrCode_1"...');
            await mongoose.connection.collection('tickets').dropIndex('qrCode_1');
            console.log('🔥 SUCCESS: Index dropped.');
        } catch (e) {
            console.log('ℹ️ Information:', e.message);
        } finally {
            console.log('Closing connection...');
            await mongoose.disconnect();
            process.exit(0);
        }
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

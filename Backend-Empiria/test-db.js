const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const testDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://elias:elias123@cluster0.p7bd8.mongodb.net/empiriadb');
        console.log('✅ Connected');

        const count = await User.countDocuments();
        console.log('User count:', count);

        const user = await User.findOne({ correo: 'admin@empiria.com' });
        console.log('Found user:', user ? user.correo : 'None');

        mongoose.connection.close();
    } catch (e) {
        console.error('❌ Error:', e);
    }
}
testDB();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Conectado a MongoDB');

        // Definir modelo User
        const User = mongoose.model('User', new mongoose.Schema({
            nombre: String,
            apellido: String,
            correo: String,
            contraseña: String,
            proveedor: String,
            tipo: String,
            createdAt: Date
        }));

        // Generar hash de contraseña
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('Admin123', salt);

        // Eliminar TODOS los admins con esos correos
        const deleted = await User.deleteMany({ correo: { $in: ['admin@empiria.com', 'admin2@empiria.com'] } });
        console.log(`🗑️  ${deleted.deletedCount} admins antiguos eliminados`);

        // Crear nuevo admin con contraseña correcta
        const admin = new User({
            nombre: 'Admin',
            apellido: 'Empiria',
            correo: 'admin@empiria.com',
            contraseña: hash,
            proveedor: 'manual',
            tipo: 'Admin',
            createdAt: new Date()
        });

        const saved = await admin.save();
        console.log('✅ Nuevo admin creado correctamente');
        console.log('ID:', saved._id);
        console.log('Hash length:', saved.contraseña.length);
        console.log('-----------------------------------');
        console.log('Email:    admin@empiria.com');
        console.log('Password: Admin123');
        console.log('-----------------------------------');

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

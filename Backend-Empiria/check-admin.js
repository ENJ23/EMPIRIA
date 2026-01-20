const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Conectado a MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            nombre: String,
            apellido: String,
            correo: String,
            contraseña: String,
            proveedor: String,
            tipo: String
        }));

        const admin = await User.findOne({ correo: 'admin@empiria.com' });
        
        if (!admin) {
            console.log('❌ Admin no encontrado');
        } else {
            console.log('✅ Admin encontrado:');
            console.log('Correo:', admin.correo);
            console.log('Nombre:', admin.nombre);
            console.log('Tipo:', admin.tipo);
            console.log('Proveedor:', admin.proveedor);
            console.log('Contraseña (hash):', admin.contraseña ? 'Existe' : '❌ UNDEFINED/NULL');
            console.log('Longitud hash:', admin.contraseña ? admin.contraseña.length : 0);
        }

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

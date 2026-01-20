require('dotenv').config();
const mongoose = require('mongoose');
const emailService = require('./src/services/emailService');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Conectado a MongoDB');

        // Definir modelos
        const User = mongoose.model('User', new mongoose.Schema({
            nombre: String,
            correo: String
        }));

        // Buscar un usuario real para probar
        const usuarios = await User.find().limit(3);
        
        console.log(`\n📧 Enviando emails de prueba a ${usuarios.length} usuarios...\n`);

        for (const usuario of usuarios) {
            console.log(`Enviando a: ${usuario.correo}`);
            
            try {
                await emailService.sendEmail(
                    usuario.correo,
                    '🎉 Prueba de Email - Empiria Jujuy',
                    'promotional',
                    {
                        userName: usuario.nombre,
                        promoTitle: 'Descuento de Prueba 15%',
                        discount: 15,
                        promoCode: 'TEST15',
                        validUntil: '31 de Diciembre 2025',
                        frontendUrl: process.env.FRONTEND_URL || 'https://empiriajujuy.vercel.app'
                    }
                );
                console.log(`✅ Email enviado correctamente\n`);
            } catch (error) {
                console.error(`❌ Error: ${error.message}\n`);
            }
        }

        console.log('========== FINALIZADO ==========');
        
        mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error conectando a MongoDB:', err);
        process.exit(1);
    });

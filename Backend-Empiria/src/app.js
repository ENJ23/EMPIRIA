const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
let helmet;
let rateLimit;
try { helmet = require('helmet'); } catch(e) { helmet = null; }
try { rateLimit = require('express-rate-limit'); } catch(e) { rateLimit = null; }
require('dotenv').config();

// ========== IMPORTAR JOBS DE EMAIL ==========
const eventReminderJob = require('./jobs/eventReminderJob');
const promotionalEmailJob = require('./jobs/promotionalEmailJob');

const app = express();

// ========== CORS PRIMERO (antes que cualquier otro middleware) ==========
const defaultOrigins = [
    'http://localhost:4200',
    'https://empiriajujuy.vercel.app',
    process.env.FRONTEND_URL || '',
].filter(Boolean);
const allowedOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
};

// Aplicar CORS a TODAS las rutas
app.use(cors(corsOptions));

// Manejo explícito de preflight OPTIONS
app.options('*', cors(corsOptions));

// ========== Express Body Parser ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== Security headers ==========
if (helmet) {
    app.use(helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: false
    }));
}

// ========== Rate Limit (DESPUÉS de CORS) ==========
if (rateLimit) {
    const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 200,
        skip: (req) => req.method === 'OPTIONS' // No limitar OPTIONS
    });
    app.use('/api/', limiter);
}

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/empiria')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        // ========== INICIAR JOBS DE EMAIL AUTOMÁTICO ==========
        console.log('\n🤖 Iniciando sistema de emails automáticos...');
        console.log('   ⏰ Job de recordatorios: Cada día a las 9:00 AM');
        console.log('   📢 Job de promociones: Cada día a las 10:00 AM');
        console.log('   📧 Job de cambios: Se ejecuta al actualizar evento\n');
        
        // Los jobs se inicializan automáticamente al requerir los módulos
        eventReminderJob;
        promotionalEmailJob;
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/reservations', require('./routes/reservations.routes'));
app.use('/api/promotions', require('./routes/promotion.routes'));  // ← Nueva ruta para promociones

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;

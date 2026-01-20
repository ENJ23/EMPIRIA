# 📧 SISTEMA DE EMAIL AUTOMATIZADO - GUÍA DE IMPLEMENTACIÓN

## 📋 ANÁLISIS DEL SISTEMA ACTUAL

Tu arquitectura está compuesta por:
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: Angular 18+
- **Modelos clave**: User, Event, Ticket, Reservation, Payment
- **Autenticación**: JWT

### Datos disponibles:
- ✅ **User**: nombre, apellido, correo (perfecto para emails)
- ✅ **Ticket**: referencia a user y event, fecha de compra
- ✅ **Event**: fecha, descripción, información completa
- ✅ **Reservation**: vinculación user-event

---

## 🎯 PLAN DE IMPLEMENTACIÓN - 3 MÓDULOS

### **MÓDULO 1: Recordatorio de evento (24 horas antes)**
### **MÓDULO 2: Comunicaciones promocionales**
### **MÓDULO 3: Notificación de cambio de fecha**

---

## 🛠️ ARQUITECTURA RECOMENDADA

```
Backend-Empiria/
├── src/
│   ├── config/
│   │   └── emailConfig.js          ← Configuración de nodemailer
│   ├── services/
│   │   └── emailService.js         ← Servicio base de emails
│   ├── jobs/
│   │   ├── eventReminderJob.js     ← Recordatorio 24h
│   │   ├── promotionalEmailJob.js  ← Promociones
│   │   └── eventChangeJob.js       ← Cambio de fecha
│   ├── models/
│   │   ├── EmailLog.js             ← Registro de emails enviados
│   │   └── Promotion.js            ← Gestión de promociones
│   └── templates/
│       ├── eventReminder.html
│       ├── promotional.html
│       └── eventChanged.html
```

---

## 📦 DEPENDENCIAS NECESARIAS

```bash
npm install nodemailer
npm install node-cron
npm install handlebars
npm install dotenv
```

**package.json:**
```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "node-cron": "^3.0.2",
    "handlebars": "^4.7.7"
  }
}
```

---

## 🔧 IMPLEMENTACIÓN DETALLADA

### **PASO 1: Configuración de Email (emailConfig.js)**

```javascript
// src/config/emailConfig.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // Opción 1: Gmail (con contraseña de app)
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,        // tu_email@gmail.com
        pass: process.env.EMAIL_PASSWORD     // contraseña de app generada
    }
    
    // Opción 2: SendGrid (recomendado para producción)
    // host: 'smtp.sendgrid.net',
    // port: 587,
    // auth: {
    //     user: 'apikey',
    //     pass: process.env.SENDGRID_API_KEY
    // }
    
    // Opción 3: Mailtrap (desarrollo/testing)
    // host: 'smtp.mailtrap.io',
    // port: 2525,
    // auth: {
    //     user: process.env.MAILTRAP_USER,
    //     pass: process.env.MAILTRAP_PASSWORD
    // }
});

module.exports = transporter;
```

**Variables de entorno (.env):**
```
# Email Configuration
EMAIL_USER=tu_email@example.com
EMAIL_PASSWORD=tu_contraseña_de_app
EMAIL_FROM_NAME=Empiria Jujuy
SENDGRID_API_KEY=tu_api_key_sendgrid (si usas SendGrid)
```

---

### **PASO 2: Servicio Base de Email (emailService.js)**

```javascript
// src/services/emailService.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const EmailLog = require('../models/EmailLog');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    // Cargar y compilar template HTML
    loadTemplate(templateName, data) {
        const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const template = handlebars.compile(templateContent);
        return template(data);
    }

    // Enviar email genérico
    async sendEmail(to, subject, templateName, templateData) {
        try {
            const htmlContent = this.loadTemplate(templateName, templateData);

            const mailOptions = {
                from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Registrar en base de datos
            await EmailLog.create({
                to,
                subject,
                templateName,
                status: 'sent',
                messageId: info.messageId,
                sentAt: new Date()
            });

            console.log(`✅ Email enviado a ${to}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(`❌ Error enviando email a ${to}:`, error);
            
            // Registrar error
            await EmailLog.create({
                to,
                subject,
                templateName,
                status: 'failed',
                error: error.message,
                sentAt: new Date()
            });

            return { success: false, error: error.message };
        }
    }

    // Enviar email con datos dinámicos
    async sendEventReminder(user, event) {
        const templateData = {
            nombre: user.nombre,
            titulo: event.title,
            fecha: new Date(event.date).toLocaleDateString('es-AR'),
            hora: new Date(event.date).toLocaleTimeString('es-AR'),
            ubicacion: event.location,
            descripcion: event.description,
            enlaceEvento: `${process.env.FRONTEND_URL}/events/${event._id}`,
            enlaceTickets: `${process.env.FRONTEND_URL}/tickets`
        };

        return this.sendEmail(
            user.correo,
            `¡Tu evento "${event.title}" comienza mañana!`,
            'eventReminder',
            templateData
        );
    }

    async sendPromotionalEmail(user, promotion) {
        const templateData = {
            nombre: user.nombre,
            titulo: promotion.titulo,
            descripcion: promotion.descripcion,
            descuento: promotion.descuento,
            codigoPromocion: promotion.codigo,
            enlace: `${process.env.FRONTEND_URL}/events?promo=${promotion.codigo}`,
            fechaFin: new Date(promotion.fechaFin).toLocaleDateString('es-AR')
        };

        return this.sendEmail(
            user.correo,
            promotion.asunto || `¡${promotion.descuento}% de descuento!`,
            'promotional',
            templateData
        );
    }

    async sendEventChangedEmail(user, event, oldDate, newDate) {
        const templateData = {
            nombre: user.nombre,
            titulo: event.title,
            fechaAnterior: new Date(oldDate).toLocaleDateString('es-AR'),
            fechaNueva: new Date(newDate).toLocaleDateString('es-AR'),
            hora: new Date(newDate).toLocaleTimeString('es-AR'),
            ubicacion: event.location,
            razon: event.changeReason || 'Cambio temporal por inconvenientes',
            enlaceEvento: `${process.env.FRONTEND_URL}/events/${event._id}`
        };

        return this.sendEmail(
            user.correo,
            `⚠️ Cambio de fecha: ${event.title}`,
            'eventChanged',
            templateData
        );
    }
}

module.exports = new EmailService();
```

---

### **PASO 3: Modelos de Base de Datos**

#### **EmailLog.js** (Registro de emails)
```javascript
// src/models/EmailLog.js
const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    templateName: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['sent', 'failed', 'pending'],
        default: 'pending',
        index: true
    },
    messageId: String,
    error: String,
    sentAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
```

#### **Promotion.js** (Gestión de promociones)
```javascript
// src/models/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    asunto: String,
    descuento: { type: Number, required: true }, // ej: 20 para 20%
    codigo: { type: String, unique: true, required: true },
    tipo: { 
        type: String,
        enum: ['descuento', 'preventa', 'finalizacion_preventa'],
        required: true
    },
    evento: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    usuariosDestino: {
        type: String,
        enum: ['todos', 'sin_tickets', 'con_tickets'],
        default: 'todos'
    },
    enviados: { type: Boolean, default: false },
    fechaEnvio: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Promotion', promotionSchema);
```

---

### **PASO 4: Templates HTML**

#### **eventReminder.html**
```html
<!-- src/templates/eventReminder.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #FF6B35; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #333; margin: 0 0 10px 0; }
        .header p { color: #666; margin: 0; }
        .event-info { background: #f9f9f9; padding: 20px; border-left: 4px solid #FF6B35; margin: 20px 0; border-radius: 4px; }
        .event-info h2 { color: #FF6B35; margin-top: 0; }
        .info-item { margin: 12px 0; color: #555; }
        .info-label { font-weight: bold; color: #333; }
        .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Hola {{nombre}}!</h1>
            <p>Tu evento comienza mañana</p>
        </div>

        <p style="color: #333; font-size: 16px;">
            Queremos recordarte que el evento al que ya compraste tu entrada se realizará <strong>mañana</strong>. 
            Aquí están los detalles:
        </p>

        <div class="event-info">
            <h2>{{titulo}}</h2>
            <div class="info-item">
                <span class="info-label">📅 Fecha y Hora:</span> {{fecha}} a las {{hora}}
            </div>
            <div class="info-item">
                <span class="info-label">📍 Ubicación:</span> {{ubicacion}}
            </div>
            <div class="info-item">
                <span class="info-label">📝 Descripción:</span> {{descripcion}}
            </div>
        </div>

        <p style="text-align: center;">
            <a href="{{enlaceEvento}}" class="button">Ver detalles del evento</a>
        </p>

        <p style="color: #666; line-height: 1.6;">
            No olvides traer tu entrada o código QR para poder acceder al evento. Si tienes alguna pregunta, 
            no dudes en contactarnos.
        </p>

        <div class="footer">
            <p>© 2025 Empiria Jujuy - Todos los derechos reservados</p>
            <p>Este es un correo automático, por favor no responder a esta dirección.</p>
        </div>
    </div>
</body>
</html>
```

#### **promotional.html**
```html
<!-- src/templates/promotional.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
        .promo-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .promo-header h1 { margin: 0 0 10px 0; font-size: 32px; }
        .discount { font-size: 48px; font-weight: bold; color: #FFD700; }
        .content { padding: 30px 20px; }
        .code-box { background: #f0f0f0; border: 2px dashed #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 3px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 4px; margin: 20px 0; width: 80%; text-align: center; box-sizing: border-box; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="promo-header">
            <h1>¡{{nombre}}, tenemos una sorpresa para ti!</h1>
            <p style="font-size: 18px; margin: 10px 0;">{{titulo}}</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
                {{descripcion}}
            </p>

            <div style="text-align: center;">
                <p style="color: #666;">Tu código de promoción:</p>
                <div class="code-box">
                    <div class="code">{{codigoPromocion}}</div>
                </div>
            </div>

            <p style="color: #666; text-align: center;">
                <strong>Válido hasta el {{fechaFin}}</strong>
            </p>

            <a href="{{enlace}}" class="button">Explorar eventos</a>

            <p style="color: #888; font-size: 14px; text-align: center;">
                No pierdas esta oportunidad. ¡Los descuentos son limitados!
            </p>
        </div>

        <div class="footer">
            <p>© 2025 Empiria Jujuy</p>
            <p>Correo automático - No responder</p>
        </div>
    </div>
</body>
</html>
```

#### **eventChanged.html**
```html
<!-- src/templates/eventChanged.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #fff3cd; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; border-left: 5px solid #FF6B35; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .alert { background: #fff3cd; border-left: 4px solid #FFC107; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .alert h2 { margin-top: 0; color: #FF6B35; }
        .dates { background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0; }
        .date-item { margin: 15px 0; padding: 10px; border-left: 3px solid #28a745; background: white; }
        .date-item h3 { margin: 0 0 5px 0; color: #333; }
        .old-date { border-left-color: #dc3545; }
        .new-date { border-left-color: #28a745; }
        .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #FF6B35;">⚠️ Cambio de fecha en tu evento</h1>

        <div class="alert">
            <h2>{{titulo}}</h2>
            <p style="margin: 0; color: #666;">
                {{razon}}
            </p>
        </div>

        <div class="dates">
            <div class="date-item old-date">
                <h3>❌ Fecha anterior:</h3>
                <p style="margin: 0; font-size: 16px; font-weight: bold;">{{fechaAnterior}}</p>
            </div>

            <div style="text-align: center; padding: 10px 0;">
                <span style="font-size: 20px;">➜</span>
            </div>

            <div class="date-item new-date">
                <h3>✅ Nueva fecha:</h3>
                <p style="margin: 0; font-size: 16px; font-weight: bold;">{{fechaNueva}} a las {{hora}}</p>
            </div>
        </div>

        <div style="background: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
                ✅ Tu entrada sigue siendo válida con la nueva fecha. No necesitas hacer nada más.
            </p>
        </div>

        <p style="text-align: center;">
            <a href="{{enlaceEvento}}" class="button">Ver evento actualizado</a>
        </p>

        <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Si tienes preguntas sobre este cambio o necesitas más información, no dudes en contactarnos. 
            Agradecemos tu comprensión.
        </p>
    </div>
</body>
</html>
```

---

### **PASO 5: Jobs Automáticos (Tareas Programadas)**

#### **eventReminderJob.js** (Recordatorio 24h)
```javascript
// src/jobs/eventReminderJob.js
const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const emailService = require('../services/emailService');

// Ejecutar cada día a las 9:00 AM
const eventReminderJob = cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Iniciando job de recordatorios de eventos...');
    
    try {
        // Calcular el rango: eventos en las próximas 24 horas (entre ahora+24h y ahora+25h)
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        // Buscar eventos que ocurran en las próximas 24 horas
        const upcomingEvents = await Event.find({
            date: {
                $gte: in24h,
                $lte: in25h
            }
        });

        console.log(`📅 Encontrados ${upcomingEvents.length} eventos en las próximas 24h`);

        for (const event of upcomingEvents) {
            // Buscar todos los usuarios con tickets para este evento
            const tickets = await Ticket.find({
                event: event._id,
                status: 'approved'
            }).populate('user');

            console.log(`  → ${event.title}: ${tickets.length} usuarios`);

            for (const ticket of tickets) {
                const user = ticket.user;

                // Verificar si ya se envió email para este evento-usuario
                const existingLog = await EmailLog.findOne({
                    to: user.correo,
                    templateName: 'eventReminder',
                    messageId: { $exists: true }
                });

                if (!existingLog) {
                    // Enviar email
                    await emailService.sendEventReminder(user, event);
                    console.log(`    ✅ Email enviado a ${user.correo}`);
                } else {
                    console.log(`    ⏭️  Email ya enviado a ${user.correo}`);
                }
            }
        }

        console.log('✅ Job completado');
    } catch (error) {
        console.error('❌ Error en eventReminderJob:', error);
    }
});

module.exports = eventReminderJob;
```

#### **promotionalEmailJob.js** (Envío de promociones)
```javascript
// src/jobs/promotionalEmailJob.js
const cron = require('node-cron');
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const emailService = require('../services/emailService');

// Ejecutar cada día a las 10:00 AM
const promotionalEmailJob = cron.schedule('0 10 * * *', async () => {
    console.log('📢 Iniciando job de emails promocionales...');
    
    try {
        // Buscar promociones activas no enviadas
        const now = new Date();
        const activePromotions = await Promotion.find({
            enviados: false,
            fechaInicio: { $lte: now },
            fechaFin: { $gte: now }
        });

        console.log(`🎯 Encontradas ${activePromotions.length} promociones activas`);

        for (const promotion of activePromotions) {
            let users = [];

            // Determinar usuarios destino
            if (promotion.usuariosDestino === 'todos') {
                users = await User.find();
            } else if (promotion.usuariosDestino === 'sin_tickets') {
                const usersWithTickets = await Ticket.distinct('user');
                users = await User.find({ _id: { $nin: usersWithTickets } });
            } else if (promotion.usuariosDestino === 'con_tickets') {
                const usersWithTickets = await Ticket.distinct('user');
                users = await User.find({ _id: { $in: usersWithTickets } });
            }

            console.log(`  → ${promotion.titulo}: ${users.length} usuarios destino`);

            // Enviar a cada usuario
            for (const user of users) {
                await emailService.sendPromotionalEmail(user, promotion);
                console.log(`    ✅ Promoción enviada a ${user.correo}`);
            }

            // Marcar como enviada
            promotion.enviados = true;
            promotion.fechaEnvio = new Date();
            await promotion.save();
        }

        console.log('✅ Job completado');
    } catch (error) {
        console.error('❌ Error en promotionalEmailJob:', error);
    }
});

module.exports = promotionalEmailJob;
```

#### **eventChangeJob.js** (Cambio de fecha)
```javascript
// src/jobs/eventChangeJob.js
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../services/emailService');

/**
 * Función para ser llamada cuando un admin cambia la fecha de un evento
 * Se integra en el controlador de eventos
 */
const notifyEventDateChange = async (eventId, oldDate, newDate) => {
    console.log(`📧 Notificando cambio de fecha para evento: ${eventId}`);
    
    try {
        const event = await Event.findById(eventId);
        
        if (!event) {
            console.error('❌ Evento no encontrado');
            return;
        }

        // Buscar todos los usuarios con tickets aprobados para este evento
        const tickets = await Ticket.find({
            event: eventId,
            status: 'approved'
        }).populate('user');

        console.log(`👥 ${tickets.length} usuarios a notificar`);

        // Enviar email a cada usuario
        for (const ticket of tickets) {
            const user = ticket.user;
            await emailService.sendEventChangedEmail(user, event, oldDate, newDate);
            console.log(`  ✅ Notificación enviada a ${user.correo}`);
        }

        console.log('✅ Notificaciones completadas');
        return { success: true, notified: tickets.length };

    } catch (error) {
        console.error('❌ Error notificando cambio:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { notifyEventDateChange };
```

---

### **PASO 6: Integración en el Backend**

#### **Actualizar app.js**
```javascript
// src/app.js (agregar esto en la sección de requires)
const eventReminderJob = require('./jobs/eventReminderJob');
const promotionalEmailJob = require('./jobs/promotionalEmailJob');

// Iniciar jobs después de conectar a BD
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/empiria')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        // Iniciar jobs programados
        console.log('🤖 Iniciando jobs automáticos...');
        eventReminderJob;    // Recordatorio de eventos
        promotionalEmailJob; // Emails promocionales
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
```

#### **Actualizar eventController.js**
```javascript
// En el método updateEvent, agregar notificación de cambio de fecha
const { notifyEventDateChange } = require('../jobs/eventChangeJob');

const updateEvent = async (req, res) => {
    const { id } = req.params;
    const oldEvent = await Event.findById(id);
    
    try {
        const updated = await Event.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!updated) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        // Si cambió la fecha, notificar usuarios
        if (oldEvent.date.getTime() !== updated.date.getTime()) {
            const result = await notifyEventDateChange(id, oldEvent.date, updated.date);
            console.log(`📧 ${result.notified} usuarios notificados del cambio`);
        }

        res.json({ 
            status: 1, 
            msg: 'Evento actualizado',
            event: updated,
            emailsNotified: oldEvent.date.getTime() !== updated.date.getTime()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al actualizar evento' });
    }
};
```

---

### **PASO 7: Crear Ruta para Envío Manual de Promociones**

```javascript
// src/routes/promotion.routes.js (nuevo archivo)
const { Router } = require('express');
const Promotion = require('../models/Promotion');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');
const { notifyEventDateChange } = require('../jobs/promotionalEmailJob');

const router = Router();

// Crear promoción (solo admin)
router.post('/', validarJWT, requireAdmin, async (req, res) => {
    try {
        const { titulo, descripcion, descuento, codigo, tipo, fechaFin, usuariosDestino } = req.body;

        const promotion = new Promotion({
            titulo,
            descripcion,
            descuento,
            codigo,
            tipo,
            fechaInicio: new Date(),
            fechaFin: new Date(fechaFin),
            usuariosDestino: usuariosDestino || 'todos',
            enviados: false
        });

        await promotion.save();

        res.status(201).json({
            status: 1,
            msg: 'Promoción creada exitosamente',
            promotion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al crear promoción' });
    }
});

// Obtener todas las promociones (admin)
router.get('/', validarJWT, requireAdmin, async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });
        res.json({
            status: 1,
            promotions
        });
    } catch (error) {
        res.status(500).json({ status: 0, msg: 'Error al obtener promociones' });
    }
});

module.exports = router;
```

---

## 📊 TABLA RESUMEN DE IMPLEMENTACIÓN

| Módulo | Función | Frecuencia | Usuarios | Trigger |
|--------|---------|-----------|----------|---------|
| **Recordatorio 24h** | Notificar evento próximo | Diaria 9:00 AM | Con tickets aprobados | Automático (cron) |
| **Promocional** | Descuentos, preventa | Diaria 10:00 AM | Según segmentación | Automático (cron) |
| **Cambio de Fecha** | Notificar nueva fecha | Al actualizar evento | Con tickets aprobados | Manual (API update) |

---

## 🔐 VARIABLES DE ENTORNO NECESARIAS

```env
# Email Service
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_app
EMAIL_FROM_NAME=Empiria Jujuy

# URLs
FRONTEND_URL=https://tu-dominio.com
MONGODB_URI=mongodb://localhost:27017/empiria

# Optional
SENDGRID_API_KEY=tu_api_key
MAILTRAP_USER=tu_usuario
MAILTRAP_PASSWORD=tu_password
```

---

## ✅ PASOS PARA IMPLEMENTAR

1. **Instalar dependencias**: `npm install nodemailer node-cron handlebars`
2. **Crear estructura de carpetas**: `config/`, `services/`, `jobs/`, `templates/`
3. **Crear modelos**: `EmailLog.js`, `Promotion.js`
4. **Crear templates HTML**: eventReminder, promotional, eventChanged
5. **Crear servicio base**: `emailService.js`
6. **Crear jobs**: 3 archivos de tareas programadas
7. **Actualizar app.js**: Inicializar jobs
8. **Actualizar eventController.js**: Notificación al cambiar fecha
9. **Configurar variables de entorno**
10. **Probar cada módulo**

---

## 🧪 TESTING

### Opción 1: Mailtrap (Desarrollo)
```env
EMAIL_SERVICE=mailtrap
MAILTRAP_USER=xxx
MAILTRAP_PASSWORD=xxx
```
✅ Captura emails sin enviar - Perfecto para desarrollo

### Opción 2: Gmail + App Passwords
1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Generar contraseña de app
3. Usar en `EMAIL_PASSWORD`

### Opción 3: SendGrid (Producción)
```env
SENDGRID_API_KEY=SG.xxxxx
```
✅ Más confiable para producción

---

## 📈 MEJORAS FUTURAS

- [ ] Panel de administración para crear/editar promociones
- [ ] Visualización de logs de emails en dashboard
- [ ] Template personalizables por tipo de evento
- [ ] Segmentación avanzada de usuarios (por categoría, ubicación, etc.)
- [ ] A/B testing de subject lines
- [ ] Integración con SMS para recordatorios críticos
- [ ] Unsubscribe link en emails
- [ ] Estadísticas de aperturas (con sendgrid)

---

## 🆘 TROUBLESHOOTING

**Error: "Less secure app access"** (Gmail)
→ Usar App Passwords en lugar de contraseña regular

**No se envían emails**
→ Verificar logs: `console.log()` en emailService
→ Testear SMTP: `node -e "require('./src/config/emailConfig')`

**Jobs no se ejecutan**
→ Verificar que app.js requiera los jobs
→ Revisar zona horaria del servidor: `TZ=America/Argentina/Jujuy`

---

## 📞 SOPORTE

Para más info sobre:
- **Nodemailer**: [nodemailer.com](https://nodemailer.com/)
- **Node-cron**: [node-cron docs](https://www.npmjs.com/package/node-cron)
- **Handlebars**: [handlebars.js](https://handlebarsjs.com/)
- **SendGrid**: [sendgrid.com](https://sendgrid.com/)

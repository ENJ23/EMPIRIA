# ✅ CHECKLIST DE IMPLEMENTACIÓN - SISTEMA DE EMAILS

## 📋 PRE-REQUISITOS
- [ ] Node.js instalado (v14 o superior)
- [ ] MongoDB conectado y funcionando
- [ ] Git (opcional, para clonar si es necesario)
- [ ] Acceso al Backend-Empiria
- [ ] Credenciales de email (Gmail, SendGrid, o Mailtrap)

---

## 📦 INSTALACIÓN (20-30 minutos)

### PASO 1: Instalar dependencias
- [ ] Abrir terminal en `Backend-Empiria`
- [ ] Ejecutar: `npm install nodemailer node-cron handlebars --save`
- [ ] Verificar: `npm list nodemailer node-cron handlebars`

### PASO 2: Crear estructura de carpetas
- [ ] `mkdir -p src/config`
- [ ] `mkdir -p src/services`
- [ ] `mkdir -p src/jobs`
- [ ] `mkdir -p src/templates`

### PASO 3: Copiar archivos de configuración

**Configuración:**
- [ ] `src/config/emailConfig.js`

**Servicios:**
- [ ] `src/services/emailService.js`

**Modelos:**
- [ ] `src/models/EmailLog.js`
- [ ] `src/models/Promotion.js`

**Jobs:**
- [ ] `src/jobs/eventReminderJob.js`
- [ ] `src/jobs/promotionalEmailJob.js`
- [ ] `src/jobs/eventChangeJob.js`

**Templates:**
- [ ] `src/templates/eventReminder.html`
- [ ] `src/templates/promotional.html`
- [ ] `src/templates/eventChanged.html`

**Rutas:**
- [ ] `src/routes/promotion.routes.js`

**Otros:**
- [ ] `.env.example` (en raíz de Backend-Empiria)

---

## ⚙️ CONFIGURACIÓN (10-15 minutos)

### PASO 4: Configurar variables de entorno

- [ ] Copiar `.env.example` a `.env`: `cp .env.example .env`

**OPCIÓN A: Gmail (Recomendado para empezar)**
- [ ] Ir a https://myaccount.google.com/apppasswords
- [ ] Generar contraseña de app
- [ ] En `.env`:
  ```
  EMAIL_USER=tu_email@gmail.com
  EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
  EMAIL_FROM_NAME=Empiria Jujuy
  ```

**OPCIÓN B: Mailtrap (Para testing)**
- [ ] Registrarse en https://mailtrap.io
- [ ] Copiar credenciales SMTP
- [ ] Descomentar sección Mailtrap en `src/config/emailConfig.js`
- [ ] En `.env`:
  ```
  MAILTRAP_USER=xxxxx
  MAILTRAP_PASSWORD=xxxxx
  ```

**OPCIÓN C: SendGrid (Para producción)**
- [ ] Registrarse en https://sendgrid.com
- [ ] Crear API Key
- [ ] Descomentar sección SendGrid en `src/config/emailConfig.js`
- [ ] En `.env`:
  ```
  SENDGRID_API_KEY=SG.xxxxx
  ```

**Configuración general en `.env`:**
- [ ] `FRONTEND_URL=http://localhost:4200` (o tu dominio)
- [ ] `TZ=America/Argentina/Jujuy`
- [ ] Verificar otras variables (MONGODB_URI, JWT_SECRET, etc.)

---

## 🔌 INTEGRACIÓN CON CÓDIGO EXISTENTE (5-10 minutos)

### PASO 5: Actualizar `src/app.js`

- [ ] Agregar al inicio (con otros requires):
  ```javascript
  const eventReminderJob = require('./jobs/eventReminderJob');
  const promotionalEmailJob = require('./jobs/promotionalEmailJob');
  ```

- [ ] Después de `mongoose.connect()`:
  ```javascript
  .then(() => {
      console.log('✅ Connected to MongoDB');
      
      // Iniciar jobs de email
      console.log('🤖 Email automation started');
      eventReminderJob;
      promotionalEmailJob;
  })
  ```

- [ ] Agregar ruta de promociones (con otras rutas):
  ```javascript
  app.use('/api/promotions', require('./routes/promotion.routes'));
  ```

### PASO 6: Actualizar `src/controllers/eventController.js`

- [ ] Agregar al inicio:
  ```javascript
  const { notifyEventDateChange } = require('../jobs/eventChangeJob');
  ```

- [ ] En método `updateEvent()`, después de actualizar:
  ```javascript
  // Si cambió la fecha, notificar usuarios
  if (oldEvent.date.getTime() !== updated.date.getTime()) {
      const result = await notifyEventDateChange(id, oldEvent.date, updated.date);
      console.log(`📧 ${result.notified} usuarios notificados`);
  }
  ```

---

## 🧪 TESTING Y VALIDACIÓN (10-15 minutos)

### PASO 7: Verificar instalación

- [ ] Ejecutar: `npm start`
- [ ] Ver logs:
  ```
  ✅ Connected to MongoDB
  ✅ Email service ready
  🤖 Email automation started
     ⏰ Job de recordatorios: Cada día a las 9:00 AM
     📢 Job de promociones: Cada día a las 10:00 AM
  ```

### PASO 8: Probar envío de email manual

- [ ] Crear archivo `test-email.js` en raíz:
  ```javascript
  require('dotenv').config();
  const mongoose = require('mongoose');
  const emailService = require('./src/services/emailService');
  const User = require('./src/models/User');
  const Event = require('./src/models/Event');

  (async () => {
      await mongoose.connect(process.env.MONGODB_URI);
      const user = await User.findOne();
      const event = await Event.findOne();
      
      if (user && event) {
          const result = await emailService.sendEventReminder(user, event);
          console.log('Result:', result);
      }
      process.exit(0);
  })();
  ```

- [ ] Ejecutar: `node test-email.js`
- [ ] Verificar resultado (email enviado o en Mailtrap)

### PASO 9: Crear promoción de prueba

- [ ] Obtener JWT token de admin
- [ ] Ejecutar:
  ```bash
  curl -X POST http://localhost:3000/api/promotions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{
      "titulo": "Test",
      "descripcion": "Prueba del sistema",
      "descuento": 20,
      "codigo": "TEST20",
      "tipo": "descuento",
      "fechaFin": "2025-12-31T23:59:59Z"
    }'
  ```

- [ ] Verificar respuesta (status: 1)

### PASO 10: Verificar registros

- [ ] Conectar a MongoDB (MongoDB Compass o mongosh)
- [ ] Ver colecciones:
  - [ ] `db.emaillogs.find({})` - Debe mostrar logs de emails
  - [ ] `db.promotions.find({})` - Debe mostrar la promoción creada
  - [ ] `db.emaillog.countDocuments()` - Contar emails enviados

---

## 🐛 TROUBLESHOOTING

Si algo no funciona:

### Error: "Less secure app access"
- [ ] Usar Google App Passwords en lugar de contraseña regular
- [ ] Ir a https://myaccount.google.com/apppasswords

### Error: "EAUTH: invalid login"
- [ ] Verificar que EMAIL_USER y EMAIL_PASSWORD son correctos
- [ ] Probar con Mailtrap para descartar credenciales

### Los jobs no se ejecutan
- [ ] Verificar que app.js requiere los módulos de jobs
- [ ] Revisar que server está corriendo: `npm start`
- [ ] Ver logs de error en consola

### No aparecen registros en EmailLog
- [ ] Verificar conexión a MongoDB
- [ ] Revisar que colección EmailLog existe
- [ ] Ver si hay errores de escritura en logs

### Templates no se cargan
- [ ] Verificar que archivos HTML existen en `src/templates/`
- [ ] Verificar rutas en emailService.js
- [ ] Ejecutar: `ls -la src/templates/`

---

## 📚 DOCUMENTACIÓN DISPONIBLE

- [x] [SISTEMA_EMAIL_AUTOMATIZADO.md](SISTEMA_EMAIL_AUTOMATIZADO.md)
  - Documentación técnica completa
  - Arquitectura del sistema
  - Código fuente comentado

- [x] [GUIA_INSTALACION_EMAILS.md](GUIA_INSTALACION_EMAILS.md)
  - Paso a paso detallado
  - Configuración por proveedor
  - Testing y troubleshooting

- [x] [RESUMEN_EJECUTIVO_EMAILS.md](RESUMEN_EJECUTIVO_EMAILS.md)
  - Overview del sistema
  - Flujos principales
  - Ejemplos de uso
  - Estadísticas

---

## ✅ VALIDACIÓN FINAL

Una vez completados todos los pasos:

- [ ] Sistema inicia sin errores
- [ ] Jobs se inicializan correctamente
- [ ] API /api/promotions funciona
- [ ] Emails se envían/registran correctamente
- [ ] MongoDB contiene registros
- [ ] No hay errores en consola
- [ ] Cambio de fecha notifica usuarios

---

## 🚀 PRODUCCIÓN

Antes de pasar a producción:

- [ ] Cambiar EMAIL_USER a email profesional (no personal)
- [ ] Usar SendGrid en lugar de Gmail (más confiable)
- [ ] Configurar FRONTEND_URL con dominio real
- [ ] Revisar TZ para zona horaria correcta
- [ ] Ajustar horarios de jobs según necesidad
- [ ] Hacer backup de MongoDB antes
- [ ] Probar flujo completo en staging
- [ ] Monitorear logs de email
- [ ] Configurar alertas si fallan muchos emails

---

## 📞 SOPORTE

Para más información:
- Documentación de Nodemailer: https://nodemailer.com/
- Documentación de Node-cron: https://www.npmjs.com/package/node-cron
- Documentación de Handlebars: https://handlebarsjs.com/

---

**Estado: Ready for Implementation ✅**

Estimated time to completion: **30-45 minutes**

Last updated: December 30, 2025

# 🚀 GUÍA DE INSTALACIÓN - SISTEMA DE EMAILS

## PASO 1: Instalar Dependencias

```bash
cd Backend-Empiria
npm install nodemailer node-cron handlebars
```

**Verificar instalación:**
```bash
npm list nodemailer node-cron handlebars
```

---

## PASO 2: Configurar Variables de Entorno

### 1. Copiar archivo de ejemplo
```bash
# En el directorio Backend-Empiria
cp .env.example .env
```

### 2. Editar archivo `.env`

Opciones recomendadas:

#### **OPCIÓN A: Gmail (Recomendado para empezar)**

1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Selecciona **Seguridad** en el menú
3. Busca "Contraseña de app" (necesitas tener verificación de 2 factores)
4. Selecciona:
   - App: **Correo**
   - Dispositivo: **Windows/Mac/Linux** (según corresponda)
5. Copia la contraseña generada

**En tu `.env`:**
```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=Empiria Jujuy
FRONTEND_URL=http://localhost:4200
TZ=America/Argentina/Jujuy
```

#### **OPCIÓN B: Mailtrap (Para testing)**

1. Registrate en [mailtrap.io](https://mailtrap.io)
2. Crea una bandeja de entrada
3. Copia las credenciales SMTP

**En tu `.env`:**
```env
# Cambiar en emailConfig.js a usar Mailtrap (descomentar esa sección)
MAILTRAP_USER=tu_usuario
MAILTRAP_PASSWORD=tu_contraseña
FRONTEND_URL=http://localhost:4200
TZ=America/Argentina/Jujuy
```

#### **OPCIÓN C: SendGrid (Para producción)**

1. Registrate en [sendgrid.com](https://sendgrid.com)
2. Crea una API Key
3. Copia la key

**En tu `.env`:**
```env
# Cambiar en emailConfig.js a usar SendGrid (descomentar esa sección)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FRONTEND_URL=https://tu-dominio.com
TZ=America/Argentina/Jujuy
```

---

## PASO 3: Verificar Estructura de Carpetas

Asegúrate de que existan estas carpetas en Backend-Empiria:

```
src/
├── config/
│   └── emailConfig.js ✓
├── services/
│   └── emailService.js ✓
├── jobs/
│   ├── eventReminderJob.js ✓
│   ├── promotionalEmailJob.js ✓
│   └── eventChangeJob.js ✓
├── models/
│   ├── EmailLog.js ✓
│   └── Promotion.js ✓
├── templates/
│   ├── eventReminder.html ✓
│   ├── promotional.html ✓
│   └── eventChanged.html ✓
└── routes/
    └── promotion.routes.js ✓
```

---

## PASO 4: Actualizar Archivos Existentes

### Actualizar `src/app.js`

Agregar al inicio (con otros requires):
```javascript
// Email Jobs
const eventReminderJob = require('./jobs/eventReminderJob');
const promotionalEmailJob = require('./jobs/promotionalEmailJob');
```

Y después de conectar a MongoDB:
```javascript
mongoose.connect(...)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        // Iniciar jobs
        console.log('🤖 Email automation started');
        eventReminderJob;
        promotionalEmailJob;
    })
    .catch(err => console.error(err));
```

Agregar la nueva ruta de promociones:
```javascript
app.use('/api/promotions', require('./routes/promotion.routes'));
```

### Actualizar `src/controllers/eventController.js`

En el método `updateEvent`, agregar notificación de cambio de fecha:

```javascript
const { notifyEventDateChange } = require('../jobs/eventChangeJob');

const updateEvent = async (req, res) => {
    const { id } = req.params;
    const oldEvent = await Event.findById(id);
    
    try {
        const updated = await Event.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!updated) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        // Si cambió la fecha, notificar
        if (oldEvent.date.getTime() !== updated.date.getTime()) {
            const result = await notifyEventDateChange(id, oldEvent.date, updated.date);
            console.log(`📧 ${result.notified} usuarios notificados`);
        }

        res.json({ 
            status: 1, 
            msg: 'Evento actualizado',
            event: updated
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al actualizar evento' });
    }
};
```

---

## PASO 5: Probar la Configuración

### Test 1: Verificar que los modelos se crean

```bash
npm start
```

En los logs deberías ver:
```
✅ Connected to MongoDB
✅ Email service ready
🤖 Email automation started
   ⏰ Job de recordatorios: Cada día a las 9:00 AM
   📢 Job de promociones: Cada día a las 10:00 AM
```

### Test 2: Crear una promoción de prueba

```bash
# En otro terminal
curl -X POST http://localhost:3000/api/promotions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -d '{
    "titulo": "Descuento de prueba",
    "descripcion": "Esta es una prueba del sistema de emails",
    "descuento": 20,
    "codigo": "TEST20",
    "tipo": "descuento",
    "fechaFin": "2025-12-31T23:59:59Z",
    "usuariosDestino": "todos"
  }'
```

### Test 3: Verificar registros de email

En MongoDB:
```javascript
// Conecta a tu MongoDB y ejecuta:
db.emaillogs.find({}).pretty()

// Deberías ver los logs de emails enviados/fallidos
```

---

## PASO 6: Programa de Ejecución de Jobs

Por defecto:

| Job | Hora | Frecuencia |
|-----|------|-----------|
| **eventReminderJob** | 9:00 AM | Diaria |
| **promotionalEmailJob** | 10:00 AM | Diaria |
| **eventChangeJob** | Manual | Al cambiar evento |

### Cambiar horas de ejecución

En `eventReminderJob.js`, línea:
```javascript
const eventReminderJob = cron.schedule('0 9 * * *', async () => {
                                          // ^ ^ ^ ^ ^
                                          // | | | | |
                                          // | | | | Día de semana (0-6)
                                          // | | | Mes (1-12)
                                          // | | Día del mes (1-31)
                                          // | Hora (0-23)
                                          // Minuto (0-59)
```

**Ejemplos:**
- `'0 9 * * *'` = Cada día a las 9:00 AM
- `'0 9 * * MON'` = Lunes a las 9:00 AM
- `'30 14 * * *'` = Cada día a las 2:30 PM
- `'0 */6 * * *'` = Cada 6 horas

---

## 🧪 TESTING EN DESARROLLO

### Opción 1: Mailtrap (Recomendado)

Mailtrap captura los emails sin enviarlos realmente:

1. Registrate en [mailtrap.io](https://mailtrap.io)
2. Copia las credenciales
3. Descomenta la sección Mailtrap en `src/config/emailConfig.js`
4. Agrega a `.env`:
```env
MAILTRAP_USER=tu_usuario
MAILTRAP_PASSWORD=tu_contraseña
```
5. Los emails aparecerán en el dashboard de Mailtrap

### Opción 2: Gmail con contraseña de app

Funciona bien pero menos seguro que SendGrid. Sigue el paso 2 Opción A arriba.

### Opción 3: Forzar ejecución de job (Testing manual)

Crea un archivo `test-email-job.js`:

```javascript
const Ticket = require('./src/models/Ticket');
const Event = require('./src/models/Event');
const User = require('./src/models/User');
const emailService = require('./src/services/emailService');

const runEmailTest = async () => {
    // Obtener un usuario
    const user = await User.findOne();
    
    // Obtener un evento
    const event = await Event.findOne();
    
    if (user && event) {
        console.log(`Testing email send to: ${user.correo}`);
        const result = await emailService.sendEventReminder(user, event);
        console.log('Result:', result);
    } else {
        console.log('No user or event found');
    }
};

runEmailTest();
```

Ejecuta con:
```bash
node test-email-job.js
```

---

## 📝 MODELO DE DATOS - EmailLog

Cada email enviado registra:

```javascript
{
  _id: ObjectId,
  to: "usuario@example.com",
  subject: "Tu evento comienza mañana",
  templateName: "eventReminder",
  status: "sent" | "failed" | "pending",
  messageId: "abc123@gmail.com",
  error: null,
  sentAt: Date
}
```

---

## 📝 MODELO DE DATOS - Promotion

Estructura de promoción:

```javascript
{
  _id: ObjectId,
  titulo: "Descuento especial",
  descripcion: "20% en todos los eventos...",
  asunto: "Oferta especial para ti",
  descuento: 20,
  codigo: "PROMO20",
  tipo: "descuento" | "preventa" | "finalizacion_preventa",
  evento: ObjectId (opcional),
  fechaInicio: Date,
  fechaFin: Date,
  usuariosDestino: "todos" | "sin_tickets" | "con_tickets",
  enviados: false,
  fechaEnvio: null,
  cantidadEnviados: 0,
  activo: true,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🐛 TROUBLESHOOTING

### Error: "Less secure app access"
→ Usar "Contraseña de app" en lugar de contraseña regular
→ Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### Error: "EAUTH: invalid login"
→ Verificar que EMAIL_USER y EMAIL_PASSWORD son correctos
→ Probar con Mailtrap para descartar problemas de credenciales

### Los jobs no se ejecutan
→ Verificar que app.js requiera los módulos de jobs
→ Revisar logs: `console.log()` en emailService
→ Verificar zona horaria: `TZ=America/Argentina/Jujuy`

### No aparecen registros en EmailLog
→ Verificar conexión a MongoDB
→ Revisar permisos de escritura en BD

### Templates no se cargan
→ Verificar que existan archivos HTML en `src/templates/`
→ Revisar rutas en `emailService.js` - deben ser rutas absolutas

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] Instalar dependencias (npm install)
- [ ] Copiar `.env.example` a `.env`
- [ ] Configurar credenciales de email en `.env`
- [ ] Crear carpetas: config, services, jobs, templates
- [ ] Crear todos los archivos (modelos, servicios, jobs, templates)
- [ ] Actualizar `app.js` y `eventController.js`
- [ ] Verificar estructura de carpetas
- [ ] Probar conexión a MongoDB
- [ ] Probar envío manual de email
- [ ] Crear promoción de prueba
- [ ] Verificar logs en MongoDB

Una vez completes esta lista, ¡el sistema estará listo para usar! 🎉

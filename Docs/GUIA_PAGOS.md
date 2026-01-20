# 🎫 GUÍA DE USO - SISTEMA DE PAGOS MERCADO PAGO

## ¿Qué cambió?

El sistema de pagos con Mercado Pago ha sido completamente reescrito para funcionar correctamente. Los principales cambios son:

### ✨ Cambios Clave

1. **Nueva tabla `Payment`** - Ahora se registran TODOS los pagos
2. **Relación Ticket ↔ Payment** - Cada ticket está vinculado a su pago
3. **Tipo de entrada (general/VIP)** - Se respeta el precio según la selección
4. **Webhook mejorado** - Maneja correctamente las notificaciones de MP
5. **Polling robusto** - Con timeout máximo y mejor manejo de errores

---

## 🔄 Flujo de Pago (Paso a Paso)

### **Paso 1: Usuario selecciona y paga**
```
1. Usuario va a evento
2. Selecciona "General" o "VIP Experience"
3. Cliquea "Confirmar Compra"
4. Se abre modal con QR
5. Escanea QR o cliquea "Pagar con Mercado Pago"
6. Se abre Mercado Pago en otra pestaña
7. Usuario completa el pago
```

### **Paso 2: Backend procesa el pago**
```
1. Mercado Pago notifica al webhook
2. Backend verifica los datos del pago
3. Backend actualiza el registro de Payment
4. Si está aprobado → Crea automáticamente el Ticket
```

### **Paso 3: Frontend detecta el ticket**
```
1. La app hace polling cada 5 segundos
2. Busca si ya hay un Ticket aprobado
3. Si lo encuentra → Lo redirige a la página de detalles
4. Si no encuentra después de 5 minutos → Muestra error
```

---

## 🛠️ Instalación y Configuración

### **1. Variables de Entorno (.env)**

Asegurar que tengas estas variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-8640541379873701-...

# Frontend
FRONTEND_URL=https://empiriajujuy-g6f5yphqt-enj23s-projects.vercel.app

# Webhook (CRÍTICO - esto debe estar en Vercel)
WEBHOOK_URL=https://empiria-opal.vercel.app/api/payments/webhook

# JWT
SECRET_JWT_SEED=...
```

### **2. En Vercel**

```
Project Settings → Environment Variables
```

Agregar/Verificar:
- `WEBHOOK_URL` = tu URL de backend + `/api/payments/webhook`
- Todas las demás variables igual que en .env local

### **3. En Mercado Pago**

En tu cuenta de Mercado Pago:
1. Ir a Settings → Notifications
2. Verificar que la URL sea: `https://empiria-opal.vercel.app/api/payments/webhook`

---

## 🧪 Testing

### **Opción 1: Test Local**

```bash
# Terminal 1: Backend
cd Backend-Empiria
npm run dev

# Terminal 2: Frontend
cd Frontend-Empiria
npm start

# Terminal 3: Ejecutar test
node test-payment-request-v2.js
```

Esto:
1. Hace login
2. Obtiene un evento
3. Crea una preferencia de pago
4. Te da una URL de Mercado Pago para probar

### **Opción 2: Test en Producción (Vercel)**

```bash
# Hacer un pago real en https://empiriajujuy.vercel.app
# Verificar logs en Vercel Dashboard
```

---

## 📊 Base de Datos - Nuevas Tablas

### **Tabla: payments**

Ahora tienes un registro detallado de CADA pago:

```javascript
{
  _id: ObjectId,
  user: ObjectId,           // Usuario que hizo el pago
  event: ObjectId,          // Evento para el que compró
  amount: Number,           // Monto total
  quantity: Number,         // Cantidad de entradas
  ticketType: String,       // 'general' o 'vip'
  
  // Mercado Pago
  mp_preference_id: String, // ID de preferencia en MP
  mp_payment_id: String,    // ID del pago en MP (único)
  external_reference: String,
  
  // Estado
  status: String,           // 'pending', 'approved', 'rejected', etc.
  mp_status_detail: String,
  
  // Detalles
  transaction_amount: Number,
  installments: Number,
  payment_method_id: String,
  
  // Tracking
  createdAt: Date,          // Cuándo se creó la preferencia
  approvedAt: Date,         // Cuándo se aprobó el pago
  webhookReceivedAt: Date,  // Cuándo llegó el webhook
  lastWebhookData: Object   // Último data del webhook (debugging)
}
```

### **Tabla: tickets** (Modificada)

Ahora está vinculada a payments:

```javascript
{
  _id: ObjectId,
  user: ObjectId,           // Usuario
  event: ObjectId,          // Evento
  payment: ObjectId,        // ← NUEVO: referencia a Payment
  paymentId: String,        // Legacy (mantener por compatibilidad)
  
  status: String,           // 'approved', 'pending', 'rejected'
  amount: Number,
  purchasedAt: Date,
  entryQr: String           // QR para entrada al evento
}
```

---

## 🔍 Debugging - Qué Hacer Si Algo Falla

### **❌ El pago se aprueba pero no se crea el ticket**

**Checklist:**

```
1. ¿Mercado Pago envió el webhook?
   → Ver logs en Vercel: Deployments → Function logs
   → Buscar: "[webhook] Received webhook request"

2. ¿El webhook llega correctamente?
   → Buscar en logs: "[webhook] Topic: payment"
   → Si no sale → El webhook URL en Mercado Pago está mal

3. ¿Se actualiza el Payment?
   → Buscar: "[webhook] Payment record updated"
   → Si no sale → El pago no se encontró en BD

4. ¿El status es 'approved'?
   → Buscar: "Status: approved"
   → Si es otra cosa (pending, rejected) → No se crea ticket

5. ¿Se crea el Ticket?
   → Buscar: "✅ Ticket created:"
   → Si no sale → Revisar errores en BD (unique constraint?)
```

### **❌ El polling nunca detecta el ticket**

**Checklist:**

```
1. ¿El ticket fue creado en BD?
   → En Vercel DB: db.tickets.find()
   → Ver si existe con status='approved'

2. ¿El API de tickets está funcionando?
   → GET /api/tickets/status/:eventId
   → Ver que retorna hasTicket: true

3. ¿El frontend tiene token JWT?
   → Ver en logs frontend: "Polling with token:"
   → Si dice "Token MISSING" → El usuario no está logueado

4. ¿El polling timeout se excedió?
   → Si pasan 5 minutos → Se cierra automáticamente
   → Usuario debe intentar de nuevo
```

### **❌ Mercado Pago no envía el webhook**

**Checklist:**

```
1. ¿WEBHOOK_URL está configurada en Vercel?
   → Ir a: Project Settings → Environment Variables
   → Verificar que WEBHOOK_URL sea la correcta

2. ¿El backend está deployado?
   → Ir a: Deployments
   → Verificar que haya un deployment reciente

3. ¿El endpoint existe?
   → POST /api/payments/webhook → debe retornar 200

4. ¿La URL es accesible desde internet?
   → curl https://empiria-opal.vercel.app/api/payments/webhook
   → Debe retornar error (porque POST sin body) pero no 404
```

---

## 📝 Logs Esperados

### **En Frontend**

```
✅ Login successful, got token
⏳ Creating payment preference...
[createPreference] User: xxxxx, Event: xxxxx, Quantity: 1, TicketType: general
✅ Pago iniciado, escanea el QR
🔄 Iniciando búsqueda de ticket...
✅ ¡Ticket confirmado! xxxxx
Redirigiendo a /tickets/xxxxx
```

### **En Backend (Vercel Logs)**

```
[createPreference] User: xxxxx, Event: xxxxx, Quantity: 1, TicketType: general, Price: 500, Total: 500
[createPreference] MP Preference created: mp_12345
[createPreference] Payment record saved: payment_67890

[webhook] Received webhook request
[webhook] Topic: payment, PaymentId: mp_payment_987654
[webhook] Fetching payment details from MP: mp_payment_987654
[webhook] Extracted refs - User: user_xxxxx, Event: event_xxxxx
[webhook] Payment record updated: payment_67890, Status: approved
[webhook] ✅ Ticket created: ticket_11111 for User: user_xxxxx, Event: event_xxxxx
```

---

## 🚀 Deployment a Producción

### **1. Push a Git**

```bash
git add .
git commit -m "Fix: Sistema de pagos Mercado Pago"
git push origin main
```

### **2. Vercel desplegará automáticamente**

### **3. Verificar que todo esté en producción**

```bash
# Ver logs
vercel logs --follow

# O en dashboard: Deployments → Function Logs
```

### **4. Testear con pago real**

```
1. Ir a https://empiriajujuy.vercel.app
2. Hacer login
3. Seleccionar evento
4. Hacer pago real en Mercado Pago
5. Esperar a que se cree el ticket
6. Verificar que aparezca en /tickets
```

---

## 💡 Tips Importantes

### **✅ Buenas Prácticas**

- Siempre verifica los logs cuando algo falla
- Usa el test script para validar cambios locales
- Mantén WEBHOOK_URL actualizada en Vercel
- No publiques el MP_ACCESS_TOKEN en git (siempre en .env local)

### **⚠️ Cosas que NO hacer**

- ❌ Cambiar WEBHOOK_URL sin actualizar en Mercado Pago
- ❌ Confundir `mp_preference_id` con `mp_payment_id`
- ❌ Crear tickets manualmente en BD (solo webhook lo hace)
- ❌ Ignorar logs de error en el webhook

---

## 📞 Soporte

Si algo no funciona:

1. **Revisa los logs** - La mayoría de errores están documentados
2. **Verifica la BD** - Busca en payments y tickets
3. **Testea localmente** - Con `test-payment-request-v2.js`
4. **Contacta a Mercado Pago** - Si el webhook no llega

---

**Última actualización:** 21-12-2025  
**Status:** ✅ Sistema listo para usar

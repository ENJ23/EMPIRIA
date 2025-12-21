# 🔧 CORRECCIONES IMPLEMENTADAS - SISTEMA DE PAGOS MERCADO PAGO

## 📝 Resumen de Cambios

Se han implementado todas las correcciones necesarias para que el sistema de pagos funcione correctamente con Mercado Pago.

---

## 🔄 CAMBIOS PRINCIPALES

### 1. **MODELO PAYMENT - MEJORADO** 
**Archivo:** `src/models/Payment.js`

✅ **Cambios:**
- Agregado campo `user` (ObjectId con referencia a User)
- Separado de `client` para mayor claridad
- Agregado índice a `mp_payment_id` para búsqueda rápida
- Agregados campos de tracking: `webhookReceivedAt`, `approvedAt`
- Agregado `lastWebhookData` para debuggear
- Agregados índices compuestos para búsquedas eficientes
- Renombrado campos para claridad: `transaction_amount`, `payment_method_id`

**Modelo ahora contiene:**
```javascript
{
  user: ObjectId,
  event: ObjectId,
  amount: Number,
  quantity: Number,
  ticketType: String, // 'general', 'vip', etc.
  mp_preference_id: String,
  mp_payment_id: String,
  external_reference: String,
  status: String, // 'pending', 'approved', 'rejected', 'cancelled', 'refunded'
  mp_status_detail: String,
  transaction_amount: Number,
  installments: Number,
  payment_method_id: String,
  createdAt: Date,
  approvedAt: Date,
  webhookReceivedAt: Date,
  lastWebhookData: Mixed // Para debugging
}
```

---

### 2. **MODELO TICKET - MEJORADO**
**Archivo:** `src/models/Ticket.js`

✅ **Cambios:**
- Agregado campo `payment` (ObjectId con referencia a Payment) - RELACIÓN PRINCIPAL
- Mantiene `paymentId` como campo legacy para compatibilidad
- Agregados índices compuestos para búsquedas rápidas
- Mejor estructura para auditoría

**Relación:**
```
Ticket.payment -> Payment._id (relación 1:1)
```

---

### 3. **PAYMENT CONTROLLER - COMPLETAMENTE REESCRITO**
**Archivo:** `src/controllers/paymentController.js`

#### **createPreference() - MEJORADO**
✅ **Cambios:**
- Ahora acepta parámetro `ticketType` (general, vip, etc.)
- Valida que el usuario exista en BD
- Valida parámetros de entrada
- Crea un registro `Payment` con estado 'pending' ANTES de enviar a MP
- Almacena `mp_preference_id` en BD para tracking
- Mejor logging con prefijo [createPreference]
- Retorna `payment_id` adicional en la respuesta

```javascript
{
  status: 1,
  msg: 'Preferencia creada',
  init_point: String,       // URL para pagar
  preference_id: String,    // ID de preferencia MP
  payment_id: String        // ID del registro en BD (NUEVO)
}
```

#### **receiveWebhook() - COMPLETAMENTE REESCRITO**
✅ **Cambios:**
- Maneja correctamente el formato de Mercado Pago: `?topic=payment&id=PAYMENT_ID`
- Obtiene datos completos del pago desde API de MP
- Busca el registro `Payment` existente por `mp_payment_id`
- Si no lo encuentra, busca por `user` + `event` + status 'pending'
- Actualiza el registro `Payment` con todos los datos de MP
- SOLO crea Ticket si el pago está 'approved'
- Valida que no haya duplicados de ticket
- Mejor logging con prefijo [webhook]
- Manejo robusto de errores

**Flujo del webhook:**
```
Webhook recibido (topic=payment, id=PAYMENT_ID)
    ↓
Obtener detalles del pago desde MP API
    ↓
Extraer user_id y event_id de external_reference
    ↓
Buscar o actualizar registro Payment
    ↓
Si status='approved':
  - Crear Ticket
  - Ticket referencia a Payment
    ↓
Retornar 200 (siempre, incluso si hay errores)
```

---

### 4. **FRONTEND - EVENT-DETAIL COMPONENT**
**Archivo:** `src/app/pages/event-detail/event-detail.component.ts`

#### **purchase() - MEJORADO**
✅ **Cambios:**
- Ahora envía `ticketType` (selectedTicket) al backend
- El backend usará este dato para determinar el precio

#### **Polling - MEJORADO**
✅ **Cambios:**
- Agregado timeout máximo de 5 minutos
- Mejorado logging con emojis para visibilidad
- Aumentado intervalo de polling de 3s a 5s (menos carga al servidor)
- Muestra mensaje de error si timeout se excede
- Mejor limpieza de recursos

```javascript
const maxPollingDuration = 300000; // 5 minutos
const pollingInterval = 5000;      // Chequear cada 5 segundos
```

---

### 5. **FRONTEND - PAYMENT SERVICE**
**Archivo:** `src/app/core/services/payment.service.ts`

✅ **Cambios:**
- `createPreference()` ahora acepta `ticketType` como parámetro opcional
- Default: 'general'

```typescript
createPreference(eventId: string, quantity: number, ticketType: string = 'general')
```

---

## 🔍 FLUJO CORRECTO DEL SISTEMA

### **1. Usuario cliquea "Confirmar Compra"**
```
Frontend (event-detail.component)
  ↓
selectTicket('general' o 'vip') → currentPrice se actualiza
  ↓
purchase() → envía eventId, quantity=1, ticketType
```

### **2. Backend crea Preferencia**
```
POST /api/payments/create-preference
{
  eventId: "...",
  quantity: 1,
  ticketType: "general" o "vip"
}
  ↓
Validar evento y usuario
  ↓
Determinar precio (según ticketType + preventa)
  ↓
Crear Preference en Mercado Pago
  ↓
Crear registro Payment en BD (status: 'pending')
  ↓
Retornar {init_point, preference_id, payment_id}
```

### **3. Usuario escanea QR o cliquea link**
```
MP Checkout opens
  ↓
Usuario completa pago
  ↓
Mercado Pago procesa pago
  ↓
Status: approved o rejected
```

### **4. Webhook de Mercado Pago**
```
POST /api/payments/webhook?topic=payment&id=PAYMENT_ID
  ↓
Backend obtiene detalles del pago desde MP API
  ↓
Busca/Actualiza registro Payment en BD
  ↓
Si approved:
  Crea Ticket (referencia a Payment)
  Ticket.status = 'approved'
  ↓
Retorna 200 OK
```

### **5. Frontend polling**
```
Cada 5 segundos:
  GET /api/tickets/status/:eventId
    ↓
  Backend busca Ticket con status='approved'
  para este usuario + evento
    ↓
  Si encontrado:
    STOP polling
    Redirigir a /tickets/:ticketId
    ↓
  Si no encontrado:
    Continuar polling
    (máximo 5 minutos)
```

---

## ✅ PROBLEMAS SOLUCIONADOS

| Problema | Solución |
|----------|----------|
| 🔴 Webhook URL comentada | Ya está en Vercel, solo asegurar que esté correcta |
| 🔴 Webhook no valida MP correctamente | Reescrito para manejar formato correcto de MP |
| 🔴 Precio siempre mínimo | Ahora se envía `ticketType` y backend lo usa |
| 🔴 Sin tabla Payment consolidada | Mejorada con todos los campos necesarios |
| 🔴 Ticket sin relación a Payment | Ahora tiene referencia directa: `payment` field |
| 🔴 Polling sin timeout | Agregado máximo 5 minutos |
| 🟠 Logging deficiente | Mejorado con prefijos [createPreference], [webhook] |
| 🟠 Falta validación de usuario | Agregada en `createPreference()` |

---

## 🧪 TESTING

### **Local Testing**
```bash
# Opción 1: Test script mejorado
npm install
node test-payment-request-v2.js

# Opción 2: Con ngrok (para testear webhook local)
npx ngrok http 3000
# Copiar URL HTTPS
# Actualizar variable en Vercel
# Hacer pago real en Mercado Pago
```

### **Vercel Testing**
```bash
# El webhook URL debe estar configurado como:
WEBHOOK_URL=https://empiria-opal.vercel.app/api/payments/webhook

# O si usas custom domain:
WEBHOOK_URL=https://api.empiriajujuy.com/api/payments/webhook
```

---

## 📊 LOGS ESPERADOS

### **Cuando se crea una preferencia:**
```
[createPreference] User: xxxxx, Event: xxxxx, Quantity: 1, TicketType: general, Price: 500, Total: 500
[createPreference] MP Preference created: 123456789
[createPreference] Payment record saved: payment_id_xxxxx
```

### **Cuando llega el webhook:**
```
[webhook] Received webhook request
[webhook] Topic: payment, PaymentId: 987654321
[webhook] Fetching payment details from MP: 987654321
[webhook] MP Payment Data: {...}
[webhook] Extracted refs - User: user_id, Event: event_id
[webhook] Payment record updated: payment_id_xxxxx, Status: approved
[webhook] ✅ Ticket created: ticket_id_xxxxx for User: user_id, Event: event_id
```

### **Cuando el frontend polling detecta el ticket:**
```
TicketService: Polling with token: Token exists
✅ ¡Ticket confirmado! ticket_id_xxxxx
```

---

## 🚀 PASOS PARA DEPLOYAR

1. **Actualizar código en Git**
```bash
git add .
git commit -m "Fix: Implementar sistema de pagos correcto con Mercado Pago"
git push origin main
```

2. **Vercel deployará automáticamente**

3. **Verificar que WEBHOOK_URL está en Vercel**
- Ir a Project Settings → Environment Variables
- Asegurar: `WEBHOOK_URL=https://empiria-opal.vercel.app/api/payments/webhook`

4. **Probar flujo completo**
- Usuario hace pago en QR
- Webhook debería llegar (ver logs en Vercel)
- Ticket debería crearse automáticamente
- Polling debería detectarlo dentro de 5 segundos

---

## 🔐 SEGURIDAD NOTES

⚠️ **TODO FUTURO:** Implementar signature verification de Mercado Pago
- MP envía signature en header `X-Signature`
- Validar contra los datos del webhook para evitar falsificaciones

Para hoy, el sistema está protegido porque:
1. Solo crea tickets si Payment está registrado
2. Solo si status='approved' de verdad en MP API
3. Valida que external_reference sea parseable

---

## 📞 DEBUGGING

Si los tickets no se crean:

1. **Verificar logs del webhook**
   - Ver si el webhook llega a Vercel (Function logs)
   - Ver si Mercado Pago lo está enviando

2. **Verificar tabla Payment**
   ```javascript
   db.payments.find({status: 'pending'}).pretty()
   ```

3. **Verificar tabla Ticket**
   ```javascript
   db.tickets.find().pretty()
   ```

4. **Testear localmente con ngrok**
   - Exponer localhost
   - Cambiar WEBHOOK_URL localmente
   - Hacer pago de prueba

---

**Fecha de implementación:** 21-12-2025
**Status:** ✅ COMPLETO Y LISTO PARA TESTEAR

# 📋 CHECKLIST DE DEPLOYMENT - SISTEMA DE PAGOS

## Pre-Deployment (Local)

### Backend
- [ ] `npm install` ejecutado sin errores
- [ ] `npm run dev` inicia sin errores
- [ ] `src/models/Payment.js` tiene todos los campos
- [ ] `src/models/Ticket.js` tiene campo `payment`
- [ ] `src/controllers/paymentController.js` importa Payment
- [ ] Variables de .env configuradas (incluyendo WEBHOOK_URL)
- [ ] Test script ejecutado: `node test-payment-request-v2.js`

### Frontend
- [ ] `npm install` ejecutado sin errores
- [ ] `npm start` inicia sin errores
- [ ] `payment.service.ts` acepta parámetro `ticketType`
- [ ] `event-detail.component.ts` envía `ticketType`
- [ ] Polling tiene `maxPollingDuration`
- [ ] No hay errores de compilación TypeScript

### Database
- [ ] MongoDB conecta correctamente
- [ ] Colecciones: `users`, `events`, `payments`, `tickets` existen
- [ ] Índices creados en Payment (mp_payment_id, status)
- [ ] Índices creados en Ticket (user, event, payment)

---

## Deployment a Vercel

### Paso 1: Git Push
```bash
# En la raíz del proyecto
git add .
git commit -m "fix: Sistema de pagos Mercado Pago - Implementación completa

Cambios:
- Mejorar modelo Payment con todos los detalles de MP
- Vincular Ticket a Payment
- Reescribir webhook para procesar correctamente
- Enviar ticketType y respetar precio VIP
- Mejorar polling con timeout máximo
- Agregar logging detallado"

git push origin main
```

**Resultado esperado:** Vercel detecta push y comienza deploy automáticamente

### Paso 2: Verificar Vercel Environment Variables

1. Ir a: https://vercel.com/dashboard/projects
2. Seleccionar proyecto: `empiria`
3. Ir a: Settings → Environment Variables
4. Verificar que existan:

```
✅ MONGODB_URI = mongodb+srv://...
✅ MP_ACCESS_TOKEN = APP_USR-...
✅ FRONTEND_URL = https://empiriajujuy.vercel.app
✅ WEBHOOK_URL = https://empiria-opal.vercel.app/api/payments/webhook
✅ SECRET_JWT_SEED = ...
```

⚠️ **IMPORTANTE:** Si WEBHOOK_URL no está o es incorrecta, agrégala ahora

5. Hacer redeploy: Deployments → [Último deploy] → Redeploy

### Paso 3: Verificar Deployment Exitoso

1. Ir a: Deployments
2. Buscar el último deployment
3. Verificar que diga "Ready" (no "Building" o "Error")
4. Hacer clic para ver logs

**Logs esperados:**
```
✅ Deployment completed
✅ Production build
✅ Ready
```

### Paso 4: Verificar Backend Está Activo

```bash
# En terminal
curl https://empiria-opal.vercel.app/api/events

# Debería retornar:
# { "status": 1, "events": [...] }
```

---

## Post-Deployment Testing

### Test 1: Login y Creación de Preferencia

```bash
# En terminal, en carpeta Backend-Empiria
node test-payment-request-v2.js
```

**Resultado esperado:**
```
✅ Login successful
✅ Testing with event: [EVENT_ID]
✅ Payment Status: 200
=== PAYMENT PREFERENCE RESPONSE ===
Status: 1
Message: Preferencia creada
Preference ID: [ID]
Payment ID: [ID]
Init Point: https://www.mercadopago.com.ar/checkout/...
```

### Test 2: Pago Real en UI

1. Ir a: https://empiriajujuy.vercel.app
2. Login con credenciales
3. Seleccionar un evento
4. Hacer clic en "General" o "VIP Experience"
5. Hacer clic en "Confirmar Compra"
6. Escanear QR o hacer clic en "Pagar con Mercado Pago"
7. Completar pago en Mercado Pago (usar tarjeta de prueba)
8. Esperar a que aparezca el ticket (máximo 10 segundos)

**Resultado esperado:**
```
Antes del pago:
- Modal con QR abierto
- "Iniciando búsqueda de ticket..."

Después del pago:
- Dentro de 5 segundos aparece: "¡Ticket confirmado!"
- Redirige automáticamente a: /tickets/[TICKET_ID]
```

### Test 3: Verificar Logs de Webhook

1. Ir a: https://vercel.com/dashboard/projects/empiria
2. Ir a: Deployments → [Último]
3. Ir a: Function logs
4. Buscar: `[webhook]` después de la hora del pago

**Logs esperados:**
```
[webhook] Received webhook request
[webhook] Topic: payment, PaymentId: [ID]
[webhook] Fetching payment details from MP: [ID]
[webhook] Payment record updated: [ID], Status: approved
[webhook] ✅ Ticket created: [TICKET_ID]
```

### Test 4: Verificar Base de Datos

**Conectarse a MongoDB:**
```bash
# Usando MongoDB Compass o terminal
db.payments.findOne({status: 'approved'})

# Resultado esperado:
{
  _id: ObjectId(...),
  user: ObjectId(...),
  event: ObjectId(...),
  amount: 500,
  status: 'approved',
  mp_payment_id: '[ID]',
  approvedAt: ISODate(...)
}
```

**Verificar Ticket creado:**
```bash
db.tickets.findOne({status: 'approved'})

# Resultado esperado:
{
  _id: ObjectId(...),
  user: ObjectId(...),
  event: ObjectId(...),
  payment: ObjectId(...),  # ← Vinculado a Payment
  status: 'approved'
}
```

---

## Troubleshooting Rápido

### ❌ Deployment falla en Vercel

**Posible causa:** Código tiene errores

**Solución:**
1. Ver logs en Vercel: Deployments → Build logs
2. Leer el error
3. Corregir localmente
4. Hacer git push nuevamente

### ❌ Webhook no llega

**Posible causa:** WEBHOOK_URL incorrecta

**Solución:**
1. Ir a Vercel → Settings → Environment Variables
2. Verificar WEBHOOK_URL
3. Ir a Mercado Pago → Account settings → Webhooks
4. Verificar que URL coincida
5. Hacer Redeploy en Vercel

### ❌ Pago se aprueba pero no se crea ticket

**Posible causa:** Webhook no se procesa

**Solución:**
1. Ver logs en Vercel durante el pago
2. Si no hay `[webhook] Received`, el webhook no llega
3. Si hay error de parse → Revisar external_reference
4. Si dice "Payment not found" → Revisar BD

### ❌ Precio incorrecto al pagar

**Posible causa:** ticketType no se envía

**Solución:**
1. Verificar en browser DevTools que se envíe ticketType
2. Verificar en backend logs `createPreference` que muestre ticketType
3. Revisar que frontend envíe la variable correcta

---

## Rollback (Si algo falla)

Si necesitas volver a la versión anterior:

```bash
# Ver histórico de commits
git log --oneline

# Volver a commit anterior
git revert HEAD
git push origin main

# O si no hay cambios publicados:
git reset --hard HEAD~1
git push --force origin main
```

---

## Checklist Final de Confirmación

Antes de dar por completado:

- [ ] Deployment exitoso en Vercel
- [ ] WEBHOOK_URL configurada en Vercel
- [ ] Backend responde en https://empiria-opal.vercel.app
- [ ] Test script retorna preference creada
- [ ] Pago real crea ticket automáticamente
- [ ] Logs muestran [webhook] correctamente
- [ ] BD tiene registros en payments y tickets
- [ ] Ticket se vincula correctamente a Payment
- [ ] Frontend polling detecta ticket en <10 segundos
- [ ] Usuario redirigido a /tickets/[ID]

**Si todos los checkpoints pasaron:** ✅ **SISTEMA LISTO PARA PRODUCCIÓN**

---

## Monitoreo Continuo

Después del deployment, verificar regularmente:

```bash
# Cada día (o cuando sea necesario)
1. Ver Vercel Dashboard → Deployments (¿último está "Ready"?)
2. Ver Vercel Dashboard → Function logs (¿hay errores?)
3. Conectar a MongoDB y verificar que hay pagos:
   db.payments.countDocuments()
   db.tickets.countDocuments()
4. Revisar que Mercado Pago webhook esté configurado
```

---

**Documento creado:** 21-12-2025  
**Responsable:** GitHub Copilot  
**Status:** ✅ Listo para seguir instrucciones de deployment

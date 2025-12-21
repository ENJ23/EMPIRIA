#!/bin/bash
# CHECKLIST DE VERIFICACIÓN - SISTEMA DE PAGOS

echo "================================"
echo "🔍 CHECKLIST DE VERIFICACIÓN"
echo "================================"
echo ""

# Verificar modelos
echo "✅ Paso 1: Verificar modelos actualizados"
echo ""

# Verificar Payment.js
if grep -q "mp_payment_id" Backend-Empiria/src/models/Payment.js; then
    echo "  ✅ Payment.js - mp_payment_id field presente"
else
    echo "  ❌ Payment.js - mp_payment_id field FALTANTE"
fi

if grep -q "webhookReceivedAt" Backend-Empiria/src/models/Payment.js; then
    echo "  ✅ Payment.js - webhookReceivedAt field presente"
else
    echo "  ❌ Payment.js - webhookReceivedAt field FALTANTE"
fi

# Verificar Ticket.js
if grep -q "payment:" Backend-Empiria/src/models/Ticket.js; then
    echo "  ✅ Ticket.js - payment field presente (relación a Payment)"
else
    echo "  ❌ Ticket.js - payment field FALTANTE"
fi

echo ""
echo "✅ Paso 2: Verificar controlador actualizado"
echo ""

# Verificar paymentController.js
if grep -q "const Payment = require" Backend-Empiria/src/controllers/paymentController.js; then
    echo "  ✅ paymentController.js - Payment require presente"
else
    echo "  ❌ paymentController.js - Payment require FALTANTE"
fi

if grep -q "ticketType" Backend-Empiria/src/controllers/paymentController.js; then
    echo "  ✅ paymentController.js - ticketType parámetro presente"
else
    echo "  ❌ paymentController.js - ticketType parámetro FALTANTE"
fi

if grep -q "\[webhook\]" Backend-Empiria/src/controllers/paymentController.js; then
    echo "  ✅ paymentController.js - Logging con prefijo [webhook]"
else
    echo "  ❌ paymentController.js - Logging deficiente"
fi

echo ""
echo "✅ Paso 3: Verificar frontend actualizado"
echo ""

# Verificar payment.service.ts
if grep -q "ticketType" Frontend-Empiria/src/app/core/services/payment.service.ts; then
    echo "  ✅ payment.service.ts - ticketType parámetro presente"
else
    echo "  ❌ payment.service.ts - ticketType parámetro FALTANTE"
fi

# Verificar event-detail.component.ts
if grep -q "maxPollingDuration" Frontend-Empiria/src/app/pages/event-detail/event-detail.component.ts; then
    echo "  ✅ event-detail.component.ts - Polling timeout presente"
else
    echo "  ❌ event-detail.component.ts - Polling timeout FALTANTE"
fi

if grep -q "const ticketType = this.selectedTicket" Frontend-Empiria/src/app/pages/event-detail/event-detail.component.ts; then
    echo "  ✅ event-detail.component.ts - ticketType enviado al backend"
else
    echo "  ❌ event-detail.component.ts - ticketType NO se envía"
fi

echo ""
echo "✅ Paso 4: Verificar configuración"
echo ""

# Verificar .env
if grep -q "WEBHOOK_URL" Backend-Empiria/.env; then
    WEBHOOK_URL=$(grep "WEBHOOK_URL" Backend-Empiria/.env)
    if [[ $WEBHOOK_URL == *"#"* ]]; then
        echo "  ⚠️  .env - WEBHOOK_URL está comentada"
    else
        echo "  ✅ .env - WEBHOOK_URL configurada: $WEBHOOK_URL"
    fi
else
    echo "  ❌ .env - WEBHOOK_URL FALTANTE"
fi

echo ""
echo "================================"
echo "📝 PRÓXIMOS PASOS"
echo "================================"
echo ""
echo "1. Hacer git commit y push"
echo "   git add ."
echo "   git commit -m 'Fix: Sistema de pagos Mercado Pago'"
echo "   git push origin main"
echo ""
echo "2. Verificar en Vercel que Environment Variables incluyan:"
echo "   - WEBHOOK_URL=https://empiria-opal.vercel.app/api/payments/webhook"
echo ""
echo "3. Testear con:"
echo "   node test-payment-request-v2.js"
echo ""
echo "4. Verificar logs en Vercel después de hacer un pago"
echo ""
echo "================================"

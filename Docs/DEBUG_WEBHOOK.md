#!/bin/bash
# Script para debuggear el webhook de Mercado Pago
# Este script simula un webhook de Mercado Pago para testear localmente

echo "=== MERCADO PAGO WEBHOOK TEST SCRIPT ==="
echo ""

# Obtener el ID del pago más reciente
echo "📋 Listando pagos pendientes..."
# Esto es un ejemplo - necesitarías acceso a tu BD para esto

# Para testear localmente, puedes usar ngrok para exponer tu localhost
echo ""
echo "🔗 PASOS PARA PROBAR WEBHOOK:"
echo "1. Instalar ngrok: https://ngrok.com/download"
echo "2. Ejecutar: ngrok http 3000"
echo "3. Copiar la URL HTTPS generada"
echo "4. Actualizar WEBHOOK_URL en Vercel con esa URL"
echo "5. Hacer un pago en Mercado Pago"
echo "6. El webhook debería llegar a tu servidor local"
echo ""

# Simulación de webhook local (descomentar para probar)
# PAYMENT_ID="123456789"
# curl -X POST "http://localhost:3000/api/payments/webhook?topic=payment&id=$PAYMENT_ID"

echo "✅ Para más información, revisa los logs del servidor:"
echo "   npm run dev"

#!/bin/bash
# SCRIPT DE INSTALACIÓN AUTOMÁTICA - Sistema de Emails

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════"
echo "🚀 INSTALADOR AUTOMÁTICO - SISTEMA DE EMAILS EMPIRIA JUJUY"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Necesitas ejecutar este script desde Backend-Empiria"
    echo "   cd Backend-Empiria"
    echo "   bash install-email-system.sh"
    exit 1
fi

echo "✅ Ubicación correcta"
echo ""

# Paso 1: Instalar dependencias
echo "📦 Paso 1/5: Instalando dependencias..."
npm install nodemailer node-cron handlebars --save

if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas correctamente"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi
echo ""

# Paso 2: Crear estructura de carpetas
echo "📁 Paso 2/5: Creando estructura de carpetas..."
mkdir -p src/config
mkdir -p src/services
mkdir -p src/jobs
mkdir -p src/templates
mkdir -p src/models
mkdir -p src/routes

echo "✅ Carpetas creadas"
echo ""

# Paso 3: Verificar archivo .env
echo "🔐 Paso 3/5: Configurando variables de entorno..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Archivo .env creado desde .env.example"
        echo "   ⚠️  IMPORTANTE: Edita .env y configura:"
        echo "      - EMAIL_USER"
        echo "      - EMAIL_PASSWORD"
        echo "      - FRONTEND_URL"
    else
        echo "⚠️  No encontré .env.example"
    fi
else
    echo "✅ Archivo .env ya existe"
fi
echo ""

# Paso 4: Verificar modelos y servicios
echo "✅ Paso 4/5: Verificando archivos creados..."
REQUIRED_FILES=(
    "src/config/emailConfig.js"
    "src/services/emailService.js"
    "src/models/EmailLog.js"
    "src/models/Promotion.js"
    "src/jobs/eventReminderJob.js"
    "src/jobs/promotionalEmailJob.js"
    "src/jobs/eventChangeJob.js"
    "src/templates/eventReminder.html"
    "src/templates/promotional.html"
    "src/templates/eventChanged.html"
    "src/routes/promotion.routes.js"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ FALTA: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo "⚠️  Faltan $MISSING_FILES archivos"
    echo "   Por favor copia los archivos desde la guía de instalación"
fi
echo ""

# Paso 5: Resumen final
echo "════════════════════════════════════════════════════════════"
echo "✅ INSTALACIÓN COMPLETADA"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 SIGUIENTES PASOS:"
echo ""
echo "1️⃣  CONFIGURAR VARIABLES DE ENTORNO"
echo "    • Abre el archivo: .env"
echo "    • Configura EMAIL_USER y EMAIL_PASSWORD"
echo "    • Opción A: Gmail (app passwords)"
echo "    • Opción B: Mailtrap (testing)"
echo "    • Opción C: SendGrid (producción)"
echo ""
echo "2️⃣  ACTUALIZAR ARCHIVOS EXISTENTES"
echo "    • src/app.js - Agregar requires de jobs y ruta de promociones"
echo "    • src/controllers/eventController.js - Integrar notificación de cambio"
echo "    Ver archivos: ACTUALIZAR_APP_JS.md y ACTUALIZAR_EVENT_CONTROLLER.md"
echo ""
echo "3️⃣  INSTALAR DEPENDENCIAS ADICIONALES (Si las usas)"
echo "    npm install (para sincronizar dependencias)"
echo ""
echo "4️⃣  PROBAR EL SISTEMA"
echo "    npm start"
echo "    # Deberías ver:"
echo "    # ✅ Connected to MongoDB"
echo "    # ✅ Email service ready"
echo "    # 🤖 Email automation started"
echo ""
echo "5️⃣  CREAR PRIMERA PROMOCIÓN"
echo "    curl -X POST http://localhost:3000/api/promotions \\"
echo "      -H 'Authorization: Bearer JWT_TOKEN' \\"
echo "      -d '{...}'"
echo ""
echo "📚 DOCUMENTACIÓN:"
echo "    • SISTEMA_EMAIL_AUTOMATIZADO.md - Documentación técnica"
echo "    • GUIA_INSTALACION_EMAILS.md - Pasos detallados"
echo "    • RESUMEN_EJECUTIVO_EMAILS.md - Overview y ejemplos"
echo ""
echo "════════════════════════════════════════════════════════════"

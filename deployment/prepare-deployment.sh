#!/bin/bash

# Script para preparar archivos de deployment
# Ejecutar en su máquina local

echo "Preparando archivos de deployment..."

# Crear directorio local
mkdir -p ~/inventario-deployment-pack

# Copiar archivos
cp /app/deployment/install.sh ~/inventario-deployment-pack/
cp /app/deployment/setup-app.sh ~/inventario-deployment-pack/
cp /app/deployment/backup.sh ~/inventario-deployment-pack/
cp /app/deployment/GUIA_DEPLOYMENT.md ~/inventario-deployment-pack/

# Crear README
cat > ~/inventario-deployment-pack/README.txt << 'EOF'
====================================================
SISTEMA DE INVENTARIOS - DEPLOYMENT PACK
Academia Jotuns Club SAS
====================================================

CONTENIDO:
1. install.sh - Script de instalación inicial
2. setup-app.sh - Script de configuración de la aplicación
3. backup.sh - Script de backup de MongoDB
4. GUIA_DEPLOYMENT.md - Guía completa de instalación

PASOS RÁPIDOS:

1. Suba estos archivos a su VPS:
   scp *.sh root@IP_VPS:/root/

2. Conéctese al VPS:
   ssh root@IP_VPS

3. Dé permisos:
   chmod +x *.sh

4. Ejecute instalación:
   ./install.sh

5. Siga la guía en GUIA_DEPLOYMENT.md

====================================================
EOF

# Crear archivo .zip
cd ~/inventario-deployment-pack
zip -r ../inventario-deployment.zip .

echo ""
echo "✅ Archivos preparados en: ~/inventario-deployment-pack/"
echo "✅ Archivo ZIP creado en: ~/inventario-deployment.zip"
echo ""
echo "Puede subir estos archivos a su VPS con:"
echo "scp ~/inventario-deployment.zip root@IP_VPS:/root/"

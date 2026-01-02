#!/bin/bash

# Script de solución rápida para actualizar Node.js a versión 20

echo "================================"
echo "Actualizando Node.js a versión 20"
echo "================================"
echo ""

# Verificar versión actual
echo "Versión actual de Node.js:"
node --version

echo ""
echo "Instalando Node.js 20..."

# Desinstalar versión anterior
apt remove -y nodejs

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar nueva versión
echo ""
echo "Nueva versión de Node.js:"
node --version

# Reinstalar yarn
echo ""
echo "Reinstalando Yarn..."
npm install -g yarn

echo ""
echo "✅ Node.js 20 instalado correctamente"
echo ""
echo "Ahora puede continuar con la instalación:"
echo "cd /var/www/inventario/frontend"
echo "yarn install"
echo "yarn build"

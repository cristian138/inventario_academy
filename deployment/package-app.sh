#!/bin/bash

# Script para empaquetar el código de la aplicación para deployment

echo "Empaquetando aplicación para deployment..."

cd /app

# Crear directorio temporal
mkdir -p /tmp/inventario-app

# Copiar backend
echo "Copiando backend..."
mkdir -p /tmp/inventario-app/backend
cp -r backend/*.py /tmp/inventario-app/backend/ 2>/dev/null || true
cp backend/requirements.txt /tmp/inventario-app/backend/
cp backend/.env /tmp/inventario-app/backend/.env.example

# Copiar frontend
echo "Copiando frontend..."
mkdir -p /tmp/inventario-app/frontend
cp -r frontend/src /tmp/inventario-app/frontend/
cp -r frontend/public /tmp/inventario-app/frontend/
cp frontend/package.json /tmp/inventario-app/frontend/
cp frontend/yarn.lock /tmp/inventario-app/frontend/ 2>/dev/null || true
cp frontend/tailwind.config.js /tmp/inventario-app/frontend/
cp frontend/postcss.config.js /tmp/inventario-app/frontend/
cp frontend/.env /tmp/inventario-app/frontend/.env.example

# Sanitizar archivos .env (remover valores sensibles)
sed -i 's/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=CHANGE_THIS/g' /tmp/inventario-app/backend/.env.example
sed -i 's/RESEND_API_KEY=.*/RESEND_API_KEY=YOUR_KEY_HERE/g' /tmp/inventario-app/backend/.env.example
sed -i 's/REACT_APP_BACKEND_URL=.*/REACT_APP_BACKEND_URL=https:\/\/your-domain.com/g' /tmp/inventario-app/frontend/.env.example

# Crear archivo de instrucciones
cat > /tmp/inventario-app/INSTALL.txt << 'EOF'
INSTALACIÓN DEL CÓDIGO

1. Descomprima este archivo en /var/www/inventario/

   tar -xzf inventario-codigo.tar.gz -C /var/www/inventario/

2. Configure los archivos .env:

   Backend:
   cd /var/www/inventario/backend
   cp .env.example .env
   nano .env  # Edite las variables

   Frontend:
   cd /var/www/inventario/frontend
   cp .env.example .env
   nano .env  # Edite REACT_APP_BACKEND_URL

3. Ejecute el script de configuración:
   
   cd /root/inventario-deployment
   ./setup-app.sh

EOF

# Crear tarball
cd /tmp
tar -czf /tmp/inventario-codigo.tar.gz inventario-app/

# Mover a directorio de deployment
mv /tmp/inventario-codigo.tar.gz /app/deployment/

# Limpiar
rm -rf /tmp/inventario-app

echo ""
echo "✅ Código empaquetado en: /app/deployment/inventario-codigo.tar.gz"
echo ""
echo "Puede subir este archivo a su VPS con:"
echo "scp /app/deployment/inventario-codigo.tar.gz root@IP_VPS:/var/www/inventario/"

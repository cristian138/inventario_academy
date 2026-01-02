#!/bin/bash

# Sistema de Inventarios - Script de Instalación para Ubuntu VPS
# Academia Jotuns Club SAS

set -e

echo "================================"
echo "Instalación Sistema de Inventarios"
echo "Academia Jotuns Club SAS"
echo "================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Este script debe ejecutarse como root (use sudo)${NC}"
   exit 1
fi

# Solicitar información al usuario
echo -e "${YELLOW}Ingrese el dominio para el sistema (ejemplo: inventario.academia.com):${NC}"
read DOMAIN

echo -e "${YELLOW}Ingrese su email para certificado SSL:${NC}"
read EMAIL

echo -e "${YELLOW}¿Desea instalar certificado SSL con Let's Encrypt? (s/n):${NC}"
read INSTALL_SSL

echo ""
echo -e "${GREEN}Iniciando instalación...${NC}"
echo ""

# Actualizar sistema
echo -e "${GREEN}[1/10] Actualizando sistema...${NC}"
apt update && apt upgrade -y

# Instalar dependencias básicas
echo -e "${GREEN}[2/10] Instalando dependencias básicas...${NC}"
apt install -y curl git wget nginx supervisor ufw python3-pip python3-venv

# Instalar Node.js 18.x
echo -e "${GREEN}[3/10] Instalando Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar Yarn
echo -e "${GREEN}[4/10] Instalando Yarn...${NC}"
npm install -g yarn

# Instalar MongoDB
echo -e "${GREEN}[5/10] Instalando MongoDB...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# Configurar firewall
echo -e "${GREEN}[6/10] Configurando firewall...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Crear usuario para la aplicación
echo -e "${GREEN}[7/10] Creando usuario de aplicación...${NC}"
if ! id -u appuser > /dev/null 2>&1; then
    useradd -m -s /bin/bash appuser
fi

# Crear directorios
echo -e "${GREEN}[8/10] Creando estructura de directorios...${NC}"
mkdir -p /var/www/inventario/backend
mkdir -p /var/www/inventario/frontend
mkdir -p /var/www/inventario/logs
mkdir -p /var/www/inventario/actas
chown -R appuser:appuser /var/www/inventario

# Guardar configuración
echo -e "${GREEN}[9/10] Guardando configuración...${NC}"
cat > /var/www/inventario/config.env << EOF
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
INSTALL_SSL=${INSTALL_SSL}
EOF

echo ""
echo -e "${GREEN}[10/10] Instalación de dependencias completada!${NC}"
echo ""
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${GREEN}Próximos pasos:${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo ""
echo "1. Suba el código de su aplicación a:"
echo "   Backend:  /var/www/inventario/backend"
echo "   Frontend: /var/www/inventario/frontend"
echo ""
echo "2. Ejecute el script de configuración:"
echo "   sudo bash /var/www/inventario/setup-app.sh"
echo ""
echo -e "${YELLOW}════════════════════════════════════════${NC}"

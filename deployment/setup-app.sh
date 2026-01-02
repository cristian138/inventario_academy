#!/bin/bash

# Script de configuración de la aplicación

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Este script debe ejecutarse como root${NC}"
   exit 1
fi

# Cargar configuración
source /var/www/inventario/config.env

echo -e "${GREEN}Configurando aplicación...${NC}"
echo ""

# Configurar Backend
echo -e "${GREEN}[1/8] Configurando Backend...${NC}"
cd /var/www/inventario/backend

# Crear entorno virtual Python
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Crear archivo .env para backend
cat > .env << EOF
JWT_SECRET_KEY=$(openssl rand -hex 32)
MONGO_URL=mongodb://localhost:27017/
DB_NAME=inventario_db
CORS_ORIGINS=https://${DOMAIN},http://${DOMAIN}
EOF

deactivate

# Configurar Frontend
echo -e "${GREEN}[2/8] Configurando Frontend...${NC}"
cd /var/www/inventario/frontend

# Instalar dependencias
yarn install

# Crear archivo .env para frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF

# Build del frontend
echo -e "${GREEN}[3/8] Compilando Frontend...${NC}"
yarn build

# Crear configuración de Nginx
echo -e "${GREEN}[4/8] Configurando Nginx...${NC}"
cat > /etc/nginx/sites-available/inventario << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    client_max_body_size 20M;

    # Frontend (React build)
    location / {
        root /var/www/inventario/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logs
    access_log /var/www/inventario/logs/nginx-access.log;
    error_log /var/www/inventario/logs/nginx-error.log;
}
EOF

# Reemplazar dominio
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/inventario

# Habilitar sitio
ln -sf /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
nginx -t

# Crear servicio systemd para el backend
echo -e "${GREEN}[5/8] Creando servicio systemd...${NC}"
cat > /etc/systemd/system/inventario-backend.service << EOF
[Unit]
Description=Sistema de Inventarios - Backend API
After=network.target mongod.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/var/www/inventario/backend
Environment="PATH=/var/www/inventario/backend/venv/bin"
ExecStart=/var/www/inventario/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd
systemctl daemon-reload
systemctl enable inventario-backend
systemctl start inventario-backend

# Reiniciar Nginx
echo -e "${GREEN}[6/8] Reiniciando Nginx...${NC}"
systemctl restart nginx

# Configurar SSL si es necesario
if [ "$INSTALL_SSL" = "s" ] || [ "$INSTALL_SSL" = "S" ]; then
    echo -e "${GREEN}[7/8] Configurando SSL con Let's Encrypt...${NC}"
    
    apt install -y certbot python3-certbot-nginx
    
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect
    
    # Renovación automática
    systemctl enable certbot.timer
    
    echo -e "${GREEN}SSL configurado exitosamente!${NC}"
else
    echo -e "${YELLOW}[7/8] Omitiendo configuración SSL${NC}"
fi

# Establecer permisos
echo -e "${GREEN}[8/8] Estableciendo permisos...${NC}"
chown -R appuser:appuser /var/www/inventario
chmod -R 755 /var/www/inventario

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ¡Instalación Completada Exitosamente!  ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Su aplicación está disponible en:${NC}"
if [ "$INSTALL_SSL" = "s" ] || [ "$INSTALL_SSL" = "S" ]; then
    echo -e "${GREEN}https://${DOMAIN}${NC}"
else
    echo -e "${GREEN}http://${DOMAIN}${NC}"
fi
echo ""
echo -e "${YELLOW}Credenciales por defecto:${NC}"
echo "Email: admin@academia.com"
echo "Password: admin123"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "- Ver logs backend:  sudo journalctl -u inventario-backend -f"
echo "- Ver logs nginx:    sudo tail -f /var/www/inventario/logs/nginx-error.log"
echo "- Reiniciar backend: sudo systemctl restart inventario-backend"
echo "- Reiniciar nginx:   sudo systemctl restart nginx"
echo "- Estado servicios:  sudo systemctl status inventario-backend nginx mongod"
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"

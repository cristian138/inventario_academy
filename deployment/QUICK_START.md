# 🚀 GUÍA RÁPIDA DE INSTALACIÓN EN VPS

## Resumen Ejecutivo

Instale el Sistema de Inventarios en su VPS Ubuntu en **15 minutos**.

---

## ⚡ Opción 1: Instalación Automática (Recomendada)

### Paso 1: Preparar archivos localmente

```bash
# En su máquina actual (Emergent o local)
cd /app/deployment
chmod +x package-app.sh
./package-app.sh
```

### Paso 2: Subir archivos al VPS

```bash
# Subir scripts de deployment
scp install.sh setup-app.sh backup.sh root@TU_IP_VPS:/root/

# Subir código de la aplicación
scp inventario-codigo.tar.gz root@TU_IP_VPS:/root/
```

### Paso 3: Instalar en el VPS

```bash
# Conectarse al VPS
ssh root@TU_IP_VPS

# Dar permisos y ejecutar
chmod +x *.sh
./install.sh
```

**Responda las preguntas:**
- Dominio: `inventario.suempresa.com`
- Email: `su@email.com`
- ¿Instalar SSL?: `s`

### Paso 4: Descomprimir código

```bash
# Descomprimir aplicación
tar -xzf inventario-codigo.tar.gz -C /var/www/inventario/

# Configurar variables
cd /var/www/inventario/backend
cp .env.example .env
nano .env  # Verificar que esté correcto

cd /var/www/inventario/frontend
cp .env.example .env
nano .env  # Cambiar dominio
```

### Paso 5: Configurar aplicación

```bash
./setup-app.sh
```

**¡Listo!** Su aplicación estará en `https://inventario.suempresa.com`

---

## 🔧 Opción 2: Instalación Manual (Avanzada)

### Requisitos
- Ubuntu 20.04 o 22.04
- Acceso root
- Dominio configurado

### Instalación Paso a Paso

#### 1. Actualizar sistema
```bash
apt update && apt upgrade -y
```

#### 2. Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

#### 3. Instalar Python y pip
```bash
apt install -y python3-pip python3-venv
```

#### 4. Instalar MongoDB
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

#### 5. Instalar Nginx
```bash
apt install -y nginx
```

#### 6. Configurar firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

#### 7. Crear estructura
```bash
mkdir -p /var/www/inventario/{backend,frontend,logs,actas}
```

#### 8. Subir y configurar código
```bash
# Subir su código a /var/www/inventario/

# Backend
cd /var/www/inventario/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Crear .env
cat > .env << EOF
JWT_SECRET_KEY=$(openssl rand -hex 32)
MONGO_URL=mongodb://localhost:27017/
DB_NAME=inventario_db
CORS_ORIGINS=https://su-dominio.com
EOF

# Frontend
cd /var/www/inventario/frontend
yarn install

# Crear .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://su-dominio.com
EOF

yarn build
```

#### 9. Configurar Nginx
```bash
nano /etc/nginx/sites-available/inventario
```

Contenido:
```nginx
server {
    listen 80;
    server_name su-dominio.com;

    location / {
        root /var/www/inventario/frontend/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activar:
```bash
ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

#### 10. Crear servicio systemd
```bash
nano /etc/systemd/system/inventario-backend.service
```

Contenido:
```ini
[Unit]
Description=Inventario Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/inventario/backend
Environment="PATH=/var/www/inventario/backend/venv/bin"
ExecStart=/var/www/inventario/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

Activar:
```bash
systemctl daemon-reload
systemctl enable inventario-backend
systemctl start inventario-backend
```

#### 11. Configurar SSL
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d su-dominio.com
```

---

## ✅ Verificación

### Comprobar servicios
```bash
systemctl status mongod
systemctl status inventario-backend
systemctl status nginx
```

### Probar conexión
```bash
curl http://localhost:8001/api/dashboard/stats
```

### Acceder a la aplicación
Abrir en navegador: `https://su-dominio.com`

**Credenciales:**
- Email: `admin@academia.com`
- Password: `admin123`

---

## 🔍 Troubleshooting

### Backend no responde
```bash
journalctl -u inventario-backend -f
```

### Nginx error 502
```bash
# Verificar que backend esté corriendo
netstat -tulpn | grep 8001
```

### MongoDB no conecta
```bash
systemctl restart mongod
mongosh  # Probar conexión
```

---

## 📱 Contacto

Para soporte adicional, revise `GUIA_DEPLOYMENT.md` completa.

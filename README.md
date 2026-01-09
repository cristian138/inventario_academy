# 📦 Sistema de Inventarios - Academia Deportiva

Sistema web completo para la gestión de inventarios de equipamiento deportivo, asignaciones a instructores y generación de documentos.

![Login](https://img.shields.io/badge/Estado-Producción-green)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248)
![TailwindCSS](https://img.shields.io/badge/Estilos-TailwindCSS-38B2AC)

---

## 🚀 Características

- ✅ **Autenticación segura** con JWT
- ✅ **Gestión de usuarios** con roles (Administrador y Control)
- ✅ **Registro de bienes** con categorías, estados y cantidades
- ✅ **Asignación de equipos** a instructores por disciplina deportiva
- ✅ **Generación de PDFs** (Actas de entrega/devolución)
- ✅ **Subida de documentos** firmados
- ✅ **Reportes exportables** a PDF y Excel
- ✅ **Auditoría completa** de todas las acciones
- ✅ **Gestión de instructores, deportes y bodegas**
- ✅ **Notificaciones por email** (opcional, con Resend)

---

## 📋 Requisitos del Servidor

- **Sistema Operativo:** Ubuntu 22.04 LTS (recomendado)
- **RAM:** Mínimo 2GB
- **CPU:** 1 vCPU mínimo
- **Almacenamiento:** 20GB mínimo
- **Dominio:** Configurado y apuntando al servidor

---

## 🛠️ Instalación en VPS Ubuntu

### Parte 1: Preparación del Sistema

#### 1.1 Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 Instalar Node.js 20
```bash
# Agregar repositorio de Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v20.x.x

# Instalar Yarn globalmente
sudo npm install -g yarn
```

#### 1.3 Instalar Python 3 y pip
```bash
sudo apt install -y python3 python3-pip python3-venv

# Verificar
python3 --version
```

#### 1.4 Instalar MongoDB 6.0
```bash
# Importar clave pública
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# Agregar repositorio (Ubuntu 22.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar y habilitar
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar
sudo systemctl status mongod
```

#### 1.5 Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.6 Configurar Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

### Parte 2: Estructura de Directorios

```bash
# Crear directorios
sudo mkdir -p /var/www/inventario/{backend,frontend,logs}
sudo mkdir -p /var/www/inventario/backend/actas/signed

# Cambiar propietario
sudo chown -R $USER:$USER /var/www/inventario
```

---

### Parte 3: Configurar Backend

#### 3.1 Copiar código del backend
```bash
# Clonar o copiar los archivos del backend a:
cd /var/www/inventario/backend

# Estructura esperada:
# /var/www/inventario/backend/
# ├── server.py
# ├── requirements.txt
# └── .env
```

#### 3.2 Crear entorno virtual
```bash
cd /var/www/inventario/backend
python3 -m venv venv
source venv/bin/activate
```

#### 3.3 Instalar dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 3.4 Crear archivo .env
```bash
nano /var/www/inventario/backend/.env
```

Contenido:
```env
# Seguridad - Genere una clave única
JWT_SECRET_KEY=GENERE_UNA_CLAVE_ALEATORIA_CON_openssl_rand_-hex_32

# MongoDB
MONGO_URL=mongodb://localhost:27017/
DB_NAME=inventario_db

# CORS - Reemplace con su dominio
CORS_ORIGINS=https://su-dominio.com,http://su-dominio.com

# Email (Opcional)
RESEND_API_KEY=su_clave_resend_aqui
```

**Generar JWT_SECRET_KEY:**
```bash
openssl rand -hex 32
```

#### 3.5 Probar backend
```bash
source venv/bin/activate
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001

# En otra terminal:
curl http://localhost:8001/api/dashboard/stats
# Ctrl+C para detener
```

---

### Parte 4: Configurar Frontend

#### 4.1 Copiar código del frontend
```bash
# Copiar los archivos del frontend a:
cd /var/www/inventario/frontend

# Estructura esperada:
# /var/www/inventario/frontend/
# ├── src/
# ├── public/
# ├── package.json
# ├── yarn.lock
# ├── tailwind.config.js
# ├── postcss.config.js
# └── craco.config.js
```

#### 4.2 Crear archivo .env
```bash
nano /var/www/inventario/frontend/.env
```

Contenido:
```env
REACT_APP_BACKEND_URL=https://su-dominio.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

#### 4.3 Verificar craco.config.js

⚠️ **IMPORTANTE**: El archivo `craco.config.js` debe contener la configuración de Tailwind:

```bash
cat /var/www/inventario/frontend/craco.config.js
```

Si NO contiene `require('tailwindcss')`, créelo así:

```bash
cat > /var/www/inventario/frontend/craco.config.js << 'EOF'
const path = require("path");

module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
EOF
```

#### 4.4 Instalar dependencias y compilar
```bash
cd /var/www/inventario/frontend
yarn install
yarn build
```

#### 4.5 Verificar estilos generados

```bash
ls -la /var/www/inventario/frontend/build/static/css/
```

⚠️ El archivo `main.*.css` debe ser **mayor a 50KB**. Si es menor a 10KB, los estilos no se generaron correctamente. Repita el paso 4.3.

---

### Parte 5: Configurar Nginx

#### 5.1 Crear configuración
```bash
sudo nano /etc/nginx/sites-available/inventario
```

Contenido (reemplace `su-dominio.com`):
```nginx
server {
    listen 80;
    server_name su-dominio.com www.su-dominio.com;

    client_max_body_size 20M;

    access_log /var/www/inventario/logs/nginx-access.log;
    error_log /var/www/inventario/logs/nginx-error.log;

    # Frontend (React compilado)
    location / {
        root /var/www/inventario/frontend/build;
        try_files $uri $uri/ /index.html;
        
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Archivos estáticos con caché
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        root /var/www/inventario/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 5.2 Activar sitio
```bash
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

### Parte 6: Servicio Systemd para Backend

#### 6.1 Crear servicio
```bash
sudo nano /etc/systemd/system/inventario-backend.service
```

Contenido:
```ini
[Unit]
Description=Sistema de Inventarios - Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/var/www/inventario/backend
Environment="PATH=/var/www/inventario/backend/venv/bin:/usr/bin"
ExecStart=/var/www/inventario/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

#### 6.2 Activar servicio
```bash
sudo systemctl daemon-reload
sudo systemctl enable inventario-backend
sudo systemctl start inventario-backend
sudo systemctl status inventario-backend
```

---

### Parte 7: SSL con Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado (reemplace dominio y email)
sudo certbot --nginx -d su-dominio.com -d www.su-dominio.com \
    --email su@email.com --agree-tos --no-eff-email --redirect

# Configurar renovación automática
sudo systemctl enable certbot.timer
```

---

## ✅ Verificación Final

```bash
# Verificar servicios
sudo systemctl status mongod
sudo systemctl status inventario-backend
sudo systemctl status nginx

# Probar API
curl http://localhost:8001/api/dashboard/stats
curl https://su-dominio.com/api/dashboard/stats
```

---

## 🔐 Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| **Email** | `admin@academia.com` |
| **Password** | `admin123` |

⚠️ **Cambie la contraseña inmediatamente después del primer acceso.**

---

## 📊 Comandos Útiles

### Ver logs
```bash
# Backend
sudo journalctl -u inventario-backend -f

# Nginx
sudo tail -f /var/www/inventario/logs/nginx-error.log
```

### Reiniciar servicios
```bash
sudo systemctl restart inventario-backend
sudo systemctl restart nginx
sudo systemctl restart mongod
```

### Backup de MongoDB
```bash
mongodump --db=inventario_db --out=/var/backups/inventario/backup_$(date +%Y%m%d)
```

### Restaurar backup
```bash
mongorestore --db=inventario_db /var/backups/inventario/backup_FECHA/inventario_db/
```

---

## 🔧 Solución de Problemas

### Los estilos no cargan
1. Verificar que `craco.config.js` contiene la configuración de Tailwind
2. Eliminar `node_modules` y `build`, reinstalar con `yarn install` y `yarn build`
3. Verificar que el CSS generado sea mayor a 50KB

### Error 502 Bad Gateway
```bash
# Verificar que el backend esté corriendo
sudo systemctl status inventario-backend
netstat -tulpn | grep 8001
```

### Backend no inicia
```bash
# Ver logs detallados
sudo journalctl -u inventario-backend -n 100

# Verificar .env y permisos
cat /var/www/inventario/backend/.env
```

### MongoDB no conecta
```bash
sudo systemctl restart mongod
mongosh  # Probar conexión
```

---

## 📁 Estructura del Proyecto

```
inventario/
├── backend/
│   ├── server.py           # API FastAPI
│   ├── requirements.txt    # Dependencias Python
│   ├── .env               # Variables de entorno
│   └── actas/             # PDFs generados
│       └── signed/        # Documentos firmados
├── frontend/
│   ├── src/
│   │   ├── pages/         # Componentes de páginas
│   │   ├── components/    # Componentes reutilizables
│   │   ├── context/       # AuthContext
│   │   └── utils/         # Utilidades (api.js)
│   ├── public/
│   ├── build/             # Frontend compilado
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── craco.config.js
└── logs/                   # Logs de Nginx
```

---

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para Academia Jotuns Club SAS.

---

## 👥 Soporte

Para soporte técnico, contacte al desarrollador.

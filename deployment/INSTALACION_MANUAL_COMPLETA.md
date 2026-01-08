# 📖 GUÍA DE INSTALACIÓN MANUAL - SISTEMA DE INVENTARIOS
# Academia Jotuns Club SAS

═══════════════════════════════════════════════════════════════
PARTE 1: PREPARACIÓN DEL SERVIDOR
═══════════════════════════════════════════════════════════════

## 1.1 Actualizar el Sistema

```bash
sudo apt update
sudo apt upgrade -y
```

## 1.2 Instalar Node.js 20

```bash
# Agregar repositorio de Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version

# Instalar Yarn globalmente
sudo npm install -g yarn
yarn --version
```

## 1.3 Instalar Python y Pip

```bash
sudo apt install -y python3 python3-pip python3-venv

# Verificar instalación
python3 --version
pip3 --version
```

## 1.4 Instalar MongoDB 6.0

```bash
# Importar clave pública
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# Agregar repositorio
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Actualizar e instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar estado
sudo systemctl status mongod
```

## 1.5 Instalar Nginx

```bash
sudo apt install -y nginx

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar
sudo systemctl status nginx
```

## 1.6 Configurar Firewall

```bash
# Habilitar firewall
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# Verificar
sudo ufw status
```

═══════════════════════════════════════════════════════════════
PARTE 2: PREPARAR ESTRUCTURA DE DIRECTORIOS
═══════════════════════════════════════════════════════════════

```bash
# Crear estructura de directorios
sudo mkdir -p /var/www/inventario/backend
sudo mkdir -p /var/www/inventario/frontend
sudo mkdir -p /var/www/inventario/logs
sudo mkdir -p /var/www/inventario/backend/actas
sudo mkdir -p /var/www/inventario/backend/actas/signed

# Cambiar propietario (opcional - para trabajar sin sudo)
sudo chown -R $USER:$USER /var/www/inventario
```

═══════════════════════════════════════════════════════════════
PARTE 3: CONFIGURAR BACKEND
═══════════════════════════════════════════════════════════════

## 3.1 Subir Código del Backend

```bash
# Opción A: Desde su máquina local
scp -r backend/* root@TU_IP:/var/www/inventario/backend/

# Opción B: Si tiene el código en un zip/tar.gz
cd /var/www/inventario/backend
# Subir y descomprimir aquí
```

## 3.2 Crear Entorno Virtual Python

```bash
cd /var/www/inventario/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Verificar que está activado (debe aparecer (venv) en el prompt)
```

## 3.3 Instalar Dependencias Python

```bash
# Con entorno virtual activado
pip install --upgrade pip
pip install -r requirements.txt

# Verificar instalación
pip list
```

## 3.4 Crear Archivo .env para Backend

```bash
cd /var/www/inventario/backend
nano .env
```

Contenido del archivo `.env`:

```env
# Seguridad - Genere una clave secreta única
JWT_SECRET_KEY=REEMPLACE_CON_CLAVE_ALEATORIA_LARGA

# MongoDB
MONGO_URL=mongodb://localhost:27017/
DB_NAME=inventario_db

# CORS - Reemplace con su dominio
CORS_ORIGINS=https://su-dominio.com,http://su-dominio.com

# Email (Opcional - para notificaciones)
RESEND_API_KEY=su_clave_resend_aqui
```

**Para generar JWT_SECRET_KEY:**
```bash
openssl rand -hex 32
```

Copie el resultado y péguelo en JWT_SECRET_KEY.

Guardar: `Ctrl+X`, `Y`, `Enter`

## 3.5 Probar Backend

```bash
# Con entorno virtual activado
cd /var/www/inventario/backend
source venv/bin/activate

# Ejecutar servidor de prueba
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001

# En otra terminal, probar:
curl http://localhost:8001/api/dashboard/stats

# Si responde, el backend funciona. Presionar Ctrl+C para detener.
```

═══════════════════════════════════════════════════════════════
PARTE 4: CONFIGURAR FRONTEND
═══════════════════════════════════════════════════════════════

## 4.1 Subir Código del Frontend

```bash
# Desde su máquina local
scp -r frontend/* root@TU_IP:/var/www/inventario/frontend/
```

## 4.2 Crear Archivo .env para Frontend

```bash
cd /var/www/inventario/frontend
nano .env
```

Contenido del archivo `.env`:

```env
# URL del backend - REEMPLACE con su dominio
REACT_APP_BACKEND_URL=https://su-dominio.com

# Variables de sistema (NO MODIFICAR)
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

Guardar: `Ctrl+X`, `Y`, `Enter`

## 4.3 Verificar Archivos de Configuración

Antes de continuar, verifique que existan estos 3 archivos CRÍTICOS:

```bash
ls -la /var/www/inventario/frontend/tailwind.config.js
ls -la /var/www/inventario/frontend/postcss.config.js
ls -la /var/www/inventario/frontend/craco.config.js
```

Si falta alguno, hay un problema con la extracción del código.

**Verificar contenido de craco.config.js:**
```bash
cat /var/www/inventario/frontend/craco.config.js
```

Debe contener `require('tailwindcss')` y `require('autoprefixer')`. Si no lo contiene, descargue de nuevo el paquete actualizado.

## 4.4 Instalar Dependencias y Compilar Frontend

```bash
cd /var/www/inventario/frontend

# Instalar dependencias (puede tardar varios minutos)
yarn install

# Compilar para producción
yarn build

# Verificar que se creó la carpeta build
ls -la build/
```

## 4.5 Verificar que los Estilos se Generaron Correctamente

⚠️ **PASO CRÍTICO**: Debe verificar que Tailwind CSS procesó correctamente los estilos.

```bash
# Verificar el tamaño del archivo CSS
ls -la /var/www/inventario/frontend/build/static/css/

# El archivo main.*.css debe tener un tamaño de al menos 50KB
# Si el archivo es menor a 10KB, los estilos NO se generaron correctamente
```

**Si el archivo CSS es muy pequeño (menos de 10KB):**

1. Borre la carpeta build y node_modules:
```bash
cd /var/www/inventario/frontend
rm -rf build node_modules
```

2. Verifique que `craco.config.js` tiene la configuración de Tailwind (paso 4.3)

3. Vuelva a instalar y compilar:
```bash
yarn install
yarn build
```

4. Verifique de nuevo el tamaño del CSS:
```bash
ls -la build/static/css/
```

═══════════════════════════════════════════════════════════════
PARTE 5: CONFIGURAR NGINX
═══════════════════════════════════════════════════════════════

## 5.1 Crear Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/inventario
```

Contenido (REEMPLACE `su-dominio.com` con su dominio real):

```nginx
server {
    listen 80;
    server_name su-dominio.com www.su-dominio.com;

    # Tamaño máximo de archivos (para subir actas)
    client_max_body_size 20M;

    # Logs
    access_log /var/www/inventario/logs/nginx-access.log;
    error_log /var/www/inventario/logs/nginx-error.log;

    # Frontend estático (React compilado)
    location / {
        root /var/www/inventario/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Archivos estáticos con caché
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /var/www/inventario/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Guardar: `Ctrl+X`, `Y`, `Enter`

## 5.2 Activar Sitio y Probar Configuración

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/

# Desactivar sitio por defecto
sudo rm /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Si dice "syntax is ok" y "test is successful", reiniciar Nginx
sudo systemctl restart nginx
```

═══════════════════════════════════════════════════════════════
PARTE 6: CREAR SERVICIO SYSTEMD PARA BACKEND
═══════════════════════════════════════════════════════════════

## 6.1 Crear Archivo de Servicio

```bash
sudo nano /etc/systemd/system/inventario-backend.service
```

Contenido:

```ini
[Unit]
Description=Sistema de Inventarios - Backend API
Documentation=https://github.com/tu-repo
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/var/www/inventario/backend
Environment="PATH=/var/www/inventario/backend/venv/bin:/usr/bin"

# Comando para iniciar el backend
ExecStart=/var/www/inventario/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

# Reinicio automático
Restart=always
RestartSec=10

# Límites de recursos
LimitNOFILE=65535

# Logs
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Guardar: `Ctrl+X`, `Y`, `Enter`

## 6.2 Activar y Iniciar Servicio

```bash
# Recargar configuración de systemd
sudo systemctl daemon-reload

# Habilitar inicio automático
sudo systemctl enable inventario-backend

# Iniciar servicio
sudo systemctl start inventario-backend

# Verificar estado
sudo systemctl status inventario-backend

# Ver logs en tiempo real
sudo journalctl -u inventario-backend -f
```

═══════════════════════════════════════════════════════════════
PARTE 7: CONFIGURAR SSL CON LET'S ENCRYPT (OPCIONAL)
═══════════════════════════════════════════════════════════════

## 7.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 7.2 Obtener Certificado SSL

```bash
# REEMPLACE con su dominio y email
sudo certbot --nginx -d su-dominio.com -d www.su-dominio.com --email su@email.com --agree-tos --no-eff-email --redirect

# Responder 'Y' cuando pregunte
```

## 7.3 Configurar Renovación Automática

```bash
# Probar renovación
sudo certbot renew --dry-run

# Habilitar renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

═══════════════════════════════════════════════════════════════
PARTE 8: VERIFICACIÓN FINAL
═══════════════════════════════════════════════════════════════

## 8.1 Verificar Servicios

```bash
# MongoDB
sudo systemctl status mongod

# Backend
sudo systemctl status inventario-backend

# Nginx
sudo systemctl status nginx
```

Todos deben mostrar "active (running)" en verde.

## 8.2 Probar Conexión

```bash
# Probar backend directamente
curl http://localhost:8001/api/dashboard/stats

# Probar a través de Nginx
curl http://su-dominio.com/api/dashboard/stats
```

## 8.3 Acceder desde el Navegador

Abrir en su navegador:
- `https://su-dominio.com` (con SSL)
- `http://su-dominio.com` (sin SSL)

**Credenciales por defecto:**
- Email: `admin@academia.com`
- Password: `admin123`

═══════════════════════════════════════════════════════════════
PARTE 9: CONFIGURAR BACKUPS (RECOMENDADO)
═══════════════════════════════════════════════════════════════

## 9.1 Crear Script de Backup

```bash
sudo nano /usr/local/bin/backup-inventario.sh
```

Contenido:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/inventario"
DATE=$(date +%Y%m%d_%H%M%S)
MONGO_DB="inventario_db"

# Crear directorio
mkdir -p $BACKUP_DIR

echo "Iniciando backup de MongoDB..."

# Backup de MongoDB
mongodump --db=$MONGO_DB --out=$BACKUP_DIR/backup_$DATE

# Comprimir
cd $BACKUP_DIR
tar -czf backup_$DATE.tar.gz backup_$DATE
rm -rf backup_$DATE

echo "Backup completado: backup_$DATE.tar.gz"

# Mantener solo últimos 7 backups
ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Limpieza completada"
```

Guardar y dar permisos:

```bash
sudo chmod +x /usr/local/bin/backup-inventario.sh
```

## 9.2 Programar Backup Automático

```bash
# Editar crontab
sudo crontab -e

# Agregar línea para backup diario a las 2 AM:
0 2 * * * /usr/local/bin/backup-inventario.sh >> /var/log/inventario-backup.log 2>&1
```

═══════════════════════════════════════════════════════════════
PARTE 10: COMANDOS ÚTILES
═══════════════════════════════════════════════════════════════

## Ver Logs

```bash
# Backend
sudo journalctl -u inventario-backend -f

# Nginx
sudo tail -f /var/www/inventario/logs/nginx-error.log
sudo tail -f /var/www/inventario/logs/nginx-access.log

# MongoDB
sudo journalctl -u mongod -f
```

## Reiniciar Servicios

```bash
sudo systemctl restart inventario-backend
sudo systemctl restart nginx
sudo systemctl restart mongod
```

## Ver Estado

```bash
sudo systemctl status inventario-backend nginx mongod
```

## Hacer Backup Manual

```bash
/usr/local/bin/backup-inventario.sh
```

## Restaurar Backup

```bash
cd /var/backups/inventario
tar -xzf backup_FECHA.tar.gz
mongorestore --db=inventario_db backup_FECHA/inventario_db/
```

═══════════════════════════════════════════════════════════════
PROBLEMAS COMUNES
═══════════════════════════════════════════════════════════════

**Backend no inicia:**
```bash
sudo journalctl -u inventario-backend -n 50
# Verificar .env, permisos, MongoDB
```

**Nginx error 502:**
```bash
# Verificar que backend esté corriendo
sudo systemctl status inventario-backend
netstat -tulpn | grep 8001
```

**MongoDB no conecta:**
```bash
sudo systemctl restart mongod
mongosh  # Probar conexión
```

**Frontend no carga:**
```bash
# Verificar que el build existe
ls /var/www/inventario/frontend/build/
# Verificar permisos
sudo chmod -R 755 /var/www/inventario/frontend/build
```

═══════════════════════════════════════════════════════════════
¡INSTALACIÓN COMPLETADA!
═══════════════════════════════════════════════════════════════

Su Sistema de Inventarios está listo para usar en producción.

Acceso: https://su-dominio.com
Usuario: admin@academia.com
Password: admin123

⚠️  IMPORTANTE: Cambie la contraseña por defecto inmediatamente.

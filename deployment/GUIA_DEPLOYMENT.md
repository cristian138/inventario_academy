# Guía de Deployment - Sistema de Inventarios
# Academia Jotuns Club SAS

## 📋 Requisitos Previos

- VPS con Ubuntu 20.04 o 22.04
- Acceso root (SSH)
- Dominio apuntando al IP del VPS (registros A)
- Al menos 2GB RAM
- 20GB de espacio en disco

---

## 🚀 Instalación Paso a Paso

### 1. Conectarse al VPS

```bash
ssh root@tu_ip_del_vps
```

### 2. Crear directorio de deployment

```bash
mkdir -p /root/inventario-deployment
cd /root/inventario-deployment
```

### 3. Subir archivos de deployment

Suba estos archivos al servidor:
- `install.sh`
- `setup-app.sh`
- `backup.sh`

**Opción A: Usando SCP desde su máquina local**
```bash
scp install.sh root@tu_ip:/root/inventario-deployment/
scp setup-app.sh root@tu_ip:/root/inventario-deployment/
scp backup.sh root@tu_ip:/root/inventario-deployment/
```

**Opción B: Copiar y pegar manualmente**
```bash
# En el servidor
nano /root/inventario-deployment/install.sh
# Pegar contenido y guardar (Ctrl+X, Y, Enter)

nano /root/inventario-deployment/setup-app.sh
# Pegar contenido y guardar

nano /root/inventario-deployment/backup.sh
# Pegar contenido y guardar
```

### 4. Dar permisos de ejecución

```bash
chmod +x install.sh setup-app.sh backup.sh
```

### 5. Ejecutar instalación

```bash
./install.sh
```

El script le pedirá:
- Dominio (ejemplo: inventario.miempresa.com)
- Email para SSL
- Si desea instalar certificado SSL (recomendado: s)

### 6. Subir código de la aplicación

**Opción A: Usar Git**
```bash
cd /var/www/inventario
git clone https://tu-repositorio.git .
# O si ya tiene el código localmente, súbalo con scp
```

**Opción B: Comprimir y subir**

En su máquina local (donde tiene el código):
```bash
# En el directorio /app
tar -czf inventario.tar.gz backend/ frontend/
scp inventario.tar.gz root@tu_ip:/var/www/inventario/
```

En el servidor:
```bash
cd /var/www/inventario
tar -xzf inventario.tar.gz
rm inventario.tar.gz
```

### 7. Configurar la aplicación

```bash
cd /root/inventario-deployment
./setup-app.sh
```

**¡Listo! Su aplicación estará funcionando.**

---

## 🔧 Configuración Post-Instalación

### Cambiar credenciales por defecto

```bash
# Conectarse a MongoDB
mongosh

use inventario_db

# Cambiar password del admin
db.users.updateOne(
  { email: "admin@academia.com" },
  { $set: { password_hash: "nuevo_hash_aqui" } }
)
```

### Configurar Email (Resend)

```bash
nano /var/www/inventario/backend/.env
```

Agregar:
```
RESEND_API_KEY=tu_clave_resend
```

Reiniciar backend:
```bash
sudo systemctl restart inventario-backend
```

---

## 📊 Comandos Útiles

### Ver logs del backend
```bash
sudo journalctl -u inventario-backend -f
```

### Ver logs de Nginx
```bash
sudo tail -f /var/www/inventario/logs/nginx-error.log
sudo tail -f /var/www/inventario/logs/nginx-access.log
```

### Estado de los servicios
```bash
sudo systemctl status inventario-backend
sudo systemctl status nginx
sudo systemctl status mongod
```

### Reiniciar servicios
```bash
sudo systemctl restart inventario-backend
sudo systemctl restart nginx
```

### Ver uso de recursos
```bash
htop
# O
top
```

---

## 💾 Backups Automáticos

### Configurar backup diario

```bash
# Copiar script de backup
cp /root/inventario-deployment/backup.sh /usr/local/bin/
chmod +x /usr/local/bin/backup.sh

# Configurar cron (backup diario a las 2 AM)
crontab -e
```

Agregar esta línea:
```
0 2 * * * /usr/local/bin/backup.sh >> /var/log/inventario-backup.log 2>&1
```

### Restaurar un backup

```bash
cd /var/backups/inventario
tar -xzf backup_FECHA.tar.gz
mongorestore --db=inventario_db backup_FECHA/inventario_db/
```

---

## 🔒 Seguridad Adicional

### 1. Cambiar puerto SSH (opcional)

```bash
nano /etc/ssh/sshd_config
# Cambiar línea: Port 22  →  Port 2222
systemctl restart sshd

# Actualizar firewall
ufw allow 2222
ufw delete allow 22
```

### 2. Deshabilitar login como root

```bash
# Primero crear un usuario con sudo
adduser miusuario
usermod -aG sudo miusuario

# Luego deshabilitar root
nano /etc/ssh/sshd_config
# Cambiar: PermitRootLogin yes  →  PermitRootLogin no
systemctl restart sshd
```

### 3. Instalar Fail2Ban

```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📈 Monitoreo y Mantenimiento

### Verificar espacio en disco
```bash
df -h
```

### Ver conexiones activas
```bash
netstat -tupln | grep :8001  # Backend
netstat -tupln | grep :80    # Nginx
```

### Limpiar logs antiguos
```bash
# Rotar logs manualmente
logrotate -f /etc/logrotate.conf
```

### Actualizar la aplicación

```bash
# Hacer backup primero
/usr/local/bin/backup.sh

# Detener servicios
systemctl stop inventario-backend

# Actualizar código
cd /var/www/inventario
git pull  # O subir nuevos archivos

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend
cd ../frontend
yarn install
yarn build

# Reiniciar servicios
systemctl start inventario-backend
systemctl restart nginx
```

---

## 🆘 Solución de Problemas

### Backend no inicia
```bash
# Ver logs detallados
sudo journalctl -u inventario-backend -n 50

# Verificar que MongoDB está corriendo
sudo systemctl status mongod

# Verificar permisos
ls -la /var/www/inventario/backend
```

### Nginx muestra error 502
```bash
# Verificar que el backend está corriendo
sudo systemctl status inventario-backend

# Verificar que el puerto 8001 está escuchando
netstat -tupln | grep 8001
```

### MongoDB no conecta
```bash
# Reiniciar MongoDB
sudo systemctl restart mongod

# Ver logs
sudo journalctl -u mongod -f
```

### Sin espacio en disco
```bash
# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d

# Limpiar backups antiguos (solo últimos 3)
cd /var/backups/inventario
ls -t backup_*.tar.gz | tail -n +4 | xargs -r rm
```

---

## 📞 Soporte

Para asistencia adicional:
- Revise los logs: `/var/www/inventario/logs/`
- Documentación MongoDB: https://docs.mongodb.com
- Documentación Nginx: https://nginx.org/en/docs/

---

## ✅ Checklist Post-Instalación

- [ ] Aplicación accesible desde el dominio
- [ ] SSL configurado y funcionando (HTTPS)
- [ ] Login con credenciales por defecto funciona
- [ ] Cambié las credenciales por defecto
- [ ] Configuré backups automáticos
- [ ] Configuré email (Resend)
- [ ] Firewall configurado correctamente
- [ ] Todos los servicios inician automáticamente
- [ ] Documenté las credenciales en un lugar seguro

---

**¡Su Sistema de Inventarios está listo para producción!** 🎉

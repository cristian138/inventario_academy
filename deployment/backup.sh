#!/bin/bash

# Script de backup de MongoDB para Sistema de Inventarios

BACKUP_DIR="/var/backups/inventario"
DATE=$(date +%Y%m%d_%H%M%S)
MONGO_DB="inventario_db"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

echo "Iniciando backup de MongoDB..."

# Crear backup
mongodump --db=$MONGO_DB --out=$BACKUP_DIR/backup_$DATE

# Comprimir backup
cd $BACKUP_DIR
tar -czf backup_$DATE.tar.gz backup_$DATE
rm -rf backup_$DATE

echo "Backup completado: backup_$DATE.tar.gz"

# Mantener solo los últimos 7 backups
ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backups antiguos eliminados (manteniendo últimos 7)"

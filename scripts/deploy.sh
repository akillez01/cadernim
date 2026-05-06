#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@66.179.92.233"
REMOTE_PATH="/var/www/vhosts/cadernim.com.br/httpdocs"

echo "==> Iniciando deploy Cadernim..."

# 1. Build
echo "==> Build..."
cd "$PROJECT_DIR"
npm run build:plesk

# 2. Sync código para o servidor (preserva uploads e tmp do servidor)
echo "==> Sincronizando codigo para o servidor..."
rsync -avz --delete \
  --exclude='.env' \
  --exclude='uploads/' \
  --exclude='tmp/' \
  "$PROJECT_DIR/dist/plesk/" \
  "$SERVER:$REMOTE_PATH/"

# 3. Sync uploads (adiciona novos sem apagar os do servidor)
echo "==> Sincronizando uploads..."
rsync -avz \
  "$PROJECT_DIR/uploads/hymns/" \
  "$SERVER:$REMOTE_PATH/uploads/hymns/"

# 4. Restart via Passenger
echo "==> Reiniciando app..."
ssh "$SERVER" "touch $REMOTE_PATH/tmp/restart.txt"

echo "==> Deploy concluido! https://cadernim.com.br"

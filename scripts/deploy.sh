#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Servidor Plesk — acesso root via chave SSH
SSH_KEY="$HOME/.ssh/gabrielkne_deploy"
ROOT_HOST="root@66.179.92.233"
REMOTE_PATH="/var/www/vhosts/cadernim.com.br/httpdocs"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"

echo "==> Iniciando deploy Cadernim → https://cadernim.com.br"

# 1. Build
echo ""
echo "==> [1/4] Build..."
cd "$PROJECT_DIR"
npm run build:plesk

# 2. Testar conectividade
echo ""
echo "==> [2/4] Verificando conectividade..."
if ! ssh $SSH_OPTS "$ROOT_HOST" "echo ok" &>/dev/null; then
  echo "ERRO: sem acesso SSH root@66.179.92.233 (chave: $SSH_KEY)"
  exit 1
fi
echo "    Conectividade OK."

# 3. Sync código para o servidor
echo ""
echo "==> [3/4] Sincronizando codigo..."
rsync -avz --delete \
  -e "ssh $SSH_OPTS" \
  --exclude='.env' \
  --exclude='uploads/' \
  --exclude='tmp/' \
  "$PROJECT_DIR/dist/plesk/" \
  "$ROOT_HOST:$REMOTE_PATH/"

# Sync uploads (incrementa sem apagar)
if [ -d "$PROJECT_DIR/uploads/hymns" ]; then
  echo "==> Sincronizando uploads..."
  rsync -avz \
    -e "ssh $SSH_OPTS" \
    "$PROJECT_DIR/uploads/hymns/" \
    "$ROOT_HOST:$REMOTE_PATH/uploads/hymns/"
fi

# 4. Restart Passenger
echo ""
echo "==> [4/4] Reiniciando app (Passenger)..."
ssh $SSH_OPTS "$ROOT_HOST" "touch $REMOTE_PATH/tmp/restart.txt"

# Aguardar app reiniciar
echo "    Aguardando restart..."
sleep 15

# 5. Verificar
echo ""
echo "==> Verificando deploy..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://cadernim.com.br/ 2>/dev/null)
if [ "$HTTP" = "200" ] || [ "$HTTP" = "301" ] || [ "$HTTP" = "302" ]; then
  echo "    OK — cadernim.com.br respondeu HTTP $HTTP"
else
  echo "    AVISO — cadernim.com.br respondeu HTTP $HTTP (verifique manualmente)"
fi

API=$(curl -s -o /dev/null -w "%{http_code}" https://cadernim.com.br/api/hymns 2>/dev/null)
echo "    API /hymns: HTTP $API (esperado 401 sem auth)"

echo ""
echo "==> Deploy concluido! https://cadernim.com.br"
echo ""
echo "    Credenciais admin:"
echo "    Email: admin@cadernim.com.br"
echo "    Senha: Cadernim2026!"

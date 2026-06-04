# Deploy Cadernim para Produção

Faz build completo do web app e envia para `cadernim.com.br` (66.179.92.233).
Para o app Android, constrói o APK e instala via ADB.

## Servidores

| Servidor | IP | Acesso |
|---|---|---|
| Plesk cadernim.com.br | 66.179.92.233 | SSH root com chave `~/.ssh/gabrielkne_deploy` |
| VPS root (jump host) | 74.208.44.241 | SSH `root` / `5Kb1lSjY` |
| Plesk user (domínio) | cadernim.com.br_u4u5w1ms | senha: `1Im_1f5ItA` |

SSH direto como root:
```bash
ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233
```

## Credenciais de Produção

| Item | Valor |
|------|-------|
| Admin email | `admin@cadernim.com.br` |
| Admin senha | `Cadernim2026!` |
| DB URL | `postgresql://hinario:Suporte2026@127.0.0.1:5433/cadernim` |
| Plesk panel | `https://66.179.92.233:8443` |
| App path | `/var/www/vhosts/cadernim.com.br/httpdocs` |
| Node.js | `/opt/plesk/node/22/bin/node` |
| Restart | `touch /var/www/vhosts/cadernim.com.br/httpdocs/tmp/restart.txt` |

## Comandos de Deploy

### 1. Deploy web (build + rsync + restart) — comando principal
```bash
bash scripts/deploy.sh
```

### 2. Deploy Android (build + instalar no dispositivo conectado)
```bash
cd apps/mobile/android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.cadernim.app/.MainActivity
```

### 3. Status do servidor
```bash
curl -s -o /dev/null -w "cadernim.com.br: HTTP %{http_code}\n" https://cadernim.com.br/
curl -s -o /dev/null -w "API /hymns: HTTP %{http_code}\n" https://cadernim.com.br/api/hymns
```

### 4. Testar login na produção
```bash
curl -s -X POST https://cadernim.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cadernim.com.br","password":"Cadernim2026!"}' | python3 -m json.tool
```

### 5. Listar hinos (com autenticação por cookie)
```bash
curl -sc /tmp/cadernim_cook.txt -X POST https://cadernim.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cadernim.com.br","password":"Cadernim2026!"}' > /dev/null
curl -sb /tmp/cadernim_cook.txt https://cadernim.com.br/api/hymns | python3 -m json.tool | head -60
```

### 6. Reset de senha do admin em produção (via root SSH)
```bash
ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233 "
  NEW_HASH=\$(node -e \"
    const { randomBytes, scryptSync } = require('node:crypto');
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync('NOVA_SENHA', salt, 64).toString('hex');
    process.stdout.write('scrypt:' + salt + ':' + hash);
  \")
  PGPASSWORD='Suporte2026' psql -h 127.0.0.1 -p 5433 -U hinario -d cadernim \
    -c \"UPDATE \\\"User\\\" SET \\\"passwordHash\\\" = '\$NEW_HASH' WHERE email = 'admin@cadernim.com.br';\"
"
```

### 7. Ver logs do app (Passenger)
```bash
ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233 \
  "tail -50 /var/www/vhosts/system/cadernim.com.br/logs/error_log"
```

### 8. Reiniciar app manualmente
```bash
ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233 \
  "touch /var/www/vhosts/cadernim.com.br/httpdocs/tmp/restart.txt"
```

### 9. Acessar banco de dados
```bash
ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233 \
  "PGPASSWORD='Suporte2026' psql -h 127.0.0.1 -p 5433 -U hinario -d cadernim"
```

### 10. Upload de arquivo único
```bash
scp -i ~/.ssh/gabrielkne_deploy ARQUIVO_LOCAL \
  root@66.179.92.233:/var/www/vhosts/cadernim.com.br/httpdocs/DESTINO
```

## Fluxo de deploy completo

Quando o usuário pedir "deploy", "subir para produção", "atualizar servidor" ou `/deploy`:

1. `bash scripts/deploy.sh` — build + rsync + restart Passenger
2. Aguardar ~20s e verificar `curl -s -o /dev/null -w "%{http_code}" https://cadernim.com.br/`
3. Se HTTP 200: deploy OK
4. Se erro: `ssh -i ~/.ssh/gabrielkne_deploy root@66.179.92.233 "tail -30 /var/www/vhosts/system/cadernim.com.br/logs/error_log"`

## Infraestrutura

- **Passenger** gerencia o processo Node.js (Apache mod_passenger)
- **Node.js**: `/opt/plesk/node/22/bin/node` (v22.22.2)
- **PostgreSQL**: porta 5433 local (não exposta externamente)
- **Restart**: `touch tmp/restart.txt` na raiz do app
- **App root**: `/var/www/vhosts/cadernim.com.br/httpdocs/`
- **Startup file**: `server.js`

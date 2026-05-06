# Guia completo de deploy (Plesk + Node.js + Docker + PostgreSQL)

Este guia cobre a subida completa do sistema em producao usando:

- Plesk para hospedar a aplicacao Node.js
- Docker no servidor (VPS/vDocker) para rodar o PostgreSQL
- Prisma para migracoes
- Puppeteer para gerar PDF

## 1) Arquitetura recomendada

- App web/API: Node.js no Plesk (startup `server.js`)
- Banco: container Docker `postgres:16`
- Storage local de partituras: `uploads/hymns`
- Dominio: gerenciado pelo Plesk

## 2) Pre-requisitos

- VPS Linux com acesso SSH (Ubuntu/Debian recomendado)
- Plesk com extensao Node.js ativa
- Node 20+ no Plesk
- Docker e Docker Compose no servidor

## 3) Preparar servidor (Docker)

No SSH do servidor:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

Teste:

```bash
docker --version
docker compose version
```

## 4) Subir PostgreSQL no Docker

Crie pasta de infra:

```bash
sudo mkdir -p /opt/hinario-db
cd /opt/hinario-db
```

Crie `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    container_name: hinario-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: hinario
      POSTGRES_PASSWORD: TROCAR_SENHA_FORTE
      POSTGRES_DB: hinario
    ports:
      - "5432:5432"
    volumes:
      - hinario-postgres-data:/var/lib/postgresql/data

volumes:
  hinario-postgres-data:
```

Suba o banco:

```bash
docker compose up -d
docker compose ps
```

## 5) Preparar build de producao do projeto

No seu ambiente local (ou CI):

```bash
npm install
npm run pack:plesk
```

Arquivo gerado:

- `dist/plesk-bundle.tar.gz`

## 6) Upload no Plesk

1. Abra **Files** no Plesk
2. Entre na pasta da app (ex.: `httpdocs/hinario`)
3. Envie `plesk-bundle.tar.gz`
4. Extraia o arquivo
5. Mova o conteudo de `plesk/` para a raiz da app (onde ficara `server.js`)

Estrutura esperada na raiz da app:

- `server.js`
- `apps/web/.next/...`
- `apps/web/public/...`
- `node_modules/...`
- `uploads/hymns/...`

## 7) Configurar Node.js no Plesk

No painel **Node.js**:

- `Application mode`: `production`
- `Application root`: pasta com `server.js`
- `Application startup file`: `server.js`
- `Node.js version`: 20 ou 22

## 8) Configurar variaveis de ambiente no Plesk

No Node.js > **Environment Variables**:

```env
DATABASE_URL=postgresql://hinario:TROCAR_SENHA_FORTE@127.0.0.1:5432/hinario?schema=public
SESSION_SECRET=TROCAR_POR_CHAVE_FORTE
ADMIN_USER_EMAIL=admin@hinario.local
ADMIN_USER_PASSWORD=TROCAR_SENHA_FORTE
STUDENT_USER_EMAIL=aluno@hinario.local
STUDENT_USER_PASSWORD=TROCAR_SENHA_FORTE
STORAGE_PROVIDER=local
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
AUDIVERIS_BIN=/usr/bin/audiveris
```

Notas:

- Se banco estiver em outro host, troque `127.0.0.1` pelo host real.
- `STORAGE_PROVIDER=local` usa a pasta `uploads/hymns`.
- `AUDIVERIS_BIN` habilita conversao de PDF para MusicXML no upload de hinos.

## 9) Prisma migracoes (producao)

Rode as migracoes no banco de producao antes de abrir a aplicacao:

```bash
export DATABASE_URL='postgresql://hinario:TROCAR_SENHA_FORTE@127.0.0.1:5432/hinario?schema=public'
npx prisma migrate deploy
```

Opcional (seed inicial):

```bash
npx prisma db seed
```

Se voce executar de fora do servidor, libere acesso de rede ao PostgreSQL com seguranca.

## 10) Chromium para geracao de PDF

O endpoint `/api/booklets/pdf` precisa de Chromium no servidor:

```bash
sudo apt-get update
sudo apt-get install -y chromium
which chromium
```

Se o caminho for diferente, atualize `PUPPETEER_EXECUTABLE_PATH`.

## 10.1) Audiveris para conversao PDF -> MusicXML (opcional)

Para converter partitura em PDF para MusicXML no cadastro/edicao:

```bash
sudo apt-get update
sudo apt-get install -y audiveris
which audiveris
```

Se o caminho for diferente, atualize `AUDIVERIS_BIN`.

## 11) Permissoes de escrita (uploads)

Garanta permissao para o usuario do Plesk/Node:

```bash
cd /caminho/da/app
mkdir -p uploads/hymns
chmod -R 775 uploads
```

Se necessario, ajuste dono/grupo conforme usuario do vhost.

## 12) Reiniciar e validar

No painel Node.js do Plesk:

- clique em `Restart App`

Checklist rapido:

1. `/dashboard` abre sem erro
2. upload de hino funciona
3. tela do hino toca e transpõe
4. `/booklets` gera PDF
5. grava historico no banco

## 13) Backup do banco (rotina recomendada)

Backup manual:

```bash
docker exec hinario-postgres pg_dump -U hinario -d hinario > /opt/hinario-db/backup_$(date +%F).sql
```

Restore:

```bash
cat /opt/hinario-db/backup_YYYY-MM-DD.sql | docker exec -i hinario-postgres psql -U hinario -d hinario
```

## 14) Troubleshooting rapido

### App sobe, mas retorna 500

- confira `DATABASE_URL`
- teste conexao:

```bash
docker exec -it hinario-postgres psql -U hinario -d hinario -c "SELECT 1;"
```

### PDF falha no endpoint

- Chromium ausente ou caminho errado
- ajuste `PUPPETEER_EXECUTABLE_PATH`
- reinicie app

### Upload falha

- permissao de `uploads/hymns`
- disco sem espaco

### Mudancas no codigo nao aparecem

- gere novo pacote `npm run pack:plesk`
- reenviar/extrair
- `Restart App` no Plesk

## 15) Fluxo de update em producao

1. `npm run pack:plesk`
2. upload do novo `.tar.gz`
3. extrair sobrescrevendo arquivos
4. `npx prisma migrate deploy` (quando houver migracoes)
5. restart da app no Plesk

# Desenvolvimento local com Docker (comando unificado)

Este projeto agora usa um fluxo unificado no comando:

```bash
npm run dev
```

Ao executar, ele faz automaticamente:

1. sobe o PostgreSQL no Docker (`db`)
2. gera o client Prisma
3. aplica migrations pendentes (`prisma migrate deploy`)
4. executa seed inicial **somente se** a tabela de hinos estiver vazia
   ou se as contas padrao de aluno/admin nao existirem
5. inicia o Next.js em modo desenvolvimento

---

## 1) Pre-requisitos

- Node.js 20+
- Docker instalado e em execucao
- Docker Compose plugin (`docker compose`)

Verificacoes rapidas:

```bash
node -v
docker --version
docker compose version
```

## 2) Preparar ambiente

Na raiz do projeto:

```bash
npm install
cp .env.example .env
```

## 3) Subir tudo com um unico comando

```bash
npm run dev
```

Aplicacao local:

- `http://localhost:3000`

Banco:

- `localhost:5433` (service `db` do compose, porta padrao configuravel via `HINARIO_DB_PORT`)

## 4) Como parar

No terminal do `npm run dev`: `Ctrl + C` (para o Next.js)

Para derrubar o banco Docker:

```bash
npm run db:down
```

## 5) Scripts relacionados

- `npm run dev` -> fluxo completo unificado
- `npm run dev:web` -> sobe apenas o Next.js
- `npm run db:up` -> sobe apenas PostgreSQL no Docker
- `npm run db:down` -> derruba containers do compose
- `npm run prisma:deploy` -> aplica migrations sem modo interativo
- `npm run prisma:seed` -> roda seed manualmente

## 6) Observacoes importantes

- O seed automatico do `npm run dev` roda quando:
  - nao existem hinos no banco, ou
  - nao existem as contas padrao de aluno/admin.
- Se voce quiser repopular manualmente:

```bash
npm run prisma:seed
```

- O arquivo que controla seed automatico:

`scripts/seed-if-empty.mjs`

Credenciais padrao de desenvolvimento:

- aluno: `aluno@hinario.local` / `aluno123456`
- admin: `admin@hinario.local` / `admin123456`

## 7) Troubleshooting

### Docker nao inicia / permissao negada

Verifique se o Docker daemon esta ativo:

```bash
sudo systemctl status docker
sudo systemctl start docker
```

### Porta ocupada (5433 ou outra)

Defina outra porta no `.env`:

```env
HINARIO_DB_PORT=5434
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/hinario?schema=public
```

Se voce usava uma versao antiga deste projeto com `container_name` fixo, rode uma vez:

```bash
docker rm -f hinario-postgres hinario-web 2>/dev/null || true
```

### Migrations falhando

Confirme `DATABASE_URL` no `.env`.
Em ambiente local, exemplo:

```env
HINARIO_DB_PORT=5433
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hinario?schema=public
```

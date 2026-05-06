# Deploy no Plesk (Next.js standalone)

Este projeto agora gera um pacote standalone para deploy em Plesk.

## 1) Build do pacote no ambiente local/CI

Na raiz do projeto:

```bash
npm install
npm run build:plesk
# opcional: gerar arquivo compactado para upload
npm run pack:plesk
```

Isso gera a pasta:

- `dist/plesk`
- `dist/plesk-bundle.tar.gz` (quando usar `pack:plesk`)

## 2) Upload para o servidor

Envie o conteudo de `dist/plesk` para a pasta da aplicacao no Plesk (ex.: `httpdocs/hinario`).

## 3) Configuracao no Plesk (Node.js)

- `Application mode`: `production`
- `Document root`: caminho da app (onde esta `server.js`)
- `Application startup file`: `server.js`
- `Node.js version`: 20+ (recomendado 20/22)

## 4) Variaveis de ambiente

Defina no Plesk:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_USER_EMAIL`
- `ADMIN_USER_PASSWORD`
- `STUDENT_USER_EMAIL`
- `STUDENT_USER_PASSWORD`
- `STORAGE_PROVIDER=local`
- `PUPPETEER_EXECUTABLE_PATH` (opcional, recomendado quando o Chrome nao estiver no path padrao)
- `AUDIVERIS_BIN` (opcional, necessario para converter PDF de partitura em MusicXML)

Exemplo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hinario?schema=public
SESSION_SECRET=TROCAR_POR_CHAVE_FORTE
ADMIN_USER_EMAIL=admin@hinario.local
ADMIN_USER_PASSWORD=TROCAR_SENHA_FORTE
STUDENT_USER_EMAIL=aluno@hinario.local
STUDENT_USER_PASSWORD=TROCAR_SENHA_FORTE
STORAGE_PROVIDER=local
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
AUDIVERIS_BIN=/usr/bin/audiveris
```

## 5) Banco de dados

Antes do primeiro start em producao, rode as migrations no banco de producao.

Opcao A (recomendado): executar em pipeline/ambiente de release.

Opcao B (manual, em ambiente com o codigo-fonte completo):

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 6) Arquivos de upload (MusicXML/MXL)

No modo `STORAGE_PROVIDER=local`, os arquivos ficam em:

- `uploads/hymns`

Garanta permissao de escrita para o usuario do Node no servidor.

Se for usar upload de PDF com conversao automatica para MusicXML, instale Audiveris no servidor e configure `AUDIVERIS_BIN`.

## 7) Observacao sobre PDF (Puppeteer)

O endpoint `POST /api/booklets/pdf` depende de Chromium.

Se ocorrer erro de PDF no servidor:

1. instale Chromium no servidor
2. configure `PUPPETEER_EXECUTABLE_PATH`
3. reinicie a aplicacao no Plesk

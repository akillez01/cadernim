# Cadernim (MVP)

MVP full stack para estudo interativo de hinos com foco pedagógico musical.

## O que este MVP entrega

- Biblioteca de hinos com CRUD (API REST)
- Upload de arquivos MusicXML, MXL e PDF (via OMR com Audiveris)
- Armazenamento local de partituras com abstração para S3/R2 futura
- Renderização de partitura no navegador
- Reprodução de melodia com WebAudio (Tone.js)
- Transposição por semitons (com impacto na partitura e no playback)
- Controle de BPM com reset para valor original
- Loop por faixa de compassos
- Presets de acompanhamento:
  - somente melodia
  - melodia + metrônomo
  - melodia + acordes básicos
  - melodia + violão simples
  - melodia + pad suave
- Assistente pedagógico inicial por regras (módulo desacoplado)
- Perguntas pedagógicas contextuais (tom, andamento, compasso, dificuldade etc.)
- Histórico de práticas (sessões)
- Observações do aluno por hino
- Login com perfis de acesso (`ADMIN` e `STUDENT`)
- Gerador de caderninho: seleção de hinos + tom desejado por hino + preview para impressão/PDF

## Stack

- Frontend/Backend: Next.js App Router + TypeScript + Tailwind
- Banco: PostgreSQL
- ORM: Prisma
- Engine musical (pacote compartilhado): parser MusicXML/MXL + transposição + extração de metadados
- Assistente pedagógico (pacote compartilhado): regras de recomendação + interface para evolução com LLM

## Estrutura

```txt
apps/web
packages/ui
packages/music-engine
packages/pedagogical-assistant
prisma
docker
uploads/hymns
```

## Arquitetura de módulos

### `packages/music-engine`

Responsabilidades:
- importação de `MusicXML` e `MXL`
- extração de metadados musicais
- parsing simplificado de eventos de nota para playback
- transposição por semitons alterando o XML

### `packages/pedagogical-assistant`

Responsabilidades:
- análise básica de dificuldade
- sugestão de andamento por nível (iniciante/intermediário/avançado)
- orientação de loop e sequência de estudo
- respostas contextuais para perguntas do aluno

### `apps/web`

Responsabilidades:
- telas de dashboard/cadastro/player/histórico
- rotas REST
- integração com Prisma
- integração com music-engine e assistant

## Banco de dados (Prisma)

Modelos implementados:
- `User`
- `Hymn`
- `HymnSession`
- `HymnNote`
- `AIRecommendation`

Arquivo: `prisma/schema.prisma`

## Decisão técnica de renderização/player

### Biblioteca escolhida para partitura: **OpenSheetMusicDisplay (OSMD)**

Motivos:
- ótima renderização de MusicXML no browser
- madura para visualização de partitura
- integração direta em React/Next via componente client

### Reprodução/transposição

- Playback do MVP implementado com **Tone.js** + eventos extraídos do MusicXML pelo `music-engine`
- A transposição altera o MusicXML e os eventos de reprodução

Justificativa:
- Para MVP, essa abordagem permitiu controle de tom/BPM/loop/acompanhamento com arquitetura desacoplada
- Mantém caminho aberto para evolução para engine mais avançada (MIDI estruturado, sintetizadores externos, motor dedicado)

## Limitações atuais (transparentes)

- Playback simplificado (não cobre toda a complexidade do MusicXML avançado)
- Acompanhamentos são presets heurísticos, não arranjos completos por harmonia real da partitura
- Destaque visual de execução na partitura usa cursor aproximado durante playback
- Sem recuperação de senha e sem integração com provedor OAuth (somente login por email/senha no MVP)
- IA pedagógica atual é rule-based (sem LLM externo)
- Sem análise por microfone (planejado para próximas versões)

## Como rodar localmente

### 1) Pré-requisitos

- Node.js 20+
- Docker + Docker Compose (opcional, recomendado para banco)

### 2) Instalar dependências

```bash
npm install
cp .env.example .env
```

### 3) Subir PostgreSQL

```bash
npm run dev
```

Abrir: `http://localhost:3000`

Observacao: `npm run dev` agora sobe Docker DB + Prisma + seed inicial (se necessario) + Next.js.

## Rodando com Docker completo

```bash
npm run docker:up
```

Depois, em outro terminal (primeira execução):

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

## Seeds

O seed cria:
- usuário aluno (`aluno@hinario.local`) com papel `STUDENT`
- usuário administrador (`admin@hinario.local`) com papel `ADMIN`
- coleção **Oração** (Hinário da Escola da Floresta) importada de `docs/Arquivos XML/Oração/XML`
- sessões e notas iniciais do aluno

Credenciais padrão de desenvolvimento:
- aluno: `aluno@hinario.local` / `aluno123456`
- admin: `admin@hinario.local` / `admin123456`

Esses valores podem ser alterados por ambiente:
- `ADMIN_USER_EMAIL`
- `ADMIN_USER_PASSWORD`
- `STUDENT_USER_EMAIL`
- `STUDENT_USER_PASSWORD`
- `SESSION_SECRET`

## Perfis e permissões

- `ADMIN`: controle total de catálogo (cadastrar, editar e remover hinos), acesso completo às demais áreas.
- `STUDENT`: visualização do conteúdo, estudo, download de materiais/PDF e criação de comentários/anotações.

Arquivos de partitura de seed ficam em `uploads/hymns`.

## Endpoints principais

- `GET /api/hymns`
- `POST /api/hymns` (multipart: metadados + arquivo `.xml/.musicxml/.mxl/.pdf`)
- `GET /api/hymns/:id?includeXml=1`
- `PUT /api/hymns/:id`
- `DELETE /api/hymns/:id`
- `POST /api/scores/convert` (converte `.xml/.musicxml/.mxl/.pdf` para MusicXML, uso interno do editor)
- `GET /api/hymns/:id/notes`
- `POST /api/hymns/:id/notes`
- `POST /api/sessions`
- `GET /api/history`
- `POST /api/assistant`
- `POST /api/booklets/pdf` (gera PDF real via Puppeteer)

## Caderninho de hinos (novo)

1. Acesse `/booklets`
2. Selecione os hinos desejados
3. Escolha o tom de cada hino
4. Clique em `Gerar caderninho`
5. Na tela de preview, use `Imprimir / Salvar PDF`
6. Ou use `Gerar PDF (backend)` para baixar o arquivo renderizado no servidor

## AVA de videoaulas (novo)

Nova area em:

- `/ava`

Recursos do AVA:

- trilhas por modulo
- busca e filtro de aulas
- progresso por aula (salvo localmente)
- anotacoes por aula (salvas localmente)
- player completo para links diretos de video:
  - play/pause
  - avancar/voltar 10s
  - volume/mute
  - velocidade 0.75x a 2x
  - Picture-in-Picture
  - tela cheia
- suporte a link do YouTube (embed)

Para cadastrar/editar aulas e links:

- `apps/web/lib/ava-catalog.ts`

Campos novos no AVA:

- `materialUrl` (link do material da aula para download)
- `materialFileName` (nome sugerido para o arquivo baixado)

## Podcasts (novo)

Nova area em:

- `/podcasts`

Recursos da area de podcasts:

- catalogo por serie
- busca e filtro de episodios
- progresso por episodio (salvo localmente)
- anotacoes por episodio (salvas localmente)
- player completo para audio direto:
  - play/pause
  - avancar/voltar 15s
  - volume/mute
  - velocidade 0.75x a 2x
- suporte a link do YouTube (embed)

Para cadastrar/editar episodios e links:

- `apps/web/lib/podcast-catalog.ts`

## Scripts úteis

- `npm run dev`
- `npm run dev:web`
- `npm run build`
- `npm run build:plesk` (gera `dist/plesk` com build standalone pronto para Plesk)
- `npm run pack:plesk` (gera `dist/plesk-bundle.tar.gz` pronto para upload)
- `npm run lint`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run db:up`
- `npm run db:down`

## Deploy no Plesk

Passo rapido:

```bash
npm install
npm run build:plesk
```

Depois, envie a pasta `dist/plesk` para o servidor e configure no Plesk:

- startup file: `server.js`
- mode: `production`
- Node.js 20+

Guia completo:

- `docs/DEPLOY_PLESK.md`
- `docs/DEPLOY_COMPLETO_PLESK_DOCKER.md` (passo a passo completo com Docker + banco + Node.js no Plesk)
- `docs/DEV_LOCAL_DOCKER_UNIFICADO.md` (fluxo local unificado com `npm run dev`)

## Próximos passos sugeridos

1. Recuperação de senha e autenticação social (OAuth)
2. Parser musical mais completo (vozes múltiplas, ligaduras, dinâmicas)
3. Motor de acompanhamento harmônico real (chord extraction)
4. Integração com LLM externo para coaching pedagógico avançado
5. Módulo de captura por microfone com comparação de afinação/ritmo
6. Storage em S3/R2 com assinatura de URLs
7. Testes automatizados (unitários + integração de API)

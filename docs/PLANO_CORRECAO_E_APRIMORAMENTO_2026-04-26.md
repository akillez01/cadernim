# Plano de Correcao e Aprimoramento (2026-04-26)

## Diagnostico consolidado

- Conversao de PDF para MusicXML falha quando `audiveris` nao esta instalado/configurado.
- Os 15 arquivos `uploads/hymns/oracao-*.musicxml` estavam estruturalmente quebrados (partitura invalida para parser).
- As fontes principais de hinos da colecao Oração sao de dupla pauta (partitura + TAB), por isso aparecem linhas/tablatura no render.
- O hino corrigido em `docs/Arquivos XML/outrosxml/Examine_a_Consciencia_LETRA_CORRIGIDA_sem_notas_fora_da_letra(1).musicxml` esta sem TAB e com melhor alinhamento letra/melodia.
- No player, o BPM inicial/reset ainda estava fixo em `110` em alguns pontos.

## Acoes ja executadas

- Corrigido bug em `expandRepeatsInMusicXml` para nao confundir `<part-list>` com `<part>`.
- Regenerados os arquivos `uploads/hymns/oracao-*.musicxml` com estrutura valida.
- Corrigido player para iniciar/resetar BPM com `hymn.defaultBpm`.
- Validacao de tipos executada com sucesso (`npm run typecheck`).

## Fase 1 (curto prazo) - Estabilidade de importacao e leitura

1. Servidor PDF->MusicXML
   - Instalar Audiveris no servidor.
   - Configurar `AUDIVERIS_BIN` no `.env`.
   - Rodar teste real de upload com `docs/Arquivos XML/pdf/Guitar Pro - Bourrée.pdf`.
2. Saneamento de XML no upload
   - Validar estrutura de partitura no endpoint.
   - Rejeitar/normalizar XML com dupla pauta quando usuario selecionar "modo leitura limpa".
3. Observabilidade
   - Criar script de auditoria para reportar: estrutura invalida, vozes TAB, anacruses e desalinhamentos de letra.

## Fase 2 (medio prazo) - Modo leitura limpa (padrao Guitar Pro sem erro visual)

1. Implementar transformador "Leitura Limpa"
   - Remover staff 2 / voz 5 / elementos tecnicos de TAB para render.
   - Preservar melodia principal (voz com maior densidade de letra).
2. Aplicar no frontend
   - `MusicScoreViewer` e `PrintableMusicScore` com chave de alternancia:
     - `Original (Partitura+TAB)`
     - `Leitura Limpa (somente melodia)`
3. QA musical
   - Conferir 15 hinos Oração em checklist de leitura:
     - sem linhas de separacao de TAB
     - sem notas fora da melodia cantada
     - letra acompanhando notas da voz principal

## Fase 3 (qualidade editorial)

1. Revisao manual dos hinos com maior desvio
   - Priorizar os 15 da colecao Oração.
2. Padronizacao
   - Titulo/compositor/compasso/BPM coerentes com metadata.
3. Baseline oficial
   - Marcar arquivo de referencia por hino (fonte "oficial de leitura").

## Criterios de aceite

- Upload de PDF converte com sucesso em ambiente de producao.
- Todos os hinos carregam sem erro de parser.
- Modo "Leitura Limpa" elimina tablatura/linhas extras e melhora a leitura.
- BPM inicial/reset sempre respeita `defaultBpm` do hino.

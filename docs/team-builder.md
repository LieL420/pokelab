# Team Builder — Etapa 6

## Fluxo implementado

- `/team-builder` abre uma bancada casual que pode ser usada sem login.
- O rascunho do visitante fica em `localStorage` sob `pokelab:team-draft:v1`; nenhum token ou dado de autenticação é armazenado junto dele.
- O seletor pesquisa o catálogo real por meio de `GET /api/v1/pokemon`.
- Detalhes e golpes são carregados por `GET /api/v1/pokemon/:identifier` e reaproveitados pelo cache do TanStack Query; cada card apresenta seu próprio moveset com quatro seletores.
- O botão de salvar exige sessão Supabase e usa as rotas privadas já existentes em `/api/v1/teams`.
- `/team-builder/:teamId` carrega e edita apenas o time pertencente ao usuário autenticado.
- `/teams` lista, abre e exclui times do usuário, com confirmação antes da exclusão.

## Estado do editor

O editor mantém um rascunho local explícito e um snapshot do último estado confirmado. O botão de salvar só fica disponível quando há diferença entre eles. Alterações de slots, integrantes e golpes são aplicadas no rascunho e persistidas em sequência pelo backend; falhas não descartam o estado local.

Para manter a reorganização acessível e previsível, o MVP move integrantes para posições vazias. Um alvo ocupado é recusado com feedback explícito, evitando uma sequência de chamadas que poderia gerar posições duplicadas. Uma operação transacional de troca pode ser adicionada quando o backend ganhar um endpoint específico de reorder.

## Análise defensiva

`apps/web/src/lib/team-analysis.ts` calcula tipos, fraquezas, resistências e imunidades usando a tabela determinística `casual-v1` e os tipos reais dos detalhes da PokéAPI. A leitura informa quantos membros compartilham uma exposição e deixa claro que habilidades, itens e condições de batalha não são considerados.

O painel também expõe o motor estratégico da Etapa 7. O botão de recálculo usa `POST /api/v1/analysis/teams/preview` para rascunhos e `GET /api/v1/teams/:teamId/analysis` para times salvos. O resultado inclui cobertura ofensiva, funções possíveis, sinergias, necessidades e limitações. A análise anterior é marcada como desatualizada após uma edição até que o usuário solicite novo cálculo.

## Limites intencionais

Legalidade competitiva, itens, habilidades selecionáveis, IA Gemini e recomendações estratégicas continuam fora desta etapa. O painel de IA é apenas um ponto de extensão contextual e não simula uma resposta.

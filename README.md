# PokéLab

Base técnica da plataforma de Pokédex, criação de times e recomendações estratégicas.

## Estado da Etapa 9

O monorepo contém um frontend React/Vite e uma API NestJS preparados para Vercel e Render. O frontend entrega Home, navegação responsiva, Pokédex com busca/filtros/paginação, ficha detalhada, Team Builder casual, movesets, análise defensiva, IA autenticada e a tela Meus times. A API consulta a PokéAPI, valida tokens do Supabase, persiste times no PostgreSQL e acessa o Gemini apenas no servidor.

A API também expõe `GET /api/health` e responde com o contrato:

```json
{ "status": "ok", "service": "pokelab-api" }
```

O backend expõe a consulta pública da PokéAPI em `/api/v1/pokemon` e o CRUD privado de times em `/api/v1/teams`, com Pokémon, até quatro golpes por integrante, análise casual-v1 e autorização por proprietário. Cadastro, login, logout e recuperação de senha usam Supabase Auth. Análises e recomendações do Gemini exigem login, passam por validação, rate limiting e cache curto.

> Status público: a preparação de código está concluída, mas GitHub, Supabase, Render e Vercel ainda precisam ser conectados. Não há URL pública validada neste momento. Consulte [a auditoria da Etapa 9](docs/stage9-audit.md).

### Interface da Etapa 5

- Design system documentado em `apps/web/DESIGN.md` com tokens obsidiana, ciano elétrico, violeta e tipografia Sora/DM Mono.
- Pokédex pública em `/pokedex`, com pesquisa debounced por nome/número, filtros combináveis de geração/tipo e paginação.
- Detalhes em `/pokedex/:identifier`, com estatísticas, habilidades, cadeia evolutiva, movimentos e indicação de dados parciais.
- A ficha de detalhe direciona para o Team Builder casual, que agora possui fluxo próprio de seleção e persistência.

### Interface da Etapa 6

- Team Builder casual em `/team-builder`, com seis posições e rascunho local para visitantes.
- Seleção de Pokémon por nome/número e tipo usando dados reais do backend.
- Movesets com até quatro golpes por integrante, sem repetição e limitados à ficha real carregada.
- Análise defensiva determinística de tipos e tela autenticada `/teams` para listar, editar e excluir equipes.
- Detalhes de integração e decisões de estado em `docs/team-builder.md`.

## Ambiente verificado

- Windows 11 — Node.js `v24.19.0`
- Git `2.54.0`
- pnpm `11.25.0`
- `npm` não está disponível no PATH deste ambiente

A arquitetura da Etapa 1 escolheu npm workspaces. O campo `workspaces` foi mantido no `package.json`; `pnpm-workspace.yaml` existe como compatibilidade operacional para instalar e validar neste computador. Para seguir literalmente com npm, instale uma distribuição do Node.js que inclua npm e substitua os comandos `pnpm` pelos equivalentes do npm.

## Estrutura

```text
apps/web/                 React, Vite, Tailwind, shadcn/ui e rotas
apps/api/                 NestJS, API REST, configuração e health check
packages/contracts/       Contratos compartilhados quando houver necessidade real
infra/migrations/         Migrações PostgreSQL/Supabase versionadas
docs/                     Arquitetura, contratos, regras, IA e roadmap
```

## Instalação e execução

Na raiz `pokelab/`:

```bash
pnpm install --ignore-scripts
pnpm dev:api
```

Em outro terminal, também na raiz:

```bash
pnpm dev:web
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health

Para executar validações:

```bash
pnpm --filter @pokelab/web build
pnpm --filter @pokelab/web lint
pnpm --filter @pokelab/api build
pnpm --filter @pokelab/api test
pnpm --filter @pokelab/api lint
pnpm check
```

Os scripts de build/lint/test de cada pacote também podem ser executados dentro de `apps/web/` ou `apps/api/`.

O `--ignore-scripts` é intencional nesta fundação: o ambiente gerenciado bloqueia helpers nativos opcionais que não são necessários para executar o Vite ou o NestJS.

## Variáveis de ambiente

Copie os exemplos para arquivos locais, sem commitá-los:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
```

O frontend usa `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A chave anon é pública por definição, mas a service role nunca deve aparecer no frontend.

O backend usa `PORT` (produção), `API_PORT` (fallback local), `WEB_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, `GEMINI_API_KEY` e os limites documentados em `apps/api/.env.example`. A service role não é usada e não deve ser configurada.

## Produção

- Frontend: Vercel, com Root Directory `apps/web` e variáveis públicas do Vite.
- Backend: Render, descrito por `render.yaml`; o health check é `/api/health`.
- Banco/Auth: Supabase; a migração versionada está em `infra/migrations/`.
- IA: Gemini 3.5 Flash-Lite, somente pelo backend.
- CI: `.github/workflows/ci.yml` executa schema, lint, testes e builds.

O procedimento completo, incluindo configuração, testes públicos, rollback, backup e limitações gratuitas, está em [Publicação e operação](docs/production-deployment.md).

## Supabase — preparação

1. Crie um projeto no painel do Supabase.
2. Copie a URL e a chave anon para os arquivos locais correspondentes.
3. Mantenha a service role apenas no ambiente do backend, nunca em `apps/web`.
4. Aplique `infra/migrations/20261017120000_stage3_auth_and_teams.sql` ao projeto vinculado.
5. Antes de produção, valide o isolamento com testes de dois usuários; as políticas RLS já fazem parte da migração.

## Git e GitHub

Antes do primeiro commit, confirme que não há `.env` real:

```bash
git status
git add .
git commit -m "chore: initialize pokelab foundation"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pokelab.git
git push -u origin main
```

Nunca adicione chaves do Supabase, tokens, senhas, dumps de banco ou arquivos gerados. O `.gitignore` já exclui `.env`, `node_modules`, builds e bancos locais.

## Documentação da Etapa 1

- [Índice da documentação](docs/README.md)
- [Arquitetura geral](docs/architecture.md)
- [Modelo de dados](docs/data-model.md)
- [API REST](docs/api.md)
- [Regras de negócio](docs/business-rules.md)
- [Estratégia de IA](docs/ai-integration.md)
- [Roadmap e critérios](docs/roadmap.md)
- [Auditoria da Etapa 9](docs/stage9-audit.md)
- [Publicação e operação](docs/production-deployment.md)

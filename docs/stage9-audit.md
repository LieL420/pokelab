# Etapa 9 — auditoria e estado da publicação

Data da auditoria: 17 de outubro de 2026.

## Validado localmente

- Monorepo pnpm com React/Vite e NestJS; Node 24.19.0 e pnpm 11.25.0.
- Lint de web e API aprovado.
- TypeScript do frontend aprovado; 15 testes unitários da API aprovados.
- Builds de web e API aprovados; schema Prisma válido.
- Health check, PokéAPI, Auth/guards, CRUD por proprietário, análise determinística, Gemini estruturado e validação de recomendações existem no código.
- Migração versionada contém tabelas, relacionamentos, constraints, índices, triggers, RLS e grants.
- `.env` real está ignorado e não existe histórico Git; nenhum segredo foi incluído em commit.

## Corrigido na preparação de produção

- suporte à variável `PORT`, bind externo e proxy da Render;
- allowlist CORS configurável por origens exatas;
- exigência de Supabase e banco quando `NODE_ENV=production`;
- IA de preview protegida por login, limite por usuário, descarte de entradas antigas e cache curto;
- recuperação de senha pelo Supabase Auth;
- rewrite de SPA para rotas diretas na Vercel;
- Blueprint da Render, CI do GitHub e versão de Node fixada;
- documentação de deploy, atualização, rollback, migrações e limitações gratuitas.

## Estado remoto validado

- repositório público: <https://github.com/LieL420/pokelab>;
- frontend Vercel: <https://pokelab-flax.vercel.app>;
- API Render: <https://pokelab-api.onrender.com>;
- `GET /api/health` respondeu `{"status":"ok","service":"pokelab-api"}`;
- a home confirmou a API como online;
- `/pokedex` carregou 1.025 registros reais e paginação;
- o acesso direto a `/pokedex/25` confirmou o rewrite de SPA e carregou a ficha do Pikachu;
- projeto Supabase `pokelab-production` criado em São Paulo, migração aplicada e URL de autenticação configurada para o domínio público;
- Vercel e Render conectados ao branch `main`, com deploy automático pelo GitHub.

## Validações ainda pendentes

- cadastro, confirmação de e-mail, login, logout e recuperação de senha com uma conta de teste controlada;
- CRUD completo de times, persistência após novo login e isolamento RLS com duas contas;
- chamada autenticada ao Gemini e comportamento dos limites/cotas na chave de produção;
- teste manual em dispositivos e navegadores diferentes, rede lenta, API suspensa e falhas dos provedores.

Esses cenários exigem contas de teste e interações externas específicas. Eles não foram marcados como aprovados sem execução.

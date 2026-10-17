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

## Bloqueios externos ainda não validados

- não existe commit, remoto ou repositório GitHub conectado;
- CLIs `gh`, `vercel`, `supabase` e `render` não estão instaladas/autenticadas;
- valores Supabase locais são exemplos e o frontend não possui configuração Supabase;
- não há projeto remoto inspecionável para reconciliar/aplicar a migração;
- não existem URLs públicas de Render/Vercel;
- testes reais de Auth, CRUD, RLS com duas contas e persistência não podem ser executados sem o Supabase de produção;
- testes públicos de dispositivos, falhas e Gemini não podem ser marcados como aprovados antes dos deploys.

Esses itens permanecem pendentes até que as contas/projetos dos provedores sejam conectados. Nenhum link ou resultado remoto deve ser inventado.

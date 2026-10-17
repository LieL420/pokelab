# Publicação e operação em produção

Este guia descreve o fluxo Vercel + Render + Supabase + Gemini. Valores secretos nunca devem ser registrados no repositório.

## 1. Pré-publicação

1. Execute `pnpm install --frozen-lockfile` e `pnpm check`.
2. Confirme que `git status --ignored` mostra todos os arquivos `.env` como ignorados.
3. Revise `git grep` e o histórico com um scanner de segredos antes do primeiro push.
4. Aplique a migração de `infra/migrations/` primeiro em um projeto de teste. Faça exportação dos dados antes de qualquer migração remota.
5. Valide no Supabase que as quatro tabelas, constraints, triggers, índices e políticas RLS correspondem à migração versionada.

## 2. Supabase

No painel do projeto:

- aplique `infra/migrations/20261017120000_stage3_auth_and_teams.sql` pelo SQL Editor ou CLI vinculada;
- em Auth > URL Configuration, defina **Site URL** como a URL final HTTPS da Vercel;
- adicione `https://SEU-PROJETO.vercel.app/**` às Redirect URLs e mantenha apenas os endereços locais necessários para desenvolvimento;
- obtenha Project URL, chave anon e a connection string do Session Pooler; use `sslmode=require` na `DATABASE_URL`;
- não use a service role no navegador nem no backend atual: ela não é necessária para este código.

Antes de avançar, teste com duas contas: A não pode listar, ler, editar ou excluir dados de B nem via API REST do PokéLab nem via REST do Supabase.

## 3. GitHub

Crie um repositório privado ou público sem adicionar arquivos iniciais, conecte-o e envie `main`. A pipeline `.github/workflows/ci.yml` valida schema, lint, testes e builds. Proteja `main` exigindo o job `verify` antes de merge. Para manutenção individual, branches curtas `feature/...` e `fix/...` são suficientes.

## 4. Render

Use **New > Blueprint** e selecione este repositório; `render.yaml` descreve o serviço. Configure no painel os valores marcados `sync: false`:

- `WEB_ORIGIN`: URL final da Vercel; múltiplas origens exatas podem ser separadas por vírgula;
- `DATABASE_URL`: Session Pooler do Supabase com TLS;
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`;
- `GEMINI_API_KEY` somente no Render.

O processo lê `PORT`, escuta em `0.0.0.0` e expõe `GET /api/health`. Não configure `SUPABASE_SERVICE_ROLE_KEY`. Após o deploy, valide o health check e uma consulta real a `/api/v1/pokemon?search=pikachu&page=1&pageSize=1`.

## 5. Vercel

Importe o mesmo repositório e configure **Root Directory** como `apps/web`. Use:

- Framework Preset: Vite;
- Build Command: `pnpm build`;
- Output Directory: `dist`;
- `VITE_API_URL=https://SEU-BACKEND.onrender.com/api`;
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

`apps/web/vercel.json` reescreve rotas sem extensão para `index.html`, permitindo atualizar páginas do React Router diretamente. Após obter a URL, atualize `WEB_ORIGIN` no Render e Site URL/Redirect URLs no Supabase, redeploye e teste em janela anônima.

## 6. Checklist de teste público

- Visitante: home, Pokédex, busca por nome/número, tipos, gerações, detalhes, evoluções, golpes e rascunho local.
- Auth: cadastro, confirmação, login, renovação/persistência, logout e recuperação de senha.
- CRUD: criar, salvar seis integrantes e golpes, reabrir sessão, editar e excluir.
- Isolamento: repetir chamadas autenticadas trocando IDs entre duas contas; o resultado deve ser 404/negação sem vazamento.
- IA: análise, recomendação de Pokémon, moveset válido, aplicação e persistência. IA exige login, tem limite por usuário e cache curto.
- Resiliência: remover temporariamente a chave Gemini em um ambiente de teste, simular 429 e indisponibilidade da PokéAPI/backend; Pokédex/CRUD não podem cair por falha da IA.
- Dispositivos: desktop, janela anônima, smartphone e outra conexão.

Registre cada teste como aprovado, reprovado ou não executado. Nunca marque um teste manual como aprovado sem realizá-lo na URL pública.

## 7. Atualizações, rollback e banco

1. Crie `feature/...` ou `fix/...`, execute `pnpm check`, abra PR e aguarde CI.
2. Faça merge em `main`; Vercel e Render implantam o commit aprovado.
3. Para código, use o rollback do painel da Vercel ou um deploy anterior da Render. Depois corrija `main` para que o estado versionado volte a coincidir com produção.
4. Migrações são revisadas e aplicadas manualmente antes do código que depende delas. Use alterações aditivas e compatíveis; nunca conecte reset/drop ao deploy automático.
5. Em falha de migração, pare o rollout, restaure a versão compatível do código e aplique uma nova migração corretiva. Não edite silenciosamente uma migração já aplicada e não apague registros para “desfazer”.

## 8. Limites dos planos gratuitos

- Render Free suspende o serviço após 15 minutos sem tráfego; o primeiro acesso pode levar cerca de um minuto. O filesystem é efêmero e não armazena dados do PokéLab.
- Supabase Free pode pausar projetos com baixa atividade em uma janela de sete dias. Exporte dados regularmente; restauração de projeto pausado depende do painel e dos limites vigentes.
- Gemini Free tem cotas por projeto/modelo (RPM, TPM e RPD) que devem ser consultadas no AI Studio. O limite local não substitui a cota do provedor.
- O limitador e o cache atuais vivem em memória e atendem a uma única instância gratuita. Antes de escalar horizontalmente, migre esses controles para armazenamento compartilhado.

Não há promessa de disponibilidade ilimitada. Monitore logs, consumo e avisos dos provedores sem ativar faturamento pago sem autorização.

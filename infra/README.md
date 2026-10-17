# Infraestrutura do banco

As migrações desta pasta são destinadas ao PostgreSQL do Supabase. A migração `20261017120000_stage3_auth_and_teams.sql` cria os perfis vinculados a `auth.users`, as tabelas de times, as restrições de slots, os triggers de limite e as políticas RLS.

Com o Supabase CLI, a sequência recomendada é:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

O backend usa Prisma para tipagem e consultas futuras (`apps/api/prisma/schema.prisma`), mas a migração SQL é a fonte de verdade para RLS, triggers e integração com `auth.users`. Não execute uma migração Prisma que remova essas políticas.

Para validar o isolamento no painel do Supabase, crie dois usuários de teste e confirme que cada um só consegue consultar e alterar seus próprios registros com o token de sessão correspondente.

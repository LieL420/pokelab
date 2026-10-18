# Etapa 10 — auditoria, correções e otimização

Data da auditoria: 18 de outubro de 2026

Branch local: `codex/stage10-audit`

## Escopo e proteção do ambiente

Esta etapa não recriou infraestrutura, não aplicou migrações, não alterou dados do Supabase e não realizou commit, push ou deploy. As verificações públicas foram somente leitura. Nenhum teste invasivo foi executado contra produção.

## Estado verificado antes das alterações

- Monorepo `pnpm` com frontend React/Vite e backend NestJS/Prisma.
- `main` estava limpa e sincronizada com `origin/main` no commit `80ace58`.
- Frontend público: `https://pokelab-flax.vercel.app`.
- API pública: `https://pokelab-api.onrender.com`.
- Health público respondeu `200` com `{"status":"ok","service":"pokelab-api"}`.
- A listagem pública retornou 24 registros de um total de 1.025; o primeiro foi Bulbasaur.
- A ficha de Pikachu retornou dados completos (`partial=false`).
- A rota profunda `/pokedex/25` carregou diretamente e não produziu erro no console observado.
- A verificação local inicial passou com 7 suítes, 16 testes, lint e builds.

## Métricas de referência

As medições de produção abaixo foram feitas com o serviço já acordado. Elas não representam o cold start do plano gratuito da Render.

| Medição | Resultado antes das alterações locais |
| --- | ---: |
| Home, reloads no navegador | 344–381 ms (mediana 372 ms) |
| Home, TTFB por HTTP | 376 ms |
| Health, reloads no navegador | 276–679 ms (mediana 297 ms) |
| Health, TTFB por HTTP | 329 ms |
| Listagem da Pokédex, 24 itens | 328 ms |
| Ficha de Pikachu | 1.932 ms |
| Rota profunda `/pokedex/25` até Pikachu visível | 606 ms |
| JavaScript inicial local | 413,52 kB; 126,84 kB gzip |
| CSS local | 60,84 kB; 12,46 kB gzip |
| Verificação local completa | 27,64 s |

O maior custo observado foi a ficha detalhada. Ela agrega dados do Pokémon, espécie, cadeia evolutiva e até 48 golpes. O backend já possui cache em memória, deduplicação de requisições simultâneas e fallback para cache expirado; o principal desperdício restante estava no frontend, que tornava a ficha imediatamente obsoleta para o React Query.

## Problemas encontrados e correções

### Segurança

- A API expunha `X-Powered-By: Express` e não enviava cabeçalhos defensivos. A assinatura foi removida e foram adicionados CSP restritivo para JSON, `nosniff`, proteção contra framing, política de referência e de permissões.
- Respostas autenticadas de auth, times e IA agora recebem `Cache-Control: no-store`.
- A Vercel foi preparada para enviar CSP e cabeçalhos equivalentes no frontend. A política permite apenas a API do PokéLab, o Supabase, as fontes usadas e imagens HTTPS.
- Identificadores de Pokémon e golpes agora são validados antes de compor uma chamada à PokéAPI. Entradas malformadas deixam de gerar variantes arbitrárias de URL/cache.
- O histórico Git foi examinado por assinaturas de chaves Google, JWTs e URLs PostgreSQL com credenciais. Os únicos arquivos sinalizados foram `.env.example` e a URL fictícia do PostgreSQL no CI; nenhum segredo real foi identificado.
- `pnpm audit --prod` examinou 232 dependências e reportou zero vulnerabilidades conhecidas.

Controles já existentes e mantidos:

- Tokens são validados no backend por `Supabase Auth getUser`; o frontend não possui chave privilegiada.
- Todos os endpoints de times usam guarda de autenticação e consultas com `ownerId`; buscas de integrantes também verificam a propriedade do time.
- A migração versionada habilita RLS nas quatro tabelas e restringe leitura/escrita ao `auth.uid()`.
- Prisma não usa SQL bruto, reduzindo a superfície de SQL injection.
- React escapa o conteúdo renderizado e não há uso de `dangerouslySetInnerHTML`.
- Prompts tratam o bloco de dados como não confiável; respostas do Gemini passam por schema e allowlists de IDs antes de chegar ao usuário.
- A IA exige autenticação, tem limite por usuário e nunca aplica uma sugestão sem a ação do usuário.

### Estabilidade e custo

- Chamadas Gemini idênticas simultâneas agora compartilham a mesma Promise, evitando cobrança/cota duplicada durante duplo clique ou concorrência.
- O temporizador de timeout do Gemini agora é cancelado quando a resposta termina, evitando timers desnecessários vivos por até 15 segundos.
- Uma falha ao restaurar a sessão Supabase não deixa mais a aplicação presa indefinidamente no estado de carregamento.

### Performance do frontend

- Rotas secundárias passaram a usar `React.lazy`, mantendo a Home no bundle inicial.
- JavaScript inicial caiu de 413,52 kB para 260,09 kB: redução de 153,43 kB (37,1%).
- JavaScript inicial gzip caiu de 126,84 kB para 81,36 kB: redução de 45,48 kB (35,9%).
- O Team Builder ficou em um chunk próprio de 47,31 kB (14,21 kB gzip); as demais rotas ficaram entre 1,96 kB e 6,03 kB.
- O seletor de Pokémon agora aguarda 350 ms entre digitação e busca, evitando uma requisição por tecla.
- Listagens do seletor usam cache de 10 minutos, mantido por 30 minutos, sem refetch ao focar a janela.
- Fichas de Pokémon usam uma chave de cache compartilhada entre a página de detalhes e o Team Builder, validade de 24 horas e nenhum refetch ao focar. Os dados da PokéAPI são públicos e pouco voláteis.

## Comparação depois das alterações

| Métrica local | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| JS inicial | 413,52 kB | 260,09 kB | -37,1% |
| JS inicial gzip | 126,84 kB | 81,36 kB | -35,9% |
| Testes automatizados | 16 aprovados | 17 aprovados | +1 teste de segurança |
| Suítes | 7 aprovadas | 7 aprovadas | sem regressão |
| Verificação completa | 27,64 s | 24,22 s | -3,42 s (variação local) |

Os tempos públicos não foram medidos novamente porque este trabalho não realizou deploy. Comparar a produção antiga com artefatos locais seria metodologicamente incorreto.

## Testes executados

- `pnpm lint`: aprovado para frontend e backend.
- `pnpm test`: 7 suítes e 17 testes aprovados.
- TypeScript do frontend: aprovado.
- Build Vite: aprovado com divisão de chunks.
- Build NestJS: aprovado.
- `pnpm audit --prod`: zero vulnerabilidades conhecidas.
- Produção, somente leitura: Home, health, listagem Pokédex, ficha do Pikachu e rota profunda aprovados.
- Console da rota profunda: nenhum erro observado.
- Teste automatizado novo: identificador malformado é rejeitado antes de qualquer chamada ao provedor.
- Regressão no build local: Home integrada à API, busca por Pikachu, ficha com 48 golpes, Team Builder e login carregaram corretamente, sem erros de console.
- Integridade visual: nenhuma folha de estilo, token do Design System ou estrutura de página foi alterada. A navegação local manteve os mesmos títulos, controles e estados observados na versão pública.

## Pendências e riscos restantes

- Cadastro, login, CRUD, isolamento entre duas contas, persistência e Gemini autenticado não foram repetidos nesta auditoria: não havia credenciais de contas de teste fornecidas e nenhuma conta foi criada automaticamente.
- O schema/RLS remoto e consultas lentas não foram inspecionados no painel do Supabase; a análise cobriu o schema Prisma e a migração versionada.
- O rate limit de IA é local à instância. Se o backend passar a escalar horizontalmente, deve migrar para um armazenamento compartilhado.
- Os caches de PokêPI e Gemini também são locais e são perdidos em reinicializações da Render.
- O timeout do Gemini devolve controle ao cliente, mas a versão atual do SDK não recebe um `AbortSignal` neste código; a requisição remota pode terminar depois do timeout.
- Não foi coletado um relatório Lighthouse/Core Web Vitals. A medição disponível cobriu latência observada, TTFB e tamanho real do build.
- Os novos cabeçalhos precisam ser conferidos novamente na URL pública após um deploy autorizado.
- A cobertura do frontend ainda é TypeScript/build, sem uma suíte de componentes ou Playwright. Os fluxos autenticados devem ganhar E2E em ambiente de homologação.
- O salvamento de um time existente ocorre em chamadas sequenciais. Uma falha no meio preserva o rascunho local, mas pode deixar parte das alterações já persistida. Uma futura operação transacional de sincronização resolveria o risco, mas não foi adicionada para evitar alterar o contrato público nesta etapa.

## Próxima validação recomendada

Antes de integrar a branch, revisar o diff e testar localmente com duas contas exclusivas de QA. Após autorização de deploy, repetir os cabeçalhos HTTP, os tempos públicos, cadastro/login, isolamento A/B, CRUD/persistência e os três fluxos Gemini. Nenhuma migração de banco é necessária para estas correções.

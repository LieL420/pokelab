# Roadmap de implementação

## 1. Menor fluxo completo para validar a arquitetura

O primeiro fluxo vertical deve provar o caminho inteiro, do dado externo ao dado persistido:

1. Abrir a Pokédex sem login.
2. Pesquisar um Pokémon por nome ou número.
3. Abrir o detalhe e escolher “Adicionar ao time”.
4. Fazer cadastro/login pelo Supabase Auth.
5. Criar um time.
6. Adicionar o Pokémon em um slot.
7. Salvar e recuperar o time.
8. Editar nome ou posição/composição.
9. Excluir o time.

Esse caminho deve funcionar sem IA, sem itens, sem dados competitivos e sem qualquer funcionalidade comunitária.

## 2. Etapas em ordem

### Etapa 0 — Preparação do projeto

**Objetivo:** criar o monorepo e a disciplina de trabalho sem ainda construir funcionalidades de produto.

**Dependências:** documentação desta fase.

**Desenvolver:** workspaces, scripts básicos, lint/format/testes, arquivos de ambiente de exemplo, convenções de commit e migrações vazias.

**Testar:** instalação limpa, build vazio, execução dos scripts em Windows e ambiente de CI.

**Conclusão:** qualquer colaborador consegue iniciar o workspace e entende onde cada módulo deve ficar.

### Etapa 1 — Fundação de autenticação e banco

**Objetivo:** provar identidade e isolamento de dados.

**Dependências:** projeto Supabase, schema aprovado e políticas RLS.

**Desenvolver:** Supabase Auth no frontend, validação de JWT no NestJS, `profiles`, `teams`, migrações e RLS.

**Testar:** cadastro, login, logout, refresh, requisição sem token, token expirado, usuário A sem acesso ao time de B e criação idempotente de perfil.

**Conclusão:** uma requisição autenticada identifica corretamente o usuário e nenhum teste cruza dados entre usuários. A base foi implementada nesta etapa pela migração SQL, RLS, trigger de perfil, cliente Supabase e guard do NestJS.

### Etapa 2 — Pokédex pública

**Objetivo:** consultar dados gerais sem login e desacoplar a interface da PokéAPI.

**Dependências:** módulo HTTP externo e contrato `pokemon`.

**Desenvolver:** busca por nome/número, filtros por tipo/geração, detalhe, normalização, timeout e erros estáveis.

**Testar:** resultado válido, Pokémon inexistente, filtro inválido, ausência de campo, PokéAPI indisponível e limite de paginação.

**Conclusão:** o frontend renderiza lista e detalhe usando apenas o contrato do backend.

### Etapa 3 — CRUD de times vazio

**Objetivo:** validar persistência e autorização antes de adicionar relacionamentos.

**Dependências:** Etapa 1.

**Desenvolver:** criar, listar, visualizar, editar e excluir times.

**Testar:** validação de nome, propriedade, ordenação, exclusão, time inexistente e concorrência básica.

**Conclusão:** o usuário consegue administrar seus próprios times e não consegue manipular `owner_id`.

### Etapa 4 — Composição do time

**Objetivo:** completar o fluxo vertical principal com Pokémon e slots.

**Dependências:** Pokédex e CRUD de times.

**Desenvolver:** `team_pokemon`, adicionar/substituir/remover, limite de seis, transações e snapshots.

**Testar:** posições duplicadas, sétimo Pokémon, referência inválida, forma, remoção em cascata e duas inserções concorrentes.

**Conclusão:** o usuário pesquisa, adiciona, salva, recupera, edita e exclui a composição do time.

### Etapa 5 — Golpes e análise de tipos

**Objetivo:** completar os requisitos funcionais básicos do Team Builder.

**Dependências:** composição persistida e tabela de efetividade.

**Desenvolver:** quatro golpes, substituição atômica, validação de existência, análise determinística e estados parciais.

**Testar:** quinto golpe, golpe duplicado, slot inválido, cascata, tipos duplos, imunidades, forma ausente e time incompleto.

**Conclusão:** o Team Builder exibe golpes e análise de tipos reprodutível, com ruleset identificado.

### Etapa 6 — Qualidade de produto do MVP

**Objetivo:** tornar o primeiro fluxo utilizável e confiável.

**Dependências:** Etapas 1 a 5.

**Desenvolver:** responsividade, acessibilidade, estados de loading/erro/vazio, invalidação de cache, rate limit básico, logs sem segredos e documentação de operação.

**Testar:** testes unitários de regras, integração API/banco, testes de componentes, E2E do fluxo completo e build de produção.

**Conclusão:** critérios da primeira entrega funcional atendidos e riscos conhecidos registrados.

### Etapa 7 — Preparação para IA

**Objetivo:** adicionar recomendações sem misturar IA com autoridade de regras.

**Dependências:** análise determinística, catálogo confiável e decisão de `ruleset`.

**Desenvolver:** interface `AiProvider`, contexto mínimo, schema de saída, validador, rate limit, custos e observabilidade.

**Testar:** resposta válida, JSON inválido, item inventado, golpe incompatível, timeout, limite de uso e ausência de chave.

**Conclusão:** uma recomendação só é exibida se passar no validador; falha de IA não quebra o Team Builder.

## 3. Critérios de conclusão da primeira entrega funcional

### Funcionais

- Usuário consegue cadastrar, entrar e sair.
- Usuário consulta a Pokédex sem estar autenticado.
- Usuário pesquisa por nome ou número e filtra por tipo/geração.
- Usuário consulta detalhe com imagem, número, nome, tipos, atributos, habilidades, evoluções e golpes quando disponíveis.
- Usuário cria, lista, visualiza, edita e exclui seus times.
- Usuário adiciona, substitui e remove Pokémon.
- Nenhum time ultrapassa seis Pokémon.
- Usuário configura de zero a quatro golpes por Pokémon.
- Nenhum golpe duplicado aparece no mesmo Pokémon.
- Usuário visualiza tipos, fraquezas e resistências da equipe com análise determinística.

### Técnicos

- Endpoints privados validam JWT e aplicam propriedade pelo servidor.
- RLS está ativo e coberto por testes de isolamento.
- Limites de seis/quatro estão protegidos na aplicação e no banco.
- Falhas da PokéAPI são tratadas sem corromper dados persistidos.
- Nenhum segredo aparece no frontend, no Git ou nos logs.
- Testes unitários, integração e E2E cobrem o fluxo vertical mínimo.
- Build reproduzível em ambiente limpo.
- Documentação de contrato e modelo está atualizada em relação ao comportamento implementado.

## 4. Riscos e decisões a revisitar

| Risco | Mitigação |
|---|---|
| Dependência externa instável | Timeout, resposta parcial, contrato próprio e reconsulta |
| Dados competitivos divergentes | Não prometer legalidade no casual; criar ruleset versionado antes da V2 |
| Custo/abuso da IA | Backend-only, rate limit, orçamento, limites de contexto e métricas |
| RLS configurado incorretamente | Testes com dois usuários e revisão de policies antes de produção |
| Limite quebrado sob concorrência | Transação, bloqueio e trigger/função no banco |
| Acoplamento ao formato da PokéAPI | Anti-corruption layer no módulo `pokemon` |
| Crescimento prematuro da arquitetura | Monólito modular e novas infraestruturas somente após necessidade medida |

## 5. Próximo passo autorizado

A próxima etapa de trabalho deve ser a criação da fundação do monorepo e do ambiente Supabase, mas somente depois de revisar e aprovar esta arquitetura. Nenhum código de domínio deve ser iniciado sem a aprovação das regras de propriedade, limites, formas e golpes descritas nos documentos.

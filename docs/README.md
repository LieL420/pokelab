# Documentação do PokéLab

## Como usar este conjunto de documentos

Esta documentação é a fonte de decisão da fase de planejamento. A implementação deve seguir os contratos e regras descritos aqui; qualquer divergência deve ser registrada como uma decisão arquitetural antes de alterar o código.

| Documento | Finalidade |
|---|---|
| [Arquitetura geral](architecture.md) | Componentes, responsabilidades, comunicação e organização do monorepo |
| [Modelo de dados](data-model.md) | Entidades, campos, relacionamentos, índices e limites estruturais |
| [API REST](api.md) | Módulos, endpoints, autenticação, validações e formatos |
| [Regras de negócio](business-rules.md) | Regras funcionais, referências à PokéAPI e análise de tipos |
| [Estratégia de IA](ai-integration.md) | Preparação de contexto, validação determinística, custos e segurança |
| [Roadmap](roadmap.md) | Ordem de execução, testes e critérios de conclusão |

## Convenções obrigatórias para a implementação

1. Não expor chaves privadas ou a chave de serviço do Supabase no navegador.
2. Não permitir que o cliente escolha `user_id`, `owner_id` ou qualquer campo de propriedade.
3. Não tratar texto produzido por IA como fonte de verdade para regras do jogo.
4. Não duplicar toda a Pokédex no PostgreSQL no MVP.
5. Toda alteração que afete contratos de API, tabelas ou regras deve atualizar esta documentação.

## Decisões resumidas

| Tema | Decisão |
|---|---|
| Repositório | Monorepo simples com npm workspaces |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router |
| Backend | NestJS + TypeScript + API REST versionada |
| Dados próprios | PostgreSQL gerenciado pelo Supabase |
| Autenticação | Supabase Auth; backend valida JWT |
| Dados da Pokédex | PokéAPI por meio do backend, com normalização e tratamento de ausência |
| Estado do frontend | TanStack Query para servidor; estado local para formulário do Team Builder; Zustand somente se a complexidade justificar |
| Validação | DTOs e pipes no NestJS; schema compartilhado somente para contratos que realmente forem compartilhados |
| ORM | Prisma, recomendado para migrações e tipagem; operações de usuário preservam contexto JWT ou aplicam propriedade explícita |
| IA | Serviço futuro acessado exclusivamente pelo backend |

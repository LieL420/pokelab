# Integração de IA — Etapa 8

## Status

A integração usa o SDK oficial `@google/genai` no NestJS. O Gemini é uma camada interpretativa: a existência de Pokémon e golpes, a tipagem, as fraquezas, a cobertura e os limites continuam sendo calculados e validados pelo backend.

O frontend não recebe a chave. Sem `GEMINI_API_KEY`, o Team Builder continua funcionando com a análise determinística e as ações de IA retornam uma indisponibilidade explícita.

## Configuração

1. Crie ou selecione um projeto no [Google AI Studio](https://aistudio.google.com/), crie uma chave de API e mantenha-a somente no ambiente do backend.
2. Copie `apps/api/.env.example` para o ambiente local e defina `GEMINI_API_KEY`.
3. Defina `GEMINI_MODEL` conforme os modelos habilitados no AI Studio. O padrão inicial é `gemini-3.5-flash-lite`, indicado pela API atual para novos usuários e compatível com saída estruturada; o nome não é fixo no código.
4. Confira as cotas ativas no AI Studio. O Google mede RPM, TPM e RPD por projeto, e as cotas variam por modelo e tier.

| Variável | Função | Padrão |
|---|---|---|
| `GEMINI_API_KEY` | chave server-only do AI Studio | vazio/desabilitado |
| `GEMINI_MODEL` | modelo configurável | `gemini-3.5-flash-lite` |
| `GEMINI_TIMEOUT_MS` | timeout da chamada | `15000` |
| `AI_REQUESTS_PER_MINUTE` | limite local por usuário/IP | `6` |

Não faça commit de `.env`, não envie a chave pelo frontend e não cole a chave em chats ou issues.

## Arquitetura

```text
AiController
  ├─ AiRateLimitService
  ├─ AiAnalysisService ──────────────── StrategicAnalysisService
  ├─ PokemonRecommendationService ───── PokemonService + GeminiService
  └─ MovesetRecommendationService ───── PokemonService + GeminiService
                                          └─ RecommendationValidationService
```

O contexto enviado é compacto e contém somente dados da equipe, resultados do motor estratégico, movesets e limitações. Não contém e-mail, senha, token ou ID de usuário. Os prompts são separados por responsabilidade e versionados em `apps/api/src/ai/ai.prompts.ts` (`v1.0.0`). Dados da equipe são delimitados como dados não confiáveis e nunca podem substituir as regras fixas do prompt.

## Endpoints

Rotas privadas exigem `Authorization: Bearer <supabase_access_token>`:

- `POST /api/v1/ai/teams/:teamId/analyze`
- `POST /api/v1/ai/teams/:teamId/recommend-pokemon`
- `POST /api/v1/ai/teams/:teamId/recommend-moveset` com `{ "memberPosition": 1 }`

Rotas de preview não persistem e são limitadas por IP:

- `POST /api/v1/ai/preview/analyze`
- `POST /api/v1/ai/preview/recommend-pokemon`
- `POST /api/v1/ai/preview/recommend-moveset` com o payload do preview e `memberPosition`

As recomendações nunca são salvas automaticamente. O frontend as aplica apenas ao rascunho após uma ação explícita; o CRUD existente só é chamado quando o usuário salva o time.

## Validação e falhas

O Gemini recebe JSON Schema via `responseMimeType: application/json` e `responseSchema`. Depois do parse, o backend valida novamente tipos, listas, IDs, duplicidade, máximo de quatro golpes e pertencimento ao conjunto controlado de candidatos. Resposta inválida é rejeitada; nenhum dado do modelo executa código ou comando.

Timeout, erro de cota/429, modelo indisponível, resposta vazia e indisponibilidade da chave produzem erro estável. O Team Builder e o motor determinístico permanecem utilizáveis.

`casual-v1` não promete legalidade competitiva: a lista de moveset é a disponibilidade retornada pela PokéAPI, sem geração/formato competitivo, habilidades, itens, EVs, clima ou dano real.

## Limites e privacidade

O rate limit local reduz abusos, mas a cota efetiva deve ser conferida no AI Studio. O sistema não ativa faturamento nem troca automaticamente para modelo pago. Os candidatos são primeiro reduzidos deterministicamente por necessidades defensivas/ofensivas; só depois são enviados ao Gemini.

Para produção, use secret manager, logs sem prompts completos e monitore latência, 429, tokens e rejeições do validador. O limite em memória desta etapa é adequado ao desenvolvimento e a uma única instância; múltiplas instâncias devem migrar o contador para Redis ou gateway.

## Teste real

Com backend, banco, PokéAPI e `GEMINI_API_KEY` configurados, crie um time com pelo menos um integrante e use `Analisar com IA`, `Sugerir Pokémon` e `Sugerir moveset` no Team Builder. A conclusão da chamada real depende da chave e da cota do projeto do usuário; sem esses segredos o teste automatizado usa mocks e o produto permanece em modo determinístico.

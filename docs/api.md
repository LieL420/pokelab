# Contrato inicial da API REST

## 1. Convenções

- Base path: `/api/v1`.
- Formato: JSON com `Content-Type: application/json`.
- Rotas privadas exigem `Authorization: Bearer <supabase_access_token>`.
- O backend identifica o usuário pelo JWT; não aceitar `owner_id` ou `user_id` como fonte de autorização.
- Datas em ISO 8601 UTC.
- Paginação pública por `page` e `pageSize`, com limites definidos no backend.
- Respostas de sucesso seguem `{ data, meta? }`.
- Erros seguem `{ error: { code, message, details? } }`; `details` não deve conter stack trace ou segredo.

## 2. Status HTTP

| Status | Uso |
|---|---|
| `200` | Consulta ou atualização concluída |
| `201` | Recurso criado |
| `204` | Remoção concluída sem corpo |
| `400` | Payload ou parâmetro malformado |
| `401` | Ausência ou invalidade do JWT |
| `403` | Usuário autenticado sem permissão |
| `404` | Recurso inexistente ou não visível ao usuário |
| `409` | Conflito de estado, limite ou versão |
| `422` | Dados bem formados, mas semanticamente inválidos |
| `429` | Limite de utilização atingido |
| `502/503` | Dependência externa indisponível |

## 3. Módulo Pokémon — público no MVP

O frontend consulta o backend, e não a PokéAPI diretamente.

### `GET /api/v1/pokemon`

Consulta paginada.

Parâmetros:

```text
search?: string       # nome ou número
type?: string         # slug do tipo
generation?: integer  # 1 a 9 no MVP
page?: integer        # default 1
pageSize?: integer    # valor máximo definido pelo backend
```

Resposta geral:

```json
{
  "data": [
    {
      "speciesId": 25,
      "speciesSlug": "pikachu",
      "name": "Pikachu",
      "types": ["electric"],
      "spriteUrl": "https://..."
    }
  ],
  "meta": { "page": 1, "pageSize": 24, "total": 1 }
}
```

Regras: `generation` deve estar entre 1 e 9; busca vazia pode retornar a primeira página conforme o catálogo suportado pela integração; texto deve ser normalizado para busca sem aceitar comandos ou filtros arbitrários.

### `GET /api/v1/pokemon/:identifier`

`identifier` pode ser número, slug de espécie ou identificador de forma conforme o contrato interno.

Resposta:

```json
{
  "data": {
    "speciesId": 25,
    "speciesSlug": "pikachu",
    "formId": 25,
    "formSlug": "pikachu",
    "name": "Pikachu",
    "types": ["electric"],
    "baseStats": { "hp": 35, "attack": 55 },
    "abilities": [{ "slug": "static", "name": "Static" }],
    "evolutionChain": [],
    "moves": [{ "id": 84, "slug": "thunder-shock", "name": "Thunder Shock" }],
    "source": "pokeapi",
    "partial": false
  }
}
```

Na Etapa 5, a resposta de detalhe também pode incluir `artworkUrl`, habilidades com `hidden`, uma `evolutionChain` normalizada e até 48 movimentos com `type`, `category`, `power`, `accuracy` e `pp`. Quando a PokéAPI não disponibilizar uma parte da ficha, `partial` permanece `true` e a interface apresenta o campo como indisponível.

O endpoint de listagem usa um catálogo nacional cacheado (gerações 1 a 9), permitindo busca parcial por nome ou número em conjunto com os filtros de tipo e geração. O frontend continua consultando somente o backend.

Se a PokéAPI não tiver um campo, o backend retorna `null`, lista vazia ou `partial: true` conforme o caso. Não inventar valores.

## 4. Módulo Teams — privado no MVP

### `POST /api/v1/teams`

Cria um time vazio ou com composição inicial.

Entrada mínima:

```json
{
  "name": "Time de teste",
  "description": "Opcional",
  "format": "casual"
}
```

O servidor define `ownerId`, timestamps e `format` permitido. Retorna `201` com o time criado.

### `GET /api/v1/teams`

Lista somente os times do usuário autenticado. Suporta paginação e ordenação por `updatedAt desc`. Nunca retorna times de terceiros no MVP.

### `GET /api/v1/teams/:teamId`

Retorna o time, seus slots, golpes e metadados necessários ao Team Builder. Um ID de time de outro usuário deve se comportar como `404` para não revelar sua existência, ou `403` se a política da aplicação preferir distinguir autorização; escolher uma política única antes da implementação.

### `PATCH /api/v1/teams/:teamId`

Atualiza metadados do time.

```json
{
  "name": "Time atualizado",
  "description": "Nova descrição",
  "format": "casual"
}
```

Somente o proprietário pode editar. O `format` deve ser validado contra a lista suportada, não contra qualquer string.

### `DELETE /api/v1/teams/:teamId`

Exclui o time do proprietário. A exclusão em cascata remove `team_pokemon` e `team_pokemon_moves`. Retorna `204`.

### `POST /api/v1/teams/:teamId/pokemon`

Adiciona um Pokémon a uma posição disponível.

```json
{
  "position": 1,
  "speciesId": 25,
  "speciesSlug": "pikachu",
  "formId": 25,
  "formSlug": "pikachu",
  "displayNameSnapshot": "Pikachu",
  "spriteUrlSnapshot": "https://..."
}
```

O backend deve validar a referência consultando/confirmando a fonte externa quando necessário, ignorar `ownerId` enviado e rejeitar time cheio com `409`.

### `PATCH /api/v1/teams/:teamId/pokemon/:teamPokemonId`

Substitui a referência ou move a posição do Pokémon. A operação deve manter o máximo de seis e garantir que não haja duas entradas na mesma posição.

### `DELETE /api/v1/teams/:teamId/pokemon/:teamPokemonId`

Remove a entrada e seus golpes em cascata. Retorna `204`.

### `PUT /api/v1/teams/:teamId/pokemon/:teamPokemonId/moves`

Substitui atomicamente a lista de golpes do Pokémon. Esta forma é preferível a várias chamadas independentes no Team Builder.

```json
{
  "moves": [
    { "slot": 1, "moveId": 84, "moveSlug": "thunder-shock", "moveNameSnapshot": "Thunder Shock" }
  ]
}
```

Regras: zero a quatro golpes; slots de 1 a 4; não duplicar `moveId`; a fonte externa pode ser consultada para confirmar que o golpe existe. A compatibilidade do golpe com a espécie é uma regra casual simplificada no MVP e uma validação de formato mais rigorosa no futuro.

## 5. Análise determinística — MVP

### `GET /api/v1/teams/:teamId/type-analysis`

Calcula tipos presentes, fraquezas, resistências e imunidades usando uma tabela de efetividade versionada no backend. Não chama IA.

Exemplo de saída:

```json
{
  "data": {
    "typesPresent": ["electric", "water"],
    "weaknesses": [{ "type": "ground", "multiplier": 2 }],
    "resistances": [{ "type": "fire", "multiplier": 0.5 }],
    "immunities": [],
    "coverage": { "knownMembers": 2, "teamSize": 6 },
    "ruleset": "casual-v1"
  }
}
```

Se um membro tiver forma/tipo ausente, a saída deve informar `partial: true` e listar o membro afetado.

## 6. Endpoints de IA — Etapa 8

As rotas abaixo são contratos conceituais; não devem ser implementadas na primeira entrega.

| Método e rota | Finalidade |
|---|---|
| `POST /api/v1/ai/teams/:teamId/analyze` | Explicar a análise estratégica |
| `POST /api/v1/ai/teams/:teamId/recommend-pokemon` | Recomendar Pokémon de uma lista real controlada |
| `POST /api/v1/ai/teams/:teamId/recommend-moveset` | Sugerir até quatro golpes para uma posição |
| `POST /api/v1/ai/preview/analyze` | Explicar um rascunho sem persistir |
| `POST /api/v1/ai/preview/recommend-pokemon` | Recomendar Pokémon para um preview |
| `POST /api/v1/ai/preview/recommend-moveset` | Sugerir moveset para um preview |

Rotas de time salvo são privadas e limitadas por usuário; previews são limitados por IP. Todas declaram o `ruleset` usado. A resposta distingue fatos determinísticos de texto interpretativo e nunca altera o CRUD sem confirmação do usuário.

## 7. Motor estratégico — Etapa 7

### `GET /api/v1/teams/:teamId/analysis`

Rota privada. Usa o proprietário do JWT, carrega tipos e detalhes reais pela integração com a PokéAPI e retorna a análise determinística completa. O resultado inclui `ruleset`, membros, defesa coletiva, cobertura ofensiva, funções possíveis, sinergia, necessidades, limitações e `aiContext` compacto.

### `POST /api/v1/analysis/teams/preview`

Rota pública para analisar uma composição temporária. Aceita no máximo seis integrantes e quatro golpes por integrante; recebe apenas referências de Pokémon e golpes, sem `owner_id` e sem persistir dados. A API resolve os detalhes reais antes de calcular o resultado.

O preview é limitado ao formato `casual-v1`: matriz moderna de 18 tipos, sem habilidades, itens, clima, EVs/IVs ou simulador de dano. Golpes de status não entram na cobertura de dano e STAB é informativo.

## 8. Validação e compatibilidade

- DTOs rejeitam campos desconhecidos quando isso for seguro para a evolução do cliente.
- IDs positivos, slugs normalizados e strings com limites explícitos.
- Operações que alteram várias tabelas são transacionais.
- Toda consulta privada filtra pelo usuário no repositório e também é protegida por RLS.
- O contrato público usa nomes próprios do PokéLab, não expõe o JSON bruto da PokéAPI.
- O versionamento permite adicionar campos opcionais sem quebrar o MVP e criar `/api/v2` somente para mudanças incompatíveis.

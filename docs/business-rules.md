# Regras de negócio

## 1. Escopo do MVP

O MVP suporta Pokédex das gerações 1 a 9, busca por nome ou número, filtros por tipo e geração, consulta de detalhes e Team Builder casual com até seis Pokémon e até quatro golpes por Pokémon. A Pokédex é pública; times são privados e pertencem a um único usuário.

## 2. Times

- Um usuário pode criar vários times.
- Todo time tem exatamente um proprietário.
- O nome é obrigatório, aparado e limitado a 80 caracteres.
- Um time pode ter de zero a seis Pokémon.
- A posição é de 1 a 6 e é única dentro do time.
- No formato casual, duplicatas de espécie são permitidas pelo modelo. Um validador futuro pode proibi-las conforme o formato sem alterar a persistência.
- Um time vazio é permitido para apoiar criação incremental.
- Exclusão é definitiva no MVP; recuperação e auditoria ficam fora do escopo.

## 3. Pokémon, espécies e formas

Uma entrada do time deve guardar:

- `speciesId/speciesSlug`: identidade da espécie base.
- `formId/formSlug`: identidade da forma quando ela for relevante.
- snapshot de nome e sprite apenas para apresentação histórica.

O backend deve preferir o identificador numérico e o slug como redundância verificável. O slug recebido pelo cliente não substitui a confirmação do identificador quando houver consulta à PokéAPI.

Uma forma não deve ser tratada como uma nova espécie. O cálculo de tipos usa os tipos da forma selecionada; quando a forma não estiver disponível, o resultado é parcial e não deve assumir automaticamente que todos os dados da espécie base se aplicam.

## 4. Golpes

- Cada Pokémon tem de zero a quatro golpes no MVP.
- Slots de golpe são numerados de 1 a 4.
- Um golpe não pode aparecer duas vezes no mesmo Pokémon.
- O golpe deve existir na fonte externa ou estar explicitamente marcado como indisponível; nunca criar um golpe fictício.
- A confirmação de que uma espécie aprende um golpe pode ser simplificada no modo casual inicial, mas a API deve manter a separação necessária para introduzir validação por versão/formato.
- A futura validação competitiva deve considerar método de obtenção, geração, formato, nível, compatibilidade de forma e regras do ambiente escolhido.

## 5. Dados externos e ausência de informação

PokéAPI é a fonte inicial para dados gerais, mas não deve ser tratada como autoridade completa para todas as regras competitivas.

Quando um campo não existir, estiver incompleto ou a dependência estiver indisponível:

1. Retornar `null`, lista vazia ou `partial: true` de acordo com o contrato.
2. Informar o campo ou membro afetado quando a tela precisar explicar a limitação.
3. Não inventar tipos, golpes, evoluções, sprites ou regras.
4. Não apagar um time já salvo apenas porque uma consulta externa falhou.
5. Permitir reconsulta posterior e, futuramente, cache com expiração.

O backend deve aplicar timeout, retry limitado apenas para falhas transitórias e circuit breaker/rate control somente quando a frequência justificar. O MVP pode começar com timeout e erro estável.

## 6. Análise inicial dos tipos

A análise de tipos é determinística e deve usar uma tabela de efetividade versionada, não texto de IA.

- Para cada membro, obter os tipos efetivos da forma escolhida.
- Para cada tipo atacante, multiplicar os modificadores contra os tipos defensivos do membro.
- Agregar a exposição por tipo e classificar fraqueza, resistência ou imunidade.
- Diferenciar ausência de cobertura porque o time está incompleto de ausência de cobertura porque nenhum tipo a fornece.
- Ignorar habilidades, itens e condições de batalha no MVP, porque ainda não fazem parte do modelo.
- Identificar a versão da tabela no retorno (`casual-v1`) para permitir mudanças futuras auditáveis.

Essa análise ajuda a validar a arquitetura, mas não deve ser apresentada como estratégia competitiva completa.

## 7. Preparação para formatos competitivos

O Team Builder começa casual, mas deve incluir `format` no time e `ruleset` na análise. Isso evita criar um modelo que suponha que todas as equipes possuem as mesmas regras.

O caminho futuro é:

1. Definir um catálogo de formatos (`singles-smogon`, `vgc`, etc.) e suas versões.
2. Separar dados gerais da PokéAPI de dados de legalidade e metagame.
3. Criar um validador determinístico por formato.
4. Integrar dados do ecossistema Pokémon Showdown somente conforme a licença, estabilidade e necessidade forem avaliadas.
5. Fazer a IA consumir o resultado do validador, nunca substituí-lo.

Até essa etapa, o produto deve chamar o modo de equipe de `casual` e evitar prometer legalidade competitiva.

## 8. Autorização

- Usuário não autenticado: consulta à Pokédex e recursos visuais públicos.
- Usuário autenticado: criar, ler, editar e excluir somente seus próprios times.
- O servidor deriva a identidade do JWT.
- Tentativas de acessar outro time não devem revelar dados; a política recomendada é responder `404`.
- Administradores, compartilhamento e times públicos não existem no MVP.

## 9. Idempotência e concorrência

- `PATCH` deve produzir o mesmo estado quando repetido com a mesma entrada.
- `PUT .../moves` substitui a coleção inteira e é preferível para salvar o estado do editor.
- Inserções de Pokémon e golpes devem ser transacionais.
- Se uma futura interface permitir edição concorrente, adicionar `updatedAt`/versão no payload e retornar `409` em conflito.

## 10. Regras que não devem ser antecipadas

Não adicionar ao MVP regras de itens, habilidades alternativas, natureza, EVs, IVs, níveis, terastalização, breeding, tiers, banlists, import/export ou compartilhamento. Essas features exigem fonte de regras própria e testes específicos; apenas os pontos de extensão devem ser preservados.

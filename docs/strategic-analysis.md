# Motor estratégico — Etapa 7

## Auditoria da Etapa 6

O Team Builder já possuía rascunho local, slots, movesets da PokéAPI, autenticação para persistência e uma leitura de tipagem `casual-v1`. O cálculo antigo era útil como feedback imediato, mas a tabela e as regras estavam duplicadas no frontend e em `TeamsService`, sem análise ofensiva ou perfil de necessidades.

## Arquitetura entregue

O módulo `apps/api/src/analysis/` separa:

- `type-chart.ts`: os 18 tipos, interações modernas e validação da matriz;
- `analysis.dto.ts`: entrada limitada e validada para preview;
- `analysis.types.ts`: contrato estruturado para frontend e IA futura;
- `strategic-analysis.service.ts`: composição determinística de defesa, ataque, funções, sinergia e necessidades;
- `analysis.controller.ts`: preview público e análise privada de time salvo.

Os cálculos não usam habilidades, itens, clima, EVs/IVs, dano real ou formato competitivo. Golpes de status não entram na cobertura de dano. STAB é apenas informativo. Funções como pivot, hazards e controle de velocidade são possibilidades heurísticas baseadas em golpes reconhecíveis; não são garantias competitivas.

## Endpoints

- `GET /api/v1/teams/:teamId/analysis`: exige JWT e filtra o time pelo proprietário derivado do token.
- `POST /api/v1/analysis/teams/preview`: aceita até seis referências de Pokémon e até quatro golpes por integrante, sem persistir nada e sem receber `owner_id`.

Ambos retornam `{ data }` com `ruleset`, membros, defesa coletiva, cobertura ofensiva, sinergia, necessidades e `aiContext` compacto.

## Regras de prioridade

- `high`: três ou mais integrantes vulneráveis ao mesmo tipo sem resistência/imunidade disponível;
- `medium`: duas vulnerabilidades compartilhadas ou uma lacuna de cobertura ampla;
- `low`: lacunas menores, ausência de suporte ou dados incompletos.

As prioridades são etiquetas explicáveis, não uma pontuação de 0 a 100.

## Interface

O painel no Team Builder mantém a leitura defensiva local instantânea. O botão **rodar motor estratégico** dispara o preview para rascunhos ou a análise privada para times salvos. Ao editar a formação, o resultado anterior é marcado como desatualizado até o próximo recálculo.

## Preparação para Gemini

`aiContext` envia somente regras, tipos, movimentos, necessidades e limitações necessárias para interpretação. Nenhuma chamada ao Gemini é feita nesta etapa e nenhum resultado de IA pode alterar o time.

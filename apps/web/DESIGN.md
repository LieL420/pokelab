# PokéLab visual system

## Direction

Arquivo de campo noturno: uma interface de laboratório com preto profundo, superfícies em grafite e vermelho de alerta como linguagem de ação. A Pokédex não é uma grade genérica de cards; é um catálogo de fichas, com índices tabulares, cor funcional e estados claros. O vermelho aparece onde algo pede atenção ou decisão; o grafite sustenta a leitura e evita uma tela saturada.

## Tokens

- Canvas: `#08090B`
- Surface: `#151619`
- Surface raised: `#242529`
- Ink: `#F7FAFC`
- Muted: `#A1A1A8`
- Signal red: `#FF3B3B`
- Graphite accent: `#B9B9C0`
- Mint success: `#78F3C0`
- Coral warning: `#FF655F`
- Lines: `rgba(255,255,255,.10)`

Typography uses Sora for interface/display and DM Mono for IDs, labels and data. Cards use 16px radii, one border treatment, and soft directional depth.

## Signature

Pokémon cards behave like research specimens: a national number, a graphite plate, a restrained red signal line and a type rail that remains legible even when the card is read in monochrome. The Pokémon type colors remain data, not brand decoration.

## Motion

The catalog enters with a single staggered reveal and uses transform/color transitions for interaction. Reduced motion disables reveal and transitions.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas que pesquisam Pokémon e querem transformar dados de espécies em decisões melhores para suas equipes, começando por uma consulta pública e rápida.

## Product Purpose

O PokéLab reúne uma Pokédex pesquisável e, nas próximas etapas, um Team Builder autenticado. O sucesso desta etapa é permitir que alguém encontre um Pokémon, entenda seus dados principais e navegue pela cadeia evolutiva sem depender da PokéAPI diretamente.

## Positioning

Uma bancada de investigação para pensar em equipes: dados normalizados, contexto suficiente para comparar espécies e uma base preparada para análise estratégica futura.

## Operating Context

Uso recorrente em desktop, tablet e celular durante pesquisa, planejamento casual de equipes e consulta rápida antes de uma batalha. A pessoa pode estar autenticada ou apenas explorando o catálogo.

## Capabilities and Constraints

- React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router e TanStack Query no frontend.
- NestJS é a única porta do navegador para a PokéAPI.
- A Pokédex é pública; Team Builder, times salvos e análise são funcionalidades graduais.
- A fonte de dados do catálogo é a PokéAPI, normalizada pela API do PokéLab.
- Não inventar valores quando a fonte não fornecer um dado.

## Brand Commitments

O nome PokéLab e a metáfora de laboratório/field notes são compromissos já presentes no projeto. A interface deve ser moderna, limpa, responsiva, inspirada no universo Pokémon sem copiar a Pokepedia.

## Evidence on Hand

- Contratos e decisões das etapas anteriores em `docs/`.
- API real em `apps/api/src/pokemon/`.
- Fluxo de autenticação Supabase em `apps/web/src/lib/`.
- Dados públicos fornecidos pela PokéAPI.

## Product Principles

1. Pesquisar antes de montar.
2. Dado ausente é um estado explícito, não um palpite.
3. A interface deve ser rápida de escanear e agradável de explorar.
4. A base pública vem antes das camadas estratégicas.

## Accessibility & Inclusion

HTML semântico, foco visível, rótulos para controles, contraste adequado, feedback de loading/erro e respeito a `prefers-reduced-motion` são requisitos da interface web.

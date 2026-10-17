export const TYPES = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic', 'rock', 'steel', 'water'] as const

export type PokemonType = typeof TYPES[number]
export type TypeMultiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4

/** Modern casual type chart. Absent entries are neutral interactions. */
export const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, TypeMultiplier>>> = {
  bug: { dark: 2, grass: 2, psychic: 2, fairy: 0.5, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, poison: 0.5, steel: 0.5 },
  dark: { ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5, fighting: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  electric: { flying: 2, water: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  fairy: { dark: 2, dragon: 2, fighting: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  fighting: { dark: 2, ice: 2, normal: 2, rock: 2, steel: 2, bug: 0.5, fairy: 0.5, flying: 0.5, poison: 0.5, psychic: 0.5, ghost: 0 },
  fire: { bug: 2, grass: 2, ice: 2, steel: 2, fairy: 2, dragon: 0.5, fire: 0.5, rock: 0.5, water: 0.5 },
  flying: { bug: 2, fighting: 2, grass: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  ghost: { ghost: 2, psychic: 2, dark: 0.5, normal: 0 },
  grass: { ground: 2, rock: 2, water: 2, bug: 0.5, dragon: 0.5, fire: 0.5, flying: 0.5, grass: 0.5, poison: 0.5, steel: 0.5 },
  ground: { electric: 2, fire: 2, poison: 2, rock: 2, steel: 2, bug: 0.5, grass: 0.5, flying: 0 },
  ice: { dragon: 2, flying: 2, grass: 2, ground: 2, fire: 0.5, ice: 0.5, steel: 0.5, water: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
  poison: { fairy: 2, grass: 2, ghost: 0.5, ground: 0.5, poison: 0.5, rock: 0.5, steel: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  rock: { bug: 2, fire: 2, flying: 2, ice: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  steel: { fairy: 2, ice: 2, rock: 2, electric: 0.5, fire: 0.5, water: 0.5, steel: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, dragon: 0.5, grass: 0.5, water: 0.5 },
}

export function getTypeMultiplier(attackingType: string, defendingTypes: string[]): TypeMultiplier {
  const value = defendingTypes.reduce((multiplier, defendingType) => multiplier * (TYPE_CHART[attackingType as PokemonType]?.[defendingType as PokemonType] ?? 1), 1)
  return value as TypeMultiplier
}

export function validateTypeChart() {
  const allowed = new Set(TYPES)
  for (const attackingType of TYPES) {
    for (const [defendingType, multiplier] of Object.entries(TYPE_CHART[attackingType])) {
      if (!allowed.has(defendingType as PokemonType) || ![0, 0.5, 1, 2].includes(multiplier)) throw new Error(`Invalid interaction: ${attackingType}/${defendingType}`)
    }
  }
  return true
}

validateTypeChart()

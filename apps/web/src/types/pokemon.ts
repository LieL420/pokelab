export type PokemonSummary = {
  id: number
  slug: string
  name: string
  speciesId: number
  speciesSlug: string
  formId: number
  formSlug: string
  spriteUrl: string | null
  artworkUrl?: string | null
  types: string[]
}

export type PokemonListResponse = {
  data: PokemonSummary[]
  meta: { page: number; pageSize: number; total: number }
}

export type PokemonAbility = { slug: string; name: string; hidden?: boolean }
export type PokemonEvolution = { id: number; name: string; slug: string; spriteUrl: string | null; condition?: string | null }
export type PokemonMove = {
  id: number
  slug: string
  name: string
  type?: string | null
  category?: string | null
  power?: number | null
  accuracy?: number | null
  pp?: number | null
  learnMethod?: string | null
  levelLearnedAt?: number | null
}

export type PokemonDetails = PokemonSummary & {
  baseStats: Record<string, number>
  abilities: PokemonAbility[]
  evolutionChain: PokemonEvolution[]
  moves: PokemonMove[]
  source: string
  partial: boolean
}

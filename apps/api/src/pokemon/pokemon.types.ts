export type PokemonSummary = {
  id: number
  slug: string
  name: string
  speciesId: number
  speciesSlug: string
  formId: number
  formSlug: string
  spriteUrl: string | null
  artworkUrl: string | null
  types: string[]
}

export type MoveSummary = { id: number; slug: string; name: string }

export type PokemonReference = PokemonSummary & { formId: number; formSlug: string }

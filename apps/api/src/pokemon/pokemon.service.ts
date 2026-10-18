import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { MoveSummary, PokemonReference, PokemonSummary } from './pokemon.types'

type ApiResource = { name: string; url: string }
type ApiPokemon = {
  id: number
  name: string
  species: ApiResource
  sprites?: { front_default?: string | null; other?: { 'official-artwork'?: { front_default?: string | null } } }
  types: Array<{ slot: number; type: ApiResource }>
  stats?: Array<{ base_stat: number; stat: ApiResource }>
  abilities?: Array<{ ability: ApiResource; is_hidden: boolean }>
  moves?: Array<{ move: ApiResource }>
}
type ApiSpecies = { evolution_chain?: ApiResource }
type ApiEvolutionNode = { species: ApiResource; evolves_to: ApiEvolutionNode[]; evolution_details?: Array<{ min_level?: number | null; item?: ApiResource | null; trigger?: ApiResource | null; time_of_day?: string; known_move?: ApiResource | null }> }
type ApiEvolutionChain = { chain: ApiEvolutionNode }
type ApiMove = { id: number; name: string; type?: ApiResource; damage_class?: ApiResource | null; power?: number | null; accuracy?: number | null; pp?: number | null }
type CacheEntry = { expiresAt: number; value: unknown }

export class PokemonNotFoundError extends Error {}
export class PokemonProviderError extends Error {}

@Injectable()
export class PokemonService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly inFlight = new Map<string, Promise<unknown>>()
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly maxCacheEntries = 2_000
  private readonly listCacheKey = 'pokemon-catalog-entries'

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('POKEAPI_BASE_URL', 'https://pokeapi.co/api/v2').replace(/\/$/, '')
    this.timeoutMs = config.get<number>('POKEAPI_TIMEOUT_MS', 5000)
    this.cacheTtlMs = config.get<number>('POKEAPI_CACHE_TTL_MS', 24 * 60 * 60 * 1000)
  }

  async resolvePokemon(reference: {
    speciesId?: number
    speciesSlug?: string
    formId?: number
    formSlug?: string
  }): Promise<PokemonReference> {
    const identifier = reference.formId ?? reference.formSlug ?? reference.speciesId ?? reference.speciesSlug
    if (!identifier) throw new UnprocessableEntityException('É necessário informar a referência do Pokémon.')

    const raw = await this.getRaw<ApiPokemon>(`pokemon/${this.normalizeIdentifier(identifier)}`)
    const pokemon = this.toSummary(raw)
    const speciesId = this.idFromUrl(raw.species.url)
    const speciesSlug = raw.species.name
    if (reference.speciesId !== undefined && reference.speciesId !== speciesId) {
      throw new BadGatewayException('A espécie informada não corresponde ao Pokémon consultado.')
    }
    if (reference.speciesSlug && reference.speciesSlug !== speciesSlug) {
      throw new BadGatewayException('O slug da espécie informada não corresponde ao Pokémon consultado.')
    }
    if (reference.formId !== undefined && reference.formId !== raw.id) {
      throw new BadGatewayException('A forma informada não corresponde ao Pokémon consultado.')
    }
    if (reference.formSlug && reference.formSlug !== raw.name) {
      throw new BadGatewayException('O slug da forma informada não corresponde ao Pokémon consultado.')
    }
    return { ...pokemon, speciesId, speciesSlug, formId: raw.id, formSlug: raw.name }
  }

  async resolveMove(reference: { moveId?: number; moveSlug?: string }): Promise<MoveSummary> {
    const identifier = reference.moveId ?? reference.moveSlug
    if (!identifier) throw new UnprocessableEntityException('É necessário informar a referência do golpe.')
    const move = await this.getRaw<ApiMove>(`move/${this.normalizeIdentifier(identifier)}`)
    return { id: move.id, slug: move.name, name: this.titleCase(move.name) }
  }

  async getDetails(identifier: string): Promise<Record<string, unknown>> {
    const pokemon = await this.getRaw<ApiPokemon>(`pokemon/${this.normalizeIdentifier(identifier)}`)
    const summary = this.toSummary(pokemon)
    let partial = false
    let evolutionChain: Array<Record<string, unknown>> = []
    try {
      const species = await this.getRaw<ApiSpecies>(this.resourcePath(pokemon.species.url))
      if (species.evolution_chain) {
        const chain = await this.getRaw<ApiEvolutionChain>(this.resourcePath(species.evolution_chain.url))
        evolutionChain = await this.flattenEvolution(chain.chain)
      }
    } catch {
      partial = true
    }
    const moves = await Promise.all((pokemon.moves ?? []).slice(0, 48).map(async (item) => {
      try {
        const move = await this.getRaw<ApiMove>(this.resourcePath(item.move.url))
        return { id: move.id, slug: move.name, name: this.titleCase(move.name), type: move.type?.name ?? null, category: move.damage_class?.name ? this.titleCase(move.damage_class.name) : null, power: move.power ?? null, accuracy: move.accuracy ?? null, pp: move.pp ?? null }
      } catch {
        partial = true
        return { id: this.idFromUrl(item.move.url), slug: item.move.name, name: this.titleCase(item.move.name), type: null, category: null, power: null, accuracy: null, pp: null }
      }
    }))
    return {
      ...summary,
      baseStats: Object.fromEntries((pokemon.stats ?? []).map((item) => [item.stat.name, item.base_stat])),
      abilities: (pokemon.abilities ?? []).map((item) => ({ slug: item.ability.name, name: this.titleCase(item.ability.name), hidden: item.is_hidden })),
      evolutionChain,
      moves,
      source: 'pokeapi',
      partial,
    }
  }

  async getSummary(identifier: string | number): Promise<PokemonSummary> {
    return this.toSummary(await this.getRaw<ApiPokemon>(`pokemon/${this.normalizeIdentifier(identifier)}`))
  }

  async getRecommendationCandidates(preferredTypes: string[] = [], excludedSpeciesIds: number[] = []): Promise<PokemonSummary[]> {
    const names = new Set<string>()
    for (const type of preferredTypes.slice(0, 4)) {
      try {
        const resource = await this.getRaw<{ pokemon: Array<{ pokemon: ApiResource }> }>(`type/${type}`)
        for (const entry of resource.pokemon.slice(0, 12)) names.add(entry.pokemon.name)
      } catch { /* Keep candidates from the other preferred types. */ }
    }
    if (!names.size) (await this.getCatalogEntries()).slice(0, 24).forEach(({ name }) => names.add(name))
    const summaries = await Promise.all([...names].slice(0, 24).map(async (name) => {
      try { return await this.getSummary(name) } catch { return null }
    }))
    const excluded = new Set(excludedSpeciesIds)
    const unique = new Set<number>()
    return summaries.flatMap((summary) => {
      if (!summary || excluded.has(summary.speciesId) || unique.has(summary.speciesId)) return []
      unique.add(summary.speciesId)
      return [summary]
    }).slice(0, 12)
  }

  async list(query: { search?: string; type?: string; generation?: number; page: number; pageSize: number }) {
    const offset = (query.page - 1) * query.pageSize
    const catalog = await this.getCatalogEntries()
    let entries = [...catalog]
    if (query.type) {
      const resource = await this.getRaw<{ pokemon: Array<{ pokemon: ApiResource }> }>(`type/${query.type}`)
      const typeNames = new Set(resource.pokemon.map((item) => item.pokemon.name))
      entries = entries.filter(({ name }) => typeNames.has(name))
    }
    if (query.generation) {
      const resource = await this.getRaw<{ pokemon_species: ApiResource[] }>(`generation/${query.generation}`)
      const generationNames = new Set(resource.pokemon_species.map((item) => item.name))
      entries = entries.filter(({ name }) => generationNames.has(name))
    }
    if (query.search) {
      const search = this.normalizeSearch(query.search)
      if (/^\d+$/.test(query.search)) {
        const id = Number(query.search)
        entries = entries.filter((entry) => this.idFromUrl(entry.url) === id)
      } else {
        entries = entries.filter(({ name }) => this.normalizeSearch(name).includes(search) || name === search)
      }
    }
    const pageItems = entries.slice(offset, offset + query.pageSize)
    const summaries = await Promise.allSettled(pageItems.map(({ name }) => this.getSummary(name)))
    const data = summaries.map((result, index) => result.status === 'fulfilled'
      ? result.value
      : this.toCatalogSummary(pageItems[index], query.type))
    return { data, meta: { page: query.page, pageSize: query.pageSize, total: entries.length } }
  }

  private toSummary(pokemon: ApiPokemon): PokemonSummary {
    return {
      id: pokemon.id,
      slug: pokemon.name,
      name: this.titleCase(pokemon.name),
      speciesId: this.idFromUrl(pokemon.species.url),
      speciesSlug: pokemon.species.name,
      formId: pokemon.id,
      formSlug: pokemon.name,
      spriteUrl: pokemon.sprites?.front_default ?? null,
      artworkUrl: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
      types: pokemon.types.sort((a, b) => a.slot - b.slot).map((item) => item.type.name),
    }
  }

  private toCatalogSummary(resource: ApiResource, knownType?: string): PokemonSummary {
    const id = this.idFromUrl(resource.url)
    return {
      id,
      slug: resource.name,
      name: this.titleCase(resource.name),
      speciesId: id,
      speciesSlug: resource.name,
      formId: id,
      formSlug: resource.name,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      artworkUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      types: knownType ? [knownType] : [],
    }
  }

  private async getCatalogEntries(): Promise<ApiResource[]> {
    const cached = this.cache.get(this.listCacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value as ApiResource[]
    const resource = await this.getRaw<{ results: ApiResource[] }>('pokemon?limit=1025&offset=0')
    this.setCache(this.listCacheKey, resource.results)
    return resource.results
  }

  private async flattenEvolution(node: ApiEvolutionNode, condition: string | null = null): Promise<Array<Record<string, unknown>>> {
    const pokemon = await this.getRaw<ApiPokemon>(`pokemon/${node.species.name}`)
    const entry = { id: pokemon.id, slug: pokemon.name, name: this.titleCase(pokemon.name), spriteUrl: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null, condition }
    const children = await Promise.all((node.evolves_to ?? []).map((child) => this.flattenEvolution(child, this.evolutionCondition(child.evolution_details?.[0]))))
    return [entry, ...children.flat()]
  }

  private evolutionCondition(details?: { min_level?: number | null; item?: ApiResource | null; trigger?: ApiResource | null; time_of_day?: string; known_move?: ApiResource | null }): string | null {
    if (!details) return null
    if (details.min_level) return `Nível ${details.min_level}`
    if (details.item) return this.titleCase(details.item.name)
    if (details.known_move) return `Golpe: ${this.titleCase(details.known_move.name)}`
    if (details.time_of_day) return details.time_of_day === 'day' ? 'Durante o dia' : 'Durante a noite'
    return details.trigger?.name ? this.titleCase(details.trigger.name) : null
  }

  private resourcePath(url: string): string {
    const match = url.match(/\/api\/v2\/(.+)$/)
    if (!match?.[1]) throw new BadGatewayException('A PokéAPI retornou uma referência inválida.')
    return match[1]
  }

  private async getRaw<T>(path: string): Promise<T> {
    const key = path.toLowerCase()
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T

    const pending = this.inFlight.get(key)
    if (pending) return pending as Promise<T>

    const request = this.fetchRaw<T>(path, key, cached)
    this.inFlight.set(key, request)
    try {
      return await request
    } finally {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key)
    }
  }

  private async fetchRaw<T>(path: string, key: string, stale?: CacheEntry): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, { signal: controller.signal })
      if (response.status === 404) throw new PokemonNotFoundError()
      if (!response.ok) throw new PokemonProviderError(`PokéAPI respondeu ${response.status}.`)
      const value = (await response.json()) as T
      this.setCache(key, value)
      return value
    } catch (error) {
      if (error instanceof PokemonNotFoundError) throw new NotFoundException('Pokémon ou golpe não encontrado na PokéAPI.')
      if (stale) return stale.value as T
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ServiceUnavailableException('A PokéAPI excedeu o tempo limite.')
      }
      if (error instanceof BadGatewayException || error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error
      if (error instanceof TypeError) throw new ServiceUnavailableException('A PokéAPI está indisponível no momento.')
      throw new BadGatewayException('Não foi possível consultar a PokéAPI.')
    } finally {
      clearTimeout(timeout)
    }
  }

  private setCache(key: string, value: unknown): void {
    if (!this.cache.has(key) && this.cache.size >= this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined
      if (oldestKey) this.cache.delete(oldestKey)
    }
    this.cache.delete(key)
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs })
  }

  private idFromUrl(url: string): number {
    const match = url.match(/\/([^/]+)\/?$/)
    const id = Number(match?.[1])
    if (!Number.isInteger(id) || id <= 0) throw new BadGatewayException('A PokéAPI retornou um identificador inválido.')
    return id
  }

  private titleCase(value: string): string {
    return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }

  private normalizeSearch(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.'’]/g, '').replace(/\s+/g, '-')
  }

  private normalizeIdentifier(value: string | number): string {
    const identifier = String(value).trim().toLowerCase()
    if (!/^(?:[1-9]\d{0,5}|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(identifier) || identifier.length > 120) {
      throw new UnprocessableEntityException('O identificador informado é inválido.')
    }
    return identifier
  }
}

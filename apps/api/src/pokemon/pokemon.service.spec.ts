import { NotFoundException } from '@nestjs/common'
import { PokemonService } from './pokemon.service'

describe('PokemonService', () => {
  const config = { get: (_key: string, fallback: unknown) => fallback }
  let service: PokemonService

  beforeEach(() => {
    service = new PokemonService(config as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('normalizes a Pokémon and caches repeated lookups', async () => {
    const response = {
      id: 25,
      name: 'pikachu',
      species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
      sprites: { front_default: 'https://img/pikachu.png' },
      types: [{ slot: 1, type: { name: 'electric', url: '' } }],
    }
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => response } as Response)

    await expect(service.resolvePokemon({ speciesId: 25, speciesSlug: 'pikachu' })).resolves.toMatchObject({ speciesId: 25, speciesSlug: 'pikachu', formId: 25, formSlug: 'pikachu', name: 'Pikachu' })
    await service.resolvePokemon({ speciesId: 25 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares an in-flight request between simultaneous lookups', async () => {
    const response = {
      id: 25,
      name: 'pikachu',
      species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
      sprites: { front_default: 'https://img/pikachu.png' },
      types: [{ slot: 1, type: { name: 'electric', url: '' } }],
    }
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => response } as Response)

    await Promise.all([service.getSummary('pikachu'), service.getSummary('pikachu'), service.getSummary('pikachu')])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('converts a PokéAPI 404 to a stable not found error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)
    await expect(service.getSummary('missingno')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('supports partial name search across the catalog instead of only exact lookups', async () => {
    const catalog = { results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }, { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' }] }
    const pokemon = { id: 25, name: 'pikachu', species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }, sprites: { front_default: 'https://img/pikachu.png' }, types: [{ slot: 1, type: { name: 'electric', url: '' } }] }
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      return { ok: true, status: 200, json: async () => url.includes('pokemon?limit=1025') ? catalog : pokemon } as Response
    })

    await expect(service.list({ search: 'pika', page: 1, pageSize: 24 })).resolves.toMatchObject({ meta: { total: 1 }, data: [{ name: 'Pikachu' }] })
  })
})

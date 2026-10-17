import { StrategicAnalysisService } from './strategic-analysis.service'

describe('StrategicAnalysisService', () => {
  it('produces deterministic defensive, offensive and need profiles', async () => {
    const details = new Map<number, any>([
      [6, { id: 6, name: 'Charizard', speciesId: 6, speciesSlug: 'charizard', formId: 6, formSlug: 'charizard', types: ['fire', 'flying'], baseStats: { hp: 78, attack: 84, defense: 78, 'special-attack': 109, 'special-defense': 85, speed: 100 }, partial: false, moves: [{ id: 126, slug: 'flamethrower', name: 'Flamethrower', type: 'fire', category: 'Special', power: 90 }, { id: 446, slug: 'stealth-rock', name: 'Stealth Rock', type: 'rock', category: 'Status', power: null }] }],
      [12, { id: 12, name: 'Butterfree', speciesId: 12, speciesSlug: 'butterfree', formId: 12, formSlug: 'butterfree', types: ['bug', 'flying'], baseStats: { hp: 60, attack: 45, defense: 50, 'special-attack': 90, 'special-defense': 80, speed: 70 }, partial: false, moves: [{ id: 405, slug: 'bug-buzz', name: 'Bug Buzz', type: 'bug', category: 'Special', power: 90 }] }],
    ])
    const pokemon = { getDetails: jest.fn(async (identifier: string) => details.get(Number(identifier))) }
    const service = new StrategicAnalysisService({} as never, pokemon as never)

    const result = await service.analyze({ name: 'Teste', pokemon: [
      { position: 1, speciesId: 6, moves: [{ slot: 1, moveId: 126 }] },
      { position: 2, speciesId: 12, moves: [{ slot: 1, moveId: 405 }] },
    ] })

    expect(result.team.typesPresent).toEqual(['bug', 'fire', 'flying'])
    expect(result.members[0].defense.weaknesses.find((entry) => entry.type === 'rock')?.multiplier).toBe(4)
    expect(result.defense.sharedWeaknesses.find((entry) => entry.type === 'rock')?.memberCount).toBe(2)
    expect(result.offense.availableTypes).toEqual(['fire', 'bug'])
    expect(result.offense.moves[0]).toMatchObject({ category: 'special', stab: true })
    expect(result.needs.some((need) => need.id === 'shared-weakness-rock')).toBe(true)
    expect(result.aiContext).toMatchObject({ ruleset: 'casual-v1' })
  })

  it('rejects duplicate positions before querying the provider', async () => {
    const pokemon = { getDetails: jest.fn() }
    const service = new StrategicAnalysisService({} as never, pokemon as never)
    await expect(service.analyze({ pokemon: [{ position: 1, speciesId: 6 }, { position: 1, speciesId: 12 }] })).rejects.toThrow('posições')
    expect(pokemon.getDetails).not.toHaveBeenCalled()
  })
})

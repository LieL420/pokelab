import { RecommendationValidationService } from './recommendation-validation.service'

describe('RecommendationValidationService', () => {
  const service = new RecommendationValidationService()
  const candidates = [{ id: 25, slug: 'pikachu', speciesId: 25, speciesSlug: 'pikachu', formId: 25, formSlug: 'pikachu', name: 'Pikachu', spriteUrl: null, artworkUrl: null, types: ['electric'] }]
  it('removes duplicate and out-of-list Pokémon recommendations', () => {
    const result = service.validatePokemon({ recommendations: [{ candidateId: 999, reason: 'x', suggestedRole: 'x', limitations: [] }, { candidateId: 25, reason: 'válido', suggestedRole: 'suporte', limitations: [] }, { candidateId: 25, reason: 'duplicado', suggestedRole: 'x', limitations: [] }], warnings: [] }, candidates)
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0].candidateId).toBe(25)
  })
  it('rejects a moveset with an unknown move', () => {
    expect(() => service.validateMoveset({ moveIds: [84, 999], reason: 'x', moveReasons: [], limitations: [], warnings: [] }, [{ id: 84 }])).toThrow(/golpes inválidos/)
  })
})

import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import type { MovesetRecommendation, PokemonCandidate, PokemonRecommendation } from './ai.types'

@Injectable()
export class RecommendationValidationService {
  validateAnalysis(value: unknown) {
    const data = value as Record<string, unknown> | null
    const fields = ['strengths', 'weaknesses', 'offensiveCoverage', 'synergy', 'suggestions', 'alerts', 'limitations']
    if (!data || fields.some((field) => !Array.isArray(data[field]) || (data[field] as unknown[]).some((item) => typeof item !== 'string'))) throw new UnprocessableEntityException('A resposta da IA não pôde ser validada.')
    return Object.fromEntries(fields.map((field) => [field, (data[field] as string[]).slice(0, 5)]))
  }
  validatePokemon(value: unknown, candidates: PokemonCandidate[]): { recommendations: PokemonRecommendation[]; warnings: string[] } {
    const data = value as { recommendations?: unknown; warnings?: unknown } | null
    if (!data || !Array.isArray(data.recommendations) || !Array.isArray(data.warnings)) throw new UnprocessableEntityException('A resposta de recomendação não pôde ser validada.')
    const allowed = new Map(candidates.map((candidate) => [candidate.id, candidate])); const seen = new Set<number>()
    const recommendations = data.recommendations.flatMap((item) => { const candidate = item as Partial<PokemonRecommendation>; const candidateId = candidate.candidateId; if (typeof candidateId !== 'number' || !Number.isInteger(candidateId) || !allowed.has(candidateId) || seen.has(candidateId) || typeof candidate.reason !== 'string' || typeof candidate.suggestedRole !== 'string' || !Array.isArray(candidate.limitations)) return []; seen.add(candidateId); return [{ candidateId, reason: candidate.reason.slice(0, 500), suggestedRole: candidate.suggestedRole.slice(0, 120), limitations: candidate.limitations.filter((entry): entry is string => typeof entry === 'string').slice(0, 3) }] }).slice(0, 4)
    return { recommendations, warnings: data.warnings.filter((entry): entry is string => typeof entry === 'string').slice(0, 5) }
  }
  validateMoveset(value: unknown, allowedMoves: Array<{ id: number }>): MovesetRecommendation & { warnings: string[] } {
    const data = value as Partial<MovesetRecommendation> & { warnings?: unknown }; const allowed = new Set(allowedMoves.map((move) => move.id))
    if (!data || !Array.isArray(data.moveIds) || !data.moveIds.length || data.moveIds.length > 4 || data.moveIds.some((id) => !Number.isInteger(id) || !allowed.has(id)) || new Set(data.moveIds).size !== data.moveIds.length || typeof data.reason !== 'string' || !Array.isArray(data.moveReasons) || !Array.isArray(data.limitations) || !Array.isArray(data.warnings)) throw new UnprocessableEntityException('A sugestão de moveset contém golpes inválidos ou incompatíveis.')
    const moveReasons = data.moveReasons.filter((entry): entry is { moveId: number; function: string } => Boolean(entry && Number.isInteger(entry.moveId) && data.moveIds?.includes(entry.moveId) && typeof entry.function === 'string')).slice(0, 4)
    return { moveIds: data.moveIds, reason: data.reason.slice(0, 700), moveReasons, limitations: data.limitations.filter((entry): entry is string => typeof entry === 'string').slice(0, 5), warnings: data.warnings.filter((entry): entry is string => typeof entry === 'string').slice(0, 5) }
  }
}

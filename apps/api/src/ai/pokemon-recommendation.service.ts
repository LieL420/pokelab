import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { getTypeMultiplier, TYPES } from '../analysis/type-chart'
import { StrategicAnalysisService } from '../analysis/strategic-analysis.service'
import type { StrategicTeamInput } from '../analysis/analysis.types'
import { PokemonService } from '../pokemon/pokemon.service'
import { AiAnalysisService } from './ai-analysis.service'
import { pokemonRecommendationPrompt } from './ai.prompts'
import { pokemonRecommendationSchema } from './ai.schemas'
import { GeminiService } from './gemini.service'
import type { PokemonCandidate, PokemonRecommendationResponse } from './ai.types'
import { RecommendationValidationService } from './recommendation-validation.service'

@Injectable()
export class PokemonRecommendationService {
  constructor(private readonly strategic: StrategicAnalysisService, private readonly context: AiAnalysisService, private readonly pokemon: PokemonService, private readonly gemini: GeminiService, private readonly validation: RecommendationValidationService) {}
  async recommendSavedTeam(ownerId: string, teamId: string) { const result = await this.strategic.analyzeSavedTeam(ownerId, teamId); return this.run(result.data) }
  async recommendPreview(input: StrategicTeamInput) { return this.run(await this.strategic.analyze(input)) }
  private async run(analysis: Awaited<ReturnType<StrategicAnalysisService['analyze']>>) {
    const preferredTypes = this.preferredTypes(analysis)
    const summaries = await this.pokemon.getRecommendationCandidates(preferredTypes, analysis.members.map((member) => member.speciesId))
    const candidates: PokemonCandidate[] = summaries.map((summary) => ({ id: summary.id, slug: summary.slug, speciesId: summary.speciesId, speciesSlug: summary.speciesSlug, formId: summary.formId, formSlug: summary.formSlug, name: summary.name, spriteUrl: summary.spriteUrl, artworkUrl: summary.artworkUrl ?? null, types: summary.types }))
    if (!candidates.length) throw new UnprocessableEntityException('Não foi possível montar uma lista de candidatos reais.')
    const raw = await this.gemini.generate(pokemonRecommendationPrompt(this.context.toContext(analysis), candidates), pokemonRecommendationSchema as unknown as Record<string, unknown>)
    const validated = this.validation.validatePokemon(raw, candidates)
    return { data: { ...validated, recommendations: validated.recommendations.map((recommendation) => ({ ...recommendation, pokemon: candidates.find((candidate) => candidate.id === recommendation.candidateId)! })), limitations: analysis.limitations, ruleset: analysis.ruleset.id, source: 'gemini' as const, model: this.gemini.model } satisfies PokemonRecommendationResponse }
  }
  private preferredTypes(analysis: Awaited<ReturnType<StrategicAnalysisService['analyze']>>) {
    const threats = analysis.defense.sharedWeaknesses.map((entry) => entry.type); const gaps = analysis.offense.uncoveredTypes; const scores = new Map<string, number>()
    for (const candidateType of TYPES) { const defensive = threats.reduce((score, threat) => score + (getTypeMultiplier(candidateType, [threat]) < 1 ? 2 : 0), 0); const offensive = gaps.reduce((score, gap) => score + (getTypeMultiplier(candidateType, [gap]) > 1 ? 1 : 0), 0); scores.set(candidateType, defensive + offensive) }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).filter(([, score]) => score > 0).map(([type]) => type).slice(0, 4)
  }
}

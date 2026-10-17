import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { StrategicAnalysisService } from '../analysis/strategic-analysis.service'
import type { StrategicTeamInput } from '../analysis/analysis.types'
import { PokemonService } from '../pokemon/pokemon.service'
import { AiAnalysisService } from './ai-analysis.service'
import { movesetRecommendationPrompt } from './ai.prompts'
import { movesetRecommendationSchema } from './ai.schemas'
import { GeminiService } from './gemini.service'
import type { MovesetRecommendationResponse } from './ai.types'
import { RecommendationValidationService } from './recommendation-validation.service'

@Injectable()
export class MovesetRecommendationService {
  constructor(private readonly strategic: StrategicAnalysisService, private readonly context: AiAnalysisService, private readonly pokemon: PokemonService, private readonly gemini: GeminiService, private readonly validation: RecommendationValidationService) {}
  async recommendSavedTeam(ownerId: string, teamId: string, position: number) { const result = await this.strategic.analyzeSavedTeam(ownerId, teamId); return this.run(result.data, position) }
  async recommendPreview(input: StrategicTeamInput, position: number) { return this.run(await this.strategic.analyze(input), position) }
  private async run(analysis: Awaited<ReturnType<StrategicAnalysisService['analyze']>>, position: number) {
    const member = analysis.members.find((item) => item.position === position); if (!member) throw new NotFoundException('O integrante solicitado não está no time.')
    const details = await this.pokemon.getDetails(String(member.formId ?? member.speciesId)) as { id: number; name: string; formSlug?: string; types: string[]; moves: Array<{ id: number; slug: string; name: string; type?: string | null; category?: string | null; power?: number | null; accuracy?: number | null; pp?: number | null }> }
    const candidates = details.moves.filter((move) => move.type && move.category).slice(0, 48); if (!candidates.length) throw new UnprocessableEntityException('Não há golpes compatíveis com dados suficientes para sugerir um moveset.')
    const raw = await this.gemini.generate(movesetRecommendationPrompt(this.context.toContext(analysis), { id: details.id, name: details.name, formSlug: details.formSlug, types: details.types, currentMoves: member.moves }, candidates), movesetRecommendationSchema as unknown as Record<string, unknown>)
    const validated = this.validation.validateMoveset(raw, candidates); const functionById = new Map(validated.moveReasons.map((item) => [item.moveId, item.function]))
    const moves = validated.moveIds.map((id) => { const move = candidates.find((candidate) => candidate.id === id)!; return { id: move.id, slug: move.slug, name: move.name, type: move.type ?? null, category: move.category ?? null, power: move.power ?? null, function: functionById.get(id) ?? 'Contribui para a função proposta pelo time.' } })
    return { data: { ...validated, pokemon: { id: details.id, name: details.name, formSlug: details.formSlug ?? member.formSlug ?? member.speciesSlug, types: details.types }, moves, ruleset: analysis.ruleset.id, source: 'gemini' as const, model: this.gemini.model } satisfies MovesetRecommendationResponse }
  }
}

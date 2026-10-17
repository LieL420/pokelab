import { Injectable } from '@nestjs/common'
import { StrategicAnalysisService } from '../analysis/strategic-analysis.service'
import type { StrategicTeamAnalysis, StrategicTeamInput } from '../analysis/analysis.types'
import { analysisPrompt } from './ai.prompts'
import { teamAnalysisSchema } from './ai.schemas'
import { GeminiService } from './gemini.service'
import type { AiContext, AiTeamAnalysis } from './ai.types'
import { RecommendationValidationService } from './recommendation-validation.service'

@Injectable()
export class AiAnalysisService {
  constructor(private readonly strategic: StrategicAnalysisService, private readonly gemini: GeminiService, private readonly validation: RecommendationValidationService) {}
  async analyzeSavedTeam(ownerId: string, teamId: string) { return this.run(await this.strategic.analyzeSavedTeam(ownerId, teamId)) }
  async analyzePreview(input: StrategicTeamInput) { return this.run({ data: await this.strategic.analyze(input) }) }
  private async run(result: { data: StrategicTeamAnalysis }) {
    const response = await this.gemini.generate<AiTeamAnalysis>(analysisPrompt(this.toContext(result.data)), teamAnalysisSchema as unknown as Record<string, unknown>)
    return { data: { ...this.validation.validateAnalysis(response), source: 'gemini' as const, model: this.gemini.model, promptVersion: this.gemini.promptVersion, ruleset: result.data.ruleset.id, deterministic: result.data } }
  }
  toContext(analysis: StrategicTeamAnalysis): AiContext { return { team: analysis.team, ruleset: analysis.ruleset, members: analysis.members, defense: { sharedWeaknesses: analysis.defense.sharedWeaknesses, resistances: analysis.defense.resistances.slice(0, 8), immunities: analysis.defense.immunities.slice(0, 8), alerts: analysis.defense.alerts }, offense: { availableTypes: analysis.offense.availableTypes, superEffectiveAgainst: analysis.offense.superEffectiveAgainst, uncoveredTypes: analysis.offense.uncoveredTypes, limitations: analysis.offense.limitations }, synergy: analysis.synergy, needs: analysis.needs.slice(0, 8), limitations: analysis.limitations } }
}

import type { StrategicTeamAnalysis } from '../analysis/analysis.types'

export type AiContext = {
  team: StrategicTeamAnalysis['team']
  ruleset: StrategicTeamAnalysis['ruleset']
  members: StrategicTeamAnalysis['members']
  defense: Pick<StrategicTeamAnalysis['defense'], 'sharedWeaknesses' | 'resistances' | 'immunities' | 'alerts'>
  offense: Pick<StrategicTeamAnalysis['offense'], 'availableTypes' | 'superEffectiveAgainst' | 'uncoveredTypes' | 'limitations'>
  synergy: StrategicTeamAnalysis['synergy']
  needs: StrategicTeamAnalysis['needs']
  limitations: string[]
}

export type AiTeamAnalysis = { strengths: string[]; weaknesses: string[]; offensiveCoverage: string[]; synergy: string[]; suggestions: string[]; alerts: string[]; limitations: string[] }
export type PokemonCandidate = { id: number; slug: string; speciesId: number; speciesSlug: string; formId: number; formSlug: string; name: string; spriteUrl: string | null; artworkUrl: string | null; types: string[] }
export type PokemonRecommendation = { candidateId: number; reason: string; suggestedRole: string; limitations: string[] }
export type PokemonRecommendationResponse = { recommendations: Array<PokemonRecommendation & { pokemon: PokemonCandidate }>; warnings: string[]; limitations: string[]; ruleset: string; source: 'gemini'; model: string }
export type MovesetRecommendation = { moveIds: number[]; reason: string; moveReasons: Array<{ moveId: number; function: string }>; limitations: string[] }
export type MovesetRecommendationResponse = MovesetRecommendation & { pokemon: { id: number; name: string; formSlug: string; types: string[] }; moves: Array<{ id: number; slug: string; name: string; type: string | null; category: string | null; power: number | null; function: string }>; warnings: string[]; ruleset: string; source: 'gemini'; model: string }

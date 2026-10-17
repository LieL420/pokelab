import type { PokemonSummary } from './pokemon'

export type TeamMove = {
  id?: string
  slot: number
  moveId: number
  moveSlug: string
  moveNameSnapshot: string
}

export type TeamMember = {
  id: string
  position: number
  speciesId: number
  speciesSlug: string
  formId: number | null
  formSlug: string | null
  displayNameSnapshot: string
  spriteUrlSnapshot: string | null
  createdAt: string
  updatedAt: string
  moves: TeamMove[]
}

export type Team = {
  id: string
  name: string
  description: string | null
  format: 'casual'
  createdAt: string
  updatedAt: string
  pokemon: TeamMember[]
}

export type TeamListResponse = {
  data: Team[]
  meta: { page: number; pageSize: number; total: number }
}

export type TeamEditorMember = Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  source?: PokemonSummary
}

export type TeamEditorState = {
  id?: string
  name: string
  description: string
  format: 'casual'
  pokemon: TeamEditorMember[]
}

export type TeamAnalysisEntry = { type: string; multiplier: number; memberCount?: number }

export type TeamAnalysis = {
  typesPresent: string[]
  weaknesses: TeamAnalysisEntry[]
  resistances: TeamAnalysisEntry[]
  immunities: TeamAnalysisEntry[]
  offense: {
    selectedMoves: number
    source: 'moves' | 'types'
    attackingTypes: string[]
    superEffectiveAgainst: string[]
    uncoveredTypes: string[]
  }
  statProfile: {
    averageBulk: number
    averagePressure: number
    averageSpeed: number
    defensiveMembers: number
    offensiveMembers: number
  }
  coverage: { knownMembers: number; teamSize: number }
  ruleset: string
  partial?: boolean
  affectedMembers?: string[]
}

export type StrategicTypeEntry = TeamAnalysisEntry & { members?: string[]; vulnerableMembers?: string[]; resistantMembers?: string[]; immuneMembers?: string[]; neutralMembers?: string[] }
export type StrategicMove = { id: number; slug: string; name: string; type: string | null; category: 'physical' | 'special' | 'status' | null; power: number | null; stab: boolean; effectiveAgainst: string[] }
export type StrategicMember = { position: number; name: string; types: string[]; moves: StrategicMove[]; defense: { weaknesses: StrategicTypeEntry[]; resistances: StrategicTypeEntry[]; immunities: StrategicTypeEntry[] }; possibleRoles: Array<{ role: string; confidence: 'possible' | 'supported'; rationale: string }> }
export type TeamNeed = { id: string; category: 'defense' | 'offense' | 'roles' | 'data'; description: string; evidence: string[]; relatedMembers: string[]; priority: 'high' | 'medium' | 'low'; limitation?: string }
export type TeamStrategicAnalysis = { team: { name: string | null; size: number; slotsUsed: number; typesPresent: string[] }; ruleset: { id: string; description: string }; members: StrategicMember[]; defense: { byType: StrategicTypeEntry[]; sharedWeaknesses: StrategicTypeEntry[]; resistances: StrategicTypeEntry[]; immunities: StrategicTypeEntry[]; alerts: string[] }; offense: { availableTypes: string[]; superEffectiveAgainst: string[]; uncoveredTypes: string[]; moves: StrategicMove[]; limitations: string[] }; synergy: { defensive: Array<{ from: string; threat: string; answers: string[]; rationale: string }>; offensive: string[]; gaps: string[] }; needs: TeamNeed[]; limitations: string[]; aiContext: unknown }

export type AiTeamAnalysis = { strengths: string[]; weaknesses: string[]; offensiveCoverage: string[]; synergy: string[]; suggestions: string[]; alerts: string[]; limitations: string[]; source: 'gemini'; model: string; promptVersion: string; ruleset: string; deterministic: TeamStrategicAnalysis }
export type AiPokemonCandidate = { id: number; slug: string; speciesId: number; speciesSlug: string; formId: number; formSlug: string; name: string; spriteUrl: string | null; artworkUrl: string | null; types: string[] }
export type AiPokemonRecommendation = { candidateId: number; reason: string; suggestedRole: string; limitations: string[]; pokemon: AiPokemonCandidate }
export type AiPokemonResponse = { recommendations: AiPokemonRecommendation[]; warnings: string[]; limitations: string[]; ruleset: string; source: 'gemini'; model: string }
export type AiMovesetMove = { id: number; slug: string; name: string; type: string | null; category: string | null; power: number | null; function: string }
export type AiMovesetResponse = { moveIds: number[]; reason: string; moveReasons: Array<{ moveId: number; function: string }>; limitations: string[]; warnings: string[]; pokemon: { id: number; name: string; formSlug: string; types: string[] }; moves: AiMovesetMove[]; ruleset: string; source: 'gemini'; model: string }

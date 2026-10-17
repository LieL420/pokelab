import type { PokemonType } from './type-chart'

export type AnalysisMove = {
  id: number
  slug: string
  name: string
  type: PokemonType | null
  category: 'physical' | 'special' | 'status' | null
  power: number | null
  stab: boolean
  effectiveAgainst: PokemonType[]
}

export type AnalysisMember = {
  position: number
  id?: string
  name: string
  speciesId: number
  speciesSlug: string
  formId: number | null
  formSlug: string | null
  types: PokemonType[]
  baseStats: Record<string, number>
  moves: AnalysisMove[]
  defense: { weaknesses: TypeEntry[]; resistances: TypeEntry[]; immunities: TypeEntry[] }
  possibleRoles: RoleAnalysis[]
}

export type TypeEntry = { type: PokemonType; multiplier: number; memberCount?: number; members?: string[] }
export type RoleAnalysis = { role: string; confidence: 'possible' | 'supported'; rationale: string }
export type DefensiveTypeSummary = TypeEntry & { vulnerableMembers: string[]; resistantMembers: string[]; immuneMembers: string[]; neutralMembers: string[] }
export type OffensiveCoverage = { availableTypes: PokemonType[]; superEffectiveAgainst: PokemonType[]; uncoveredTypes: PokemonType[]; moves: AnalysisMove[]; limitations: string[] }
export type TeamNeed = { id: string; category: 'defense' | 'offense' | 'roles' | 'data'; description: string; evidence: string[]; relatedMembers: string[]; priority: 'high' | 'medium' | 'low'; limitation?: string }

export type StrategicTeamAnalysis = {
  team: { name: string | null; size: number; slotsUsed: number; typesPresent: PokemonType[] }
  ruleset: { id: 'casual-v1'; description: string }
  members: AnalysisMember[]
  defense: { byType: DefensiveTypeSummary[]; sharedWeaknesses: TypeEntry[]; resistances: TypeEntry[]; immunities: TypeEntry[]; alerts: string[] }
  offense: OffensiveCoverage
  synergy: { defensive: Array<{ from: string; threat: PokemonType; answers: string[]; rationale: string }>; offensive: string[]; gaps: string[] }
  needs: TeamNeed[]
  limitations: string[]
  aiContext: { ruleset: string; members: Array<{ name: string; types: PokemonType[]; moves: Array<{ name: string; type: PokemonType | null; category: string | null }> }>; needs: TeamNeed[]; limitations: string[] }
}

export type StrategicMemberInput = { position: number; id?: string; speciesId?: number; speciesSlug?: string; formId?: number | null; formSlug?: string | null; moves?: Array<{ moveId?: number; moveSlug?: string; slot: number }> }
export type StrategicTeamInput = { name?: string | null; format?: string; pokemon: StrategicMemberInput[] }

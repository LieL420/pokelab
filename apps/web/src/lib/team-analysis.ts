import type { PokemonDetails } from '@/types/pokemon'
import type { TeamAnalysis, TeamAnalysisEntry } from '@/types/team'

const TYPES = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic', 'rock', 'steel', 'water']

const TYPE_CHART: Record<string, Record<string, number>> = {
  bug: { dark: 2, grass: 2, psychic: 2, fairy: 0.5, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, poison: 0.5, steel: 0.5 },
  dark: { ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5, fighting: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  electric: { flying: 2, water: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  fairy: { dark: 2, dragon: 2, fighting: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  fighting: { dark: 2, ice: 2, normal: 2, rock: 2, steel: 2, bug: 0.5, fairy: 0.5, flying: 0.5, poison: 0.5, psychic: 0.5, ghost: 0 },
  fire: { bug: 2, grass: 2, ice: 2, steel: 2, fairy: 2, dragon: 0.5, fire: 0.5, rock: 0.5, water: 0.5 },
  flying: { bug: 2, fighting: 2, grass: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  ghost: { ghost: 2, psychic: 2, dark: 0.5, normal: 0 },
  grass: { ground: 2, rock: 2, water: 2, bug: 0.5, dragon: 0.5, fire: 0.5, flying: 0.5, grass: 0.5, poison: 0.5, steel: 0.5 },
  ground: { electric: 2, fire: 2, poison: 2, rock: 2, steel: 2, bug: 0.5, grass: 0.5, flying: 0 },
  ice: { dragon: 2, flying: 2, grass: 2, ground: 2, fire: 0.5, ice: 0.5, steel: 0.5, water: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
  poison: { fairy: 2, grass: 2, ghost: 0.5, ground: 0.5, poison: 0.5, rock: 0.5, steel: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  rock: { bug: 2, fire: 2, flying: 2, ice: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  steel: { fairy: 2, ice: 2, rock: 2, electric: 0.5, fire: 0.5, water: 0.5, steel: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, dragon: 0.5, grass: 0.5, water: 0.5 },
}

function summarize(entries: Array<{ type: string; multiplier: number }>, mode: 'weakness' | 'resistance' | 'immunity'): TeamAnalysisEntry[] {
  return TYPES.map((type) => {
    const values = entries.filter((entry) => entry.type === type).map((entry) => entry.multiplier)
    const multiplier = mode === 'immunity' ? (values.some((value) => value === 0) ? 0 : 1) : mode === 'weakness' ? Math.max(...values, 0) : Math.min(...values.filter((value) => value > 0), 1)
    const memberCount = mode === 'weakness' ? values.filter((value) => value > 1).length : mode === 'resistance' ? values.filter((value) => value > 0 && value < 1).length : values.filter((value) => value === 0).length
    return { type, multiplier, memberCount }
  }).filter((entry) => mode === 'weakness' ? entry.multiplier > 1 : mode === 'resistance' ? entry.multiplier > 0 && entry.multiplier < 1 : entry.memberCount! > 0)
}

export function analyzeLocalTeam(details: PokemonDetails[], selectedMoveIds: number[] = []): TeamAnalysis {
  const entries = details.flatMap((pokemon) => TYPES.map((attackingType) => ({ type: attackingType, multiplier: pokemon.types.reduce((value, defendingType) => value * (TYPE_CHART[attackingType]?.[defendingType] ?? 1), 1) })))
  const selectedMoveIdSet = new Set(selectedMoveIds)
  const selectedMoves = details.flatMap((pokemon) => pokemon.moves).filter((move, index, moves) => selectedMoveIdSet.has(move.id) && moves.findIndex((candidate) => candidate.id === move.id) === index)
  const damagingMoves = selectedMoves.filter((move) => move.category?.toLowerCase() !== 'status' && move.type)
  const offenseSource = damagingMoves.length > 0 ? 'moves' : 'types'
  const attackingTypes = [...new Set(offenseSource === 'moves' ? damagingMoves.map((move) => move.type as string) : details.flatMap((pokemon) => pokemon.types))].sort()
  const superEffectiveAgainst = TYPES.filter((defendingType) => attackingTypes.some((attackingType) => (TYPE_CHART[attackingType]?.[defendingType] ?? 1) > 1))
  const memberProfiles = details.map((pokemon) => {
    const stats = pokemon.baseStats || {}
    const bulk = (Number(stats.hp || 0) * .35) + (Number(stats.defense || 0) * .325) + (Number(stats['special-defense'] || 0) * .325)
    const pressure = (Math.max(Number(stats.attack || 0), Number(stats['special-attack'] || 0)) * .75) + (Number(stats.speed || 0) * .25)
    return { bulk, pressure, speed: Number(stats.speed || 0) }
  })
  const average = (values: number[]) => values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0
  return {
    typesPresent: [...new Set(details.flatMap((pokemon) => pokemon.types))].sort(),
    weaknesses: summarize(entries, 'weakness').sort((a, b) => b.memberCount! - a.memberCount!),
    resistances: summarize(entries, 'resistance').sort((a, b) => a.multiplier - b.multiplier),
    immunities: summarize(entries, 'immunity'),
    offense: {
      selectedMoves: damagingMoves.length,
      source: offenseSource,
      attackingTypes,
      superEffectiveAgainst,
      uncoveredTypes: TYPES.filter((type) => !superEffectiveAgainst.includes(type)),
    },
    statProfile: {
      averageBulk: average(memberProfiles.map((profile) => profile.bulk)),
      averagePressure: average(memberProfiles.map((profile) => profile.pressure)),
      averageSpeed: average(memberProfiles.map((profile) => profile.speed)),
      defensiveMembers: memberProfiles.filter((profile) => profile.bulk - profile.pressure >= 6).length,
      offensiveMembers: memberProfiles.filter((profile) => profile.pressure - profile.bulk >= 6).length,
    },
    coverage: { knownMembers: details.length, teamSize: 6 },
    ruleset: 'casual-v1',
  }
}

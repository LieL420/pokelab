import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { PokemonService } from '../pokemon/pokemon.service'
import { getTypeMultiplier, TYPES, type PokemonType } from './type-chart'
import type { AnalysisMember, AnalysisMove, DefensiveTypeSummary, RoleAnalysis, StrategicMemberInput, StrategicTeamAnalysis, StrategicTeamInput, TeamNeed } from './analysis.types'

type Detail = Awaited<ReturnType<PokemonService['getDetails']>> & { types: string[]; baseStats: Record<string, number>; moves: Array<{ id: number; slug: string; name: string; type?: string | null; category?: string | null; power?: number | null }> }

@Injectable()
export class StrategicAnalysisService {
  constructor(private readonly prisma: PrismaService, private readonly pokemon: PokemonService) {}

  async analyzeSavedTeam(ownerId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, ownerId }, include: { pokemon: { orderBy: { position: 'asc' }, include: { moves: { orderBy: { slot: 'asc' } } } } } })
    if (!team) throw new NotFoundException('Time não encontrado.')
    return { data: await this.analyze({ name: team.name, format: team.format, pokemon: team.pokemon.map((member) => ({ position: member.position, id: member.id, speciesId: member.speciesId, speciesSlug: member.speciesSlug, formId: member.formId, formSlug: member.formSlug, moves: member.moves.map((move) => ({ slot: move.slot, moveId: move.moveId, moveSlug: move.moveSlug })) })) }) }
  }

  async analyze(input: StrategicTeamInput): Promise<StrategicTeamAnalysis> {
    this.validateComposition(input)
    const limitations: string[] = []
    const members: AnalysisMember[] = []
    for (const inputMember of input.pokemon.slice().sort((a, b) => a.position - b.position)) {
      const detail = await this.loadDetail(inputMember)
      const types = (detail.types.filter((type): type is PokemonType => TYPES.includes(type as PokemonType)))
      const moves = this.resolveMoves(detail, inputMember)
      const defense = this.defensiveProfile(types)
      members.push({ position: inputMember.position, id: inputMember.id, name: String(detail.name), speciesId: Number(detail.speciesId), speciesSlug: String(detail.speciesSlug), formId: detail.formId ? Number(detail.formId) : null, formSlug: detail.formSlug ? String(detail.formSlug) : null, types, baseStats: detail.baseStats ?? {}, moves, defense, possibleRoles: this.inferRoles(detail.baseStats ?? {}, moves) })
      if (!inputMember.moves?.length) limitations.push(`${detail.name} não possui golpes configurados; a cobertura ofensiva fica incompleta.`)
      else if (moves.length < inputMember.moves.length) limitations.push(`${detail.name} possui golpe(s) sem tipo/categoria disponível; esses golpes foram excluídos da cobertura simplificada.`)
      if (detail.partial) limitations.push(`${detail.name} veio com dados parciais da PokéAPI.`)
    }
    const defense = this.collectiveDefense(members)
    const offense = this.offensiveCoverage(members)
    const synergy = this.synergy(members, defense, offense)
    const needs = this.needs(members, defense, offense, limitations)
    return this.buildResponse(input, members, defense, offense, synergy, needs, limitations)
  }

  private validateComposition(input: StrategicTeamInput) {
    if (input.pokemon.length > 6) throw new UnprocessableEntityException('Uma análise aceita no máximo seis integrantes.')
    const positions = input.pokemon.map((member) => member.position)
    if (new Set(positions).size !== positions.length) throw new UnprocessableEntityException('As posições dos integrantes não podem se repetir.')
    if (positions.some((position) => !Number.isInteger(position) || position < 1 || position > 6)) throw new UnprocessableEntityException('As posições dos integrantes devem estar entre 1 e 6.')
    for (const member of input.pokemon) {
      if (!member.speciesId && !member.speciesSlug && !member.formId && !member.formSlug) throw new UnprocessableEntityException('Cada integrante precisa de uma referência de Pokémon.')
      const slots = (member.moves ?? []).map((move) => move.slot)
      if (new Set(slots).size !== slots.length) throw new UnprocessableEntityException('Os slots dos golpes não podem se repetir.')
    }
  }

  private async loadDetail(input: StrategicMemberInput): Promise<Detail> {
    const identifier = input.formId ?? input.formSlug ?? input.speciesId ?? input.speciesSlug
    if (!identifier) throw new NotFoundException('Cada integrante precisa de uma referência de Pokémon.')
    return this.pokemon.getDetails(String(identifier)) as Promise<Detail>
  }

  private resolveMoves(detail: Detail, input: StrategicMemberInput): AnalysisMove[] {
    return (input.moves ?? []).flatMap((ref) => {
      const move = detail.moves.find((candidate) => candidate.id === ref.moveId || candidate.slug === ref.moveSlug)
      if (!move || !move.type || !move.category) return []
      const category = move.category.toLowerCase()
      const normalizedCategory = category === 'physical' || category === 'special' || category === 'status' ? category : null
      if (!normalizedCategory) return []
      const type = TYPES.includes(move.type as PokemonType) ? move.type as PokemonType : null
      return [{ id: move.id, slug: move.slug, name: move.name, type, category: normalizedCategory, power: move.power ?? null, stab: Boolean(type && detail.types.includes(type)), effectiveAgainst: type && normalizedCategory !== 'status' ? TYPES.filter((defendingType) => getTypeMultiplier(type, [defendingType]) > 1) : [] }]
    })
  }

  private defensiveProfile(types: PokemonType[]) {
    const entries = TYPES.map((type) => ({ type, multiplier: getTypeMultiplier(type, types) }))
    return { weaknesses: entries.filter((entry) => entry.multiplier > 1), resistances: entries.filter((entry) => entry.multiplier > 0 && entry.multiplier < 1), immunities: entries.filter((entry) => entry.multiplier === 0) }
  }

  private collectiveDefense(members: AnalysisMember[]) {
    const byType: DefensiveTypeSummary[] = TYPES.map((type) => {
      const groups = { vulnerableMembers: [] as string[], resistantMembers: [] as string[], immuneMembers: [] as string[], neutralMembers: [] as string[] }
      for (const member of members) {
        const multiplier = getTypeMultiplier(type, member.types)
        if (multiplier === 0) groups.immuneMembers.push(member.name)
        else if (multiplier < 1) groups.resistantMembers.push(member.name)
        else if (multiplier > 1) groups.vulnerableMembers.push(member.name)
        else groups.neutralMembers.push(member.name)
      }
      const multiplier = groups.vulnerableMembers.length ? Math.max(...members.filter((member) => groups.vulnerableMembers.includes(member.name)).map((member) => getTypeMultiplier(type, member.types))) : 1
      return { type, multiplier, memberCount: groups.vulnerableMembers.length, ...groups }
    })
    return { byType, sharedWeaknesses: byType.filter((entry) => entry.vulnerableMembers.length >= 2).sort((a, b) => b.vulnerableMembers.length - a.vulnerableMembers.length), resistances: byType.filter((entry) => entry.resistantMembers.length > 0).sort((a, b) => b.resistantMembers.length - a.resistantMembers.length), immunities: byType.filter((entry) => entry.immuneMembers.length > 0), alerts: byType.filter((entry) => entry.vulnerableMembers.length >= 3 && entry.resistantMembers.length === 0 && entry.immuneMembers.length === 0).map((entry) => `${entry.type} ameaça ${entry.vulnerableMembers.length} integrantes sem resistência ou imunidade disponível.`) }
  }

  private offensiveCoverage(members: AnalysisMember[]) {
    const moves = members.flatMap((member) => member.moves)
    const attackingMoves = moves.filter((move) => move.category !== 'status' && move.type)
    const availableTypes = [...new Set(attackingMoves.map((move) => move.type!))]
    const superEffectiveAgainst = TYPES.filter((defendingType) => attackingMoves.some((move) => move.type && getTypeMultiplier(move.type, [defendingType]) > 1))
    const limitations = moves.length === 0 ? ['Nenhum golpe configurado com dados de tipo e categoria.'] : moves.some((move) => !move.power) ? ['Golpes sem poder base ou com efeitos especiais não são simulados como dano real.'] : []
    return { availableTypes, superEffectiveAgainst, uncoveredTypes: TYPES.filter((type) => !superEffectiveAgainst.includes(type)), moves, limitations }
  }

  private inferRoles(stats: Record<string, number>, moves: AnalysisMove[]): RoleAnalysis[] {
    const roles: RoleAnalysis[] = []
    const physical = moves.filter((move) => move.category === 'physical').length
    const special = moves.filter((move) => move.category === 'special').length
    const status = moves.filter((move) => move.category === 'status').length
    if (physical && special && physical >= 1 && special >= 1) roles.push({ role: 'atacante misto', confidence: 'supported', rationale: 'O moveset configurado contém golpes físicos e especiais.' })
    else if (physical) roles.push({ role: 'atacante físico', confidence: 'supported', rationale: `${physical} golpe(s) físico(s) configurado(s); isso descreve o moveset, não o dano final.` })
    else if (special) roles.push({ role: 'atacante especial', confidence: 'supported', rationale: `${special} golpe(s) especial(is) configurado(s); isso descreve o moveset, não o dano final.` })
    const bestDefense = Math.max(stats.defense ?? 0, stats['special-defense'] ?? 0)
    if (bestDefense >= 90 || (stats.hp ?? 0) >= 90) roles.push({ role: 'defensivo', confidence: 'possible', rationale: 'As bases de HP/defesas sugerem potencial, mas EVs, itens e recuperação não estão modelados.' })
    if (status) roles.push({ role: 'suporte', confidence: 'supported', rationale: `${status} golpe(s) de status configurado(s); efeitos detalhados não são simulados.` })
    const slugs = new Set(moves.map((move) => move.slug))
    if (['tailwind', 'trick-room', 'icy-wind', 'electroweb', 'thunder-wave', 'sticky-web'].some((slug) => slugs.has(slug))) roles.push({ role: 'controle de velocidade', confidence: 'possible', rationale: 'O moveset contém um golpe reconhecível de controle de velocidade.' })
    if (['stealth-rock', 'spikes', 'toxic-spikes', 'sticky-web'].some((slug) => slugs.has(slug))) roles.push({ role: 'usuário de hazards', confidence: 'possible', rationale: 'O moveset contém um golpe de entrada reconhecível.' })
    if (['rapid-spin', 'defog', 'mortal-spin'].some((slug) => slugs.has(slug))) roles.push({ role: 'removedor de hazards', confidence: 'possible', rationale: 'O moveset contém um golpe reconhecível de remoção.' })
    if (['u-turn', 'volt-switch', 'flip-turn', 'parting-shot', 'teleport', 'chilly-reception', 'baton-pass'].some((slug) => slugs.has(slug))) roles.push({ role: 'pivot', confidence: 'possible', rationale: 'O moveset contém um golpe reconhecível de troca/posicionamento.' })
    return roles
  }

  private synergy(members: AnalysisMember[], defense: ReturnType<StrategicAnalysisService['collectiveDefense']>, offense: ReturnType<StrategicAnalysisService['offensiveCoverage']>) {
    const defensive = members.flatMap((member) => member.defense.weaknesses.slice(0, 4).flatMap((threat) => { const answers = members.filter((candidate) => candidate !== member && getTypeMultiplier(threat.type, candidate.types) < 1).map((candidate) => candidate.name); return answers.length ? [{ from: member.name, threat: threat.type, answers, rationale: `${answers.join(', ')} oferece resistência ou imunidade de tipo contra a ameaça de ${member.name}.` }] : [] })).slice(0, 8)
    const offensive = offense.availableTypes.length > 1 ? [`${offense.availableTypes.length} tipos ofensivos distintos estão representados nos golpes configurados.`, ...offense.availableTypes.filter((type) => members.some((member) => member.types.includes(type))).map((type) => `${type} também recebe STAB em pelo menos um integrante.`)] : []
    return { defensive, offensive, gaps: defense.alerts.concat(offense.uncoveredTypes.length ? [`Sem cobertura super efetiva registrada contra: ${offense.uncoveredTypes.join(', ')}.`] : []) }
  }

  private needs(members: AnalysisMember[], defense: ReturnType<StrategicAnalysisService['collectiveDefense']>, offense: ReturnType<StrategicAnalysisService['offensiveCoverage']>, limitations: string[]): TeamNeed[] {
    const needs: TeamNeed[] = []
    for (const entry of defense.sharedWeaknesses) needs.push({ id: `shared-weakness-${entry.type}`, category: 'defense', description: `Reduzir a exposição compartilhada a ${entry.type}.`, evidence: [`${entry.vulnerableMembers.length} integrantes são vulneráveis.`], relatedMembers: entry.vulnerableMembers, priority: entry.vulnerableMembers.length >= 3 ? 'high' : 'medium', limitation: 'A leitura considera apenas tipagem, sem habilidades, itens ou capacidade real de sobrevivência.' })
    if (offense.uncoveredTypes.length) needs.push({ id: 'offensive-gaps', category: 'offense', description: 'Ampliar a cobertura super efetiva do moveset.', evidence: [`Sem cobertura super efetiva registrada contra ${offense.uncoveredTypes.length} tipos.`], relatedMembers: members.map((member) => member.name), priority: offense.uncoveredTypes.length > 8 ? 'medium' : 'low' })
    if (members.some((member) => member.moves.length === 0)) needs.push({ id: 'incomplete-movesets', category: 'data', description: 'Configurar golpes para tornar a análise ofensiva representativa.', evidence: ['Um ou mais integrantes não possuem golpes analisáveis.'], relatedMembers: members.filter((member) => member.moves.length === 0).map((member) => member.name), priority: 'medium', limitation: 'Sem movesets, não é possível inferir cobertura ou funções de suporte.' })
    if (!members.some((member) => member.possibleRoles.some((role) => role.role === 'suporte'))) needs.push({ id: 'support-options', category: 'roles', description: 'Avaliar se o time precisa de opções de suporte.', evidence: ['Nenhum golpe de status configurado foi identificado.'], relatedMembers: members.map((member) => member.name), priority: 'low', limitation: 'A ausência pode ser apenas um moveset incompleto.' })
    if (limitations.length) needs.push({ id: 'data-quality', category: 'data', description: 'Completar os dados de entrada antes de tirar conclusões estratégicas.', evidence: limitations.slice(0, 3), relatedMembers: [], priority: 'low' })
    return needs
  }

  private buildResponse(input: StrategicTeamInput, members: AnalysisMember[], defense: ReturnType<StrategicAnalysisService['collectiveDefense']>, offense: ReturnType<StrategicAnalysisService['offensiveCoverage']>, synergy: ReturnType<StrategicAnalysisService['synergy']>, needs: TeamNeed[], limitations: string[]): StrategicTeamAnalysis {
    return { team: { name: input.name ?? null, size: members.length, slotsUsed: members.length, typesPresent: [...new Set(members.flatMap((member) => member.types))].sort() }, ruleset: { id: 'casual-v1', description: 'Matriz moderna de 18 tipos; sem habilidades, itens, clima, EVs ou dano real.' }, members, defense, offense, synergy, needs, limitations, aiContext: { ruleset: 'casual-v1', members: members.map((member) => ({ name: member.name, types: member.types, moves: member.moves.map((move) => ({ name: move.name, type: move.type, category: move.category })) })), needs, limitations } }
  }
}

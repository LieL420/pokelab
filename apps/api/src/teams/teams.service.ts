import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { PokemonService } from '../pokemon/pokemon.service'
import { getTypeMultiplier, TYPES } from '../analysis/type-chart'
import type { AddPokemonDto, CreateTeamDto, ListTeamsDto, MoveDto, ReplaceMovesDto, UpdatePokemonDto, UpdateTeamDto } from './dto/team.dto'

const teamInclude = {
  pokemon: { orderBy: { position: 'asc' as const }, include: { moves: { orderBy: { slot: 'asc' as const } } } },
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService, private readonly pokemon: PokemonService) {}

  async create(ownerId: string, input: CreateTeamDto) {
    await this.ensureProfile(ownerId)
    const team = await this.prisma.team.create({ data: { ownerId, name: input.name, description: input.description ?? null, format: input.format ?? 'casual' }, include: teamInclude })
    return { data: this.serializeTeam(team) }
  }

  async list(ownerId: string, query: ListTeamsDto) {
    const skip = (query.page - 1) * query.pageSize
    const [teams, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' }, skip, take: query.pageSize, include: teamInclude }),
      this.prisma.team.count({ where: { ownerId } }),
    ])
    return { data: teams.map((team) => this.serializeTeam(team)), meta: { page: query.page, pageSize: query.pageSize, total } }
  }

  async get(ownerId: string, teamId: string) {
    const team = await this.findOwnedTeam(ownerId, teamId)
    return { data: this.serializeTeam(team) }
  }

  async update(ownerId: string, teamId: string, input: UpdateTeamDto) {
    await this.findOwnedTeam(ownerId, teamId)
    const team = await this.prisma.team.update({ where: { id: teamId }, data: { ...(input.name === undefined ? {} : { name: input.name }), ...(input.description === undefined ? {} : { description: input.description }), ...(input.format === undefined ? {} : { format: input.format }) }, include: teamInclude })
    return { data: this.serializeTeam(team) }
  }

  async remove(ownerId: string, teamId: string): Promise<void> {
    await this.findOwnedTeam(ownerId, teamId)
    await this.prisma.team.delete({ where: { id: teamId } })
  }

  async addPokemon(ownerId: string, teamId: string, input: AddPokemonDto) {
    const reference = await this.resolveReference(input)
    try {
      const team = await this.prisma.$transaction(async (tx) => {
        const owned = await tx.team.findFirst({ where: { id: teamId, ownerId }, select: { id: true } })
        if (!owned) throw new NotFoundException('Time não encontrado.')
        const count = await tx.teamPokemon.count({ where: { teamId } })
        if (count >= 6) throw new ConflictException('Um time não pode conter mais de seis Pokémon.')
        await tx.teamPokemon.create({ data: { teamId, position: input.position, ...reference } })
        await tx.team.update({ where: { id: teamId }, data: { updatedAt: new Date() } })
        return tx.team.findUniqueOrThrow({ where: { id: teamId }, include: teamInclude })
      })
      return { data: this.serializeTeam(team) }
    } catch (error) {
      this.rethrowConstraint(error, 'A posição já está ocupada ou o time atingiu o limite de Pokémon.')
    }
  }

  async updatePokemon(ownerId: string, teamId: string, memberId: string, input: UpdatePokemonDto) {
    const current = await this.findOwnedPokemon(ownerId, teamId, memberId)
    const referenceFields = ['speciesId', 'speciesSlug', 'formId', 'formSlug'].some((key) => input[key as keyof UpdatePokemonDto] !== undefined)
    const reference = referenceFields ? await this.resolveReference({ ...current, ...input }) : undefined
    try {
      const team = await this.prisma.$transaction(async (tx) => {
        await tx.teamPokemon.update({ where: { id: memberId }, data: { position: input.position ?? current.position, ...(reference ?? {}), ...(input.displayNameSnapshot === undefined ? {} : { displayNameSnapshot: input.displayNameSnapshot || current.displayNameSnapshot }), ...(input.spriteUrlSnapshot === undefined ? {} : { spriteUrlSnapshot: input.spriteUrlSnapshot }) } })
        if (referenceFields) await tx.teamPokemonMove.deleteMany({ where: { teamPokemonId: memberId } })
        await tx.team.update({ where: { id: teamId }, data: { updatedAt: new Date() } })
        return tx.team.findUniqueOrThrow({ where: { id: teamId }, include: teamInclude })
      })
      return { data: this.serializeTeam(team) }
    } catch (error) {
      this.rethrowConstraint(error, 'A posição já está ocupada.')
    }
  }

  async removePokemon(ownerId: string, teamId: string, memberId: string): Promise<void> {
    await this.findOwnedPokemon(ownerId, teamId, memberId)
    await this.prisma.$transaction([this.prisma.teamPokemon.delete({ where: { id: memberId } }), this.prisma.team.update({ where: { id: teamId }, data: { updatedAt: new Date() } })])
  }

  async replaceMoves(ownerId: string, teamId: string, memberId: string, input: ReplaceMovesDto) {
    await this.findOwnedPokemon(ownerId, teamId, memberId)
    if (input.moves.length > 4) throw new ConflictException('Um Pokémon não pode conter mais de quatro golpes.')
    const duplicateSlots = new Set(input.moves.map((move) => move.slot)).size !== input.moves.length
    const duplicateMoves = input.moves.filter((move) => move.moveId !== undefined).map((move) => move.moveId).length !== new Set(input.moves.filter((move) => move.moveId !== undefined).map((move) => move.moveId)).size
    if (duplicateSlots) throw new UnprocessableEntityException('Os slots dos golpes não podem se repetir.')
    if (duplicateMoves) throw new UnprocessableEntityException('Um golpe não pode aparecer duas vezes no mesmo Pokémon.')
    const moves = await Promise.all(input.moves.map((move) => this.resolveMove(move)))
    if (new Set(moves.map((move) => move.id)).size !== moves.length) throw new UnprocessableEntityException('Um golpe não pode aparecer duas vezes no mesmo Pokémon.')
    const team = await this.prisma.$transaction(async (tx) => {
      await tx.teamPokemonMove.deleteMany({ where: { teamPokemonId: memberId } })
      if (moves.length) await tx.teamPokemonMove.createMany({ data: moves.map((move, index) => ({ teamPokemonId: memberId, slot: input.moves[index].slot, moveId: move.id, moveSlug: move.slug, moveNameSnapshot: move.name })) })
      await tx.team.update({ where: { id: teamId }, data: { updatedAt: new Date() } })
      return tx.team.findUniqueOrThrow({ where: { id: teamId }, include: teamInclude })
    })
    return { data: this.serializeTeam(team) }
  }

  async typeAnalysis(ownerId: string, teamId: string) {
    const team = await this.findOwnedTeam(ownerId, teamId)
    const members = await Promise.all(team.pokemon.map(async (member) => {
      try {
        return { member, pokemon: await this.pokemon.getSummary(member.formId ?? member.speciesId) }
      } catch {
        return { member, pokemon: null }
      }
    }))
    const known = members.filter((entry) => entry.pokemon)
    const typesPresent = [...new Set(known.flatMap((entry) => entry.pokemon?.types ?? []))].sort()
    const chart = this.effectivenessByType(known.map((entry) => entry.pokemon?.types ?? []))
    const weaknesses = chart.filter((entry) => entry.multiplier > 1).sort((a, b) => b.multiplier - a.multiplier)
    const resistances = chart.filter((entry) => entry.multiplier > 0 && entry.multiplier < 1).sort((a, b) => a.multiplier - b.multiplier)
    const immunities = chart.filter((entry) => entry.multiplier === 0)
    return { data: { typesPresent, weaknesses, resistances, immunities, coverage: { knownMembers: known.length, teamSize: 6 }, ruleset: 'casual-v1', partial: known.length !== team.pokemon.length, affectedMembers: members.filter((entry) => !entry.pokemon).map((entry) => entry.member.id) } }
  }

  private async resolveReference(input: { speciesId?: number; speciesSlug?: string; formId?: number | null; formSlug?: string | null }) {
    const resolved = await this.pokemon.resolvePokemon({ speciesId: input.speciesId, speciesSlug: input.speciesSlug, formId: input.formId ?? undefined, formSlug: input.formSlug ?? undefined })
    return { speciesId: resolved.speciesId, speciesSlug: resolved.speciesSlug, formId: resolved.formId, formSlug: resolved.formSlug, displayNameSnapshot: resolved.name, spriteUrlSnapshot: resolved.spriteUrl }
  }

  private async resolveMove(input: MoveDto) {
    return this.pokemon.resolveMove({ moveId: input.moveId, moveSlug: input.moveSlug })
  }

  private async ensureProfile(ownerId: string) {
    await this.prisma.profile.upsert({ where: { id: ownerId }, create: { id: ownerId }, update: {} })
  }

  private async findOwnedTeam(ownerId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, ownerId }, include: teamInclude })
    if (!team) throw new NotFoundException('Time não encontrado.')
    return team
  }

  private async findOwnedPokemon(ownerId: string, teamId: string, memberId: string) {
    const member = await this.prisma.teamPokemon.findFirst({ where: { id: memberId, teamId, team: { ownerId } } })
    if (!member) throw new NotFoundException('Pokémon não encontrado no time.')
    return member
  }

  private serializeTeam(team: any) {
    return { id: team.id, name: team.name, description: team.description, format: team.format, createdAt: team.createdAt, updatedAt: team.updatedAt, pokemon: team.pokemon.map((member: any) => ({ id: member.id, position: member.position, speciesId: member.speciesId, speciesSlug: member.speciesSlug, formId: member.formId, formSlug: member.formSlug, displayNameSnapshot: member.displayNameSnapshot, spriteUrlSnapshot: member.spriteUrlSnapshot, createdAt: member.createdAt, updatedAt: member.updatedAt, moves: member.moves.map((move: any) => ({ id: move.id, slot: move.slot, moveId: move.moveId, moveSlug: move.moveSlug, moveNameSnapshot: move.moveNameSnapshot, createdAt: move.createdAt, updatedAt: move.updatedAt })) })) }
  }

  private rethrowConstraint(error: unknown, message: string): never {
    if (error instanceof ConflictException || error instanceof NotFoundException) throw error
    if (error instanceof Prisma.PrismaClientKnownRequestError || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) throw new ConflictException(message)
    throw error
  }

  private effectivenessByType(defendingTypeSets: string[][]) {
    return TYPES.map((attackingType) => ({
      type: attackingType,
      multiplier: defendingTypeSets.length === 0 ? 1 : Math.max(...defendingTypeSets.map((defendingTypes) => getTypeMultiplier(attackingType, defendingTypes))),
    }))
  }
}

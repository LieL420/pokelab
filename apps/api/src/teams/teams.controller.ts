import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { CurrentUser } from '../auth/current-user.decorator'
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard'
import { AddPokemonDto, CreateTeamDto, ListTeamsDto, ReplaceMovesDto, UpdatePokemonDto, UpdateTeamDto } from './dto/team.dto'
import { TeamsService } from './teams.service'

@Controller('v1/teams')
@UseGuards(SupabaseAuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() input: CreateTeamDto) { return this.teams.create(user.id, input) }

  @Get()
  async list(@CurrentUser() user: User, @Query() query: ListTeamsDto) { return this.teams.list(user.id, query) }

  @Get(':teamId')
  async get(@CurrentUser() user: User, @Param('teamId') teamId: string) { return this.teams.get(user.id, teamId) }

  @Patch(':teamId')
  async update(@CurrentUser() user: User, @Param('teamId') teamId: string, @Body() input: UpdateTeamDto) { return this.teams.update(user.id, teamId, input) }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: User, @Param('teamId') teamId: string) { await this.teams.remove(user.id, teamId) }

  @Post(':teamId/pokemon')
  async addPokemon(@CurrentUser() user: User, @Param('teamId') teamId: string, @Body() input: AddPokemonDto) { return this.teams.addPokemon(user.id, teamId, input) }

  @Patch(':teamId/pokemon/:memberId')
  async updatePokemon(@CurrentUser() user: User, @Param('teamId') teamId: string, @Param('memberId') memberId: string, @Body() input: UpdatePokemonDto) { return this.teams.updatePokemon(user.id, teamId, memberId, input) }

  @Delete(':teamId/pokemon/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePokemon(@CurrentUser() user: User, @Param('teamId') teamId: string, @Param('memberId') memberId: string) { await this.teams.removePokemon(user.id, teamId, memberId) }

  @Put(':teamId/pokemon/:memberId/moves')
  async replaceMoves(@CurrentUser() user: User, @Param('teamId') teamId: string, @Param('memberId') memberId: string, @Body() input: ReplaceMovesDto) { return this.teams.replaceMoves(user.id, teamId, memberId, input) }

  @Get(':teamId/type-analysis')
  async typeAnalysis(@CurrentUser() user: User, @Param('teamId') teamId: string) { return this.teams.typeAnalysis(user.id, teamId) }
}

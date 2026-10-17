import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { CurrentUser } from '../auth/current-user.decorator'
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard'
import { AiMovesetDto, AiPreviewDto, AiPreviewMovesetDto } from './ai.dto'
import { AiAnalysisService } from './ai-analysis.service'
import { AiRateLimitService } from './ai-rate-limit.service'
import { MovesetRecommendationService } from './moveset-recommendation.service'
import { PokemonRecommendationService } from './pokemon-recommendation.service'

@Controller('v1/ai')
export class AiController {
  constructor(private readonly analysis: AiAnalysisService, private readonly pokemon: PokemonRecommendationService, private readonly moveset: MovesetRecommendationService, private readonly rateLimit: AiRateLimitService) {}
  @Post('teams/:teamId/analyze') @UseGuards(SupabaseAuthGuard)
  async analyze(@CurrentUser() user: User, @Param('teamId') teamId: string) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.analysis.analyzeSavedTeam(user.id, teamId) }
  @Post('teams/:teamId/recommend-pokemon') @UseGuards(SupabaseAuthGuard)
  async recommendPokemon(@CurrentUser() user: User, @Param('teamId') teamId: string) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.pokemon.recommendSavedTeam(user.id, teamId) }
  @Post('teams/:teamId/recommend-moveset') @UseGuards(SupabaseAuthGuard)
  async recommendMoveset(@CurrentUser() user: User, @Param('teamId') teamId: string, @Body() input: AiMovesetDto) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.moveset.recommendSavedTeam(user.id, teamId, input.memberPosition) }
  @Post('preview/analyze') @UseGuards(SupabaseAuthGuard)
  async previewAnalyze(@CurrentUser() user: User, @Body() input: AiPreviewDto) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.analysis.analyzePreview(input) }
  @Post('preview/recommend-pokemon') @UseGuards(SupabaseAuthGuard)
  async previewPokemon(@CurrentUser() user: User, @Body() input: AiPreviewDto) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.pokemon.recommendPreview(input) }
  @Post('preview/recommend-moveset') @UseGuards(SupabaseAuthGuard)
  async previewMoveset(@CurrentUser() user: User, @Body() input: AiPreviewMovesetDto) { this.rateLimit.assertAllowed(`user:${user.id}`); return this.moveset.recommendPreview(input, input.memberPosition) }
}

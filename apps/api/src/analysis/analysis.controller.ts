import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { CurrentUser } from '../auth/current-user.decorator'
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard'
import { PreviewAnalysisDto } from './analysis.dto'
import { StrategicAnalysisService } from './strategic-analysis.service'

@Controller('v1')
export class AnalysisController {
  constructor(private readonly analysis: StrategicAnalysisService) {}

  @Post('analysis/teams/preview')
  async preview(@Body() input: PreviewAnalysisDto) { return { data: await this.analysis.analyze({ name: input.name ?? null, format: input.format ?? 'casual', pokemon: input.pokemon }) } }

  @Get('teams/:teamId/analysis')
  @UseGuards(SupabaseAuthGuard)
  async team(@CurrentUser() user: User, @Param('teamId') teamId: string) { return this.analysis.analyzeSavedTeam(user.id, teamId) }
}

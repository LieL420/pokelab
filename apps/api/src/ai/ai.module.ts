import { Module } from '@nestjs/common'
import { AnalysisModule } from '../analysis/analysis.module'
import { AuthModule } from '../auth/auth.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { AiController } from './ai.controller'
import { AiAnalysisService } from './ai-analysis.service'
import { AiRateLimitService } from './ai-rate-limit.service'
import { GeminiService } from './gemini.service'
import { MovesetRecommendationService } from './moveset-recommendation.service'
import { PokemonRecommendationService } from './pokemon-recommendation.service'
import { RecommendationValidationService } from './recommendation-validation.service'

@Module({ imports: [AuthModule, AnalysisModule, PokemonModule], controllers: [AiController], providers: [GeminiService, AiRateLimitService, AiAnalysisService, PokemonRecommendationService, MovesetRecommendationService, RecommendationValidationService] })
export class AiModule {}

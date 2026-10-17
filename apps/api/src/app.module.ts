import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import Joi from 'joi'
import { AuthModule } from './auth/auth.module'
import { AnalysisModule } from './analysis/analysis.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { PokemonModule } from './pokemon/pokemon.module'
import { TeamsModule } from './teams/teams.module'
import { AiModule } from './ai/ai.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().optional(),
        API_PORT: Joi.number().port().default(3000),
        WEB_ORIGIN: Joi.string().default('http://localhost:5173'),
        SUPABASE_URL: Joi.string().uri().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
        SUPABASE_ANON_KEY: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
        POKEAPI_BASE_URL: Joi.string().uri().default('https://pokeapi.co/api/v2'),
        POKEAPI_TIMEOUT_MS: Joi.number().integer().min(100).max(30000).default(5000),
        GEMINI_API_KEY: Joi.string().optional(),
        GEMINI_MODEL: Joi.string().default('gemini-3.5-flash-lite'),
        GEMINI_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(15000),
        AI_REQUESTS_PER_MINUTE: Joi.number().integer().min(1).max(60).default(6),
        AI_CACHE_TTL_MS: Joi.number().integer().min(0).max(3600000).default(300000),
      }),
    }),
    AuthModule,
    AnalysisModule,
    DatabaseModule,
    HealthModule,
    PokemonModule,
    TeamsModule,
    AiModule,
  ],
})
export class AppModule {}

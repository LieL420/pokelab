import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { AnalysisController } from './analysis.controller'
import { StrategicAnalysisService } from './strategic-analysis.service'

@Module({ imports: [AuthModule, PokemonModule], controllers: [AnalysisController], providers: [StrategicAnalysisService], exports: [StrategicAnalysisService] })
export class AnalysisModule {}

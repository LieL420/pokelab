import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'

@Module({ imports: [AuthModule, PokemonModule], controllers: [TeamsController], providers: [TeamsService] })
export class TeamsModule {}

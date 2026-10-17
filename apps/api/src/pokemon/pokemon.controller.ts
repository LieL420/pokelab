import { Controller, Get, Param, Query } from '@nestjs/common'
import { PokemonQueryDto } from './dto/pokemon-query.dto'
import { PokemonService } from './pokemon.service'

@Controller('v1/pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  async list(@Query() query: PokemonQueryDto) {
    return this.pokemonService.list(query)
  }

  @Get(':identifier')
  async getDetails(@Param('identifier') identifier: string) {
    return { data: await this.pokemonService.getDetails(identifier) }
  }
}

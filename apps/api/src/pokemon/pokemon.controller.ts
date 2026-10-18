import { Controller, Get, Header, Param, Query } from '@nestjs/common'
import { PokemonQueryDto } from './dto/pokemon-query.dto'
import { PokemonService } from './pokemon.service'

@Controller('v1/pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
  async list(@Query() query: PokemonQueryDto) {
    return this.pokemonService.list(query)
  }

  @Get(':identifier')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
  async getDetails(@Param('identifier') identifier: string) {
    return { data: await this.pokemonService.getDetails(identifier) }
  }
}

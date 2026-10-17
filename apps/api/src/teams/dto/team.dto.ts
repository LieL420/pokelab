import { Type, Transform } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateTeamDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null

  @IsOptional()
  @IsIn(['casual'])
  format?: string
}

export class UpdateTeamDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null

  @IsOptional()
  @IsIn(['casual'])
  format?: string
}

export class ListTeamsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 24
}

export class AddPokemonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  position!: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  speciesId?: number

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  speciesSlug?: string

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  formId?: number

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  formSlug?: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayNameSnapshot?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  spriteUrlSnapshot?: string | null
}

export class UpdatePokemonDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  position?: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  speciesId?: number

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  speciesSlug?: string

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  formId?: number

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  formSlug?: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayNameSnapshot?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  spriteUrlSnapshot?: string | null
}

export class MoveDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  slot!: number

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  moveId?: number

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  moveSlug?: string

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  moveNameSnapshot?: string
}

export class ReplaceMovesDto {
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => MoveDto)
  moves: MoveDto[] = []
}

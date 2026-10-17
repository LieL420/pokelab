import { Type, Transform } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class AnalysisMoveRefDto {
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
  @MaxLength(120)
  moveSlug?: string
}

export class AnalysisMemberDto {
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
  @MaxLength(120)
  formSlug?: string

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AnalysisMoveRefDto)
  moves: AnalysisMoveRefDto[] = []
}

export class PreviewAnalysisDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsIn(['casual'])
  format?: string

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AnalysisMemberDto)
  pokemon: AnalysisMemberDto[] = []
}

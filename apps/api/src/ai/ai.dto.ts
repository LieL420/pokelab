import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { PreviewAnalysisDto } from '../analysis/analysis.dto'

export class AiMovesetDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(6)
  memberPosition!: number
}

export class AiPreviewMovesetDto extends PreviewAnalysisDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(6)
  memberPosition!: number
}

export class AiPreviewDto extends PreviewAnalysisDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(6)
  memberPosition?: number
}

import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MAX_SPATIAL_STEP_MICRONS, MIN_SPATIAL_STEP_MICRONS } from '../../common/constants';

/** Multipart fields accompanying the uploaded ZIP (`from`/`to`/`step` arrive as strings). */
export class CalculateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  from!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  to!: number;

  /** Spatial raster step in µm, for the heatmap's axis labels only. Defaults to 100 if omitted. */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(MIN_SPATIAL_STEP_MICRONS)
  @Max(MAX_SPATIAL_STEP_MICRONS)
  step?: number;
}

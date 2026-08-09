import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import {
  HEX_COLOR_PATTERN,
  MAX_SPATIAL_STEP_MICRONS,
  MIN_SPATIAL_STEP_MICRONS,
} from '../../common/constants';

/** Multipart fields accompanying the uploaded ZIP (`from`/`to`/`step`/`colorLow`/`colorHigh` arrive as strings). */
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

  /** Gradient colours ("#rrggbb") at 0/33/67/100% of intensity, for the heatmap only. Default to the magma ramp resampled at those points. */
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: 'colorLow должен быть в формате #rrggbb' })
  colorLow?: string;

  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: 'colorMidLow должен быть в формате #rrggbb' })
  colorMidLow?: string;

  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: 'colorMidHigh должен быть в формате #rrggbb' })
  colorMidHigh?: string;

  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: 'colorHigh должен быть в формате #rrggbb' })
  colorHigh?: string;
}

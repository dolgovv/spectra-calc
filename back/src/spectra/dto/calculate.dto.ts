import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

/** Multipart fields accompanying the uploaded ZIP (`from`/`to` arrive as strings). */
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
}

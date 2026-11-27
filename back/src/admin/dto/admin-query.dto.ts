import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { StatusClass } from '../../analytics/request-log.service';

export class LoginDto {
  @IsString()
  @MaxLength(200)
  password!: string;
}

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class RequestsQueryDto extends PageQueryDto {
  /** "1" to include the admin panel's own API calls. */
  @IsOptional()
  @IsIn(['1'])
  admin?: '1';

  @IsOptional()
  @IsIn(['2xx', '3xx', '4xx', '5xx'])
  status?: StatusClass;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CalculationsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['ok', 'error'])
  status?: 'ok' | 'error';
}

/** A window of whole days ending today, in the admin's time zone (minutes east of UTC). */
export class WindowQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  days = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-720)
  @Max(840)
  tz = 0;
}

export class RequestSummaryQueryDto extends WindowQueryDto {
  @IsOptional()
  @IsIn(['1'])
  admin?: '1';
}

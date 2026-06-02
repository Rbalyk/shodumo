import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Lang } from '../../common/i18n/localize';

export class EventFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['uk', 'en'],
    default: 'uk',
    description: 'Response content language',
  })
  @IsOptional()
  @IsIn(['uk', 'en'])
  lang: Lang = 'uk';

  @ApiPropertyOptional({ description: 'City slug' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'ISO date — events on/after this day' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'lat,lng — e.g. 49.84,24.03' })
  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, {
    message: 'near must be in "lat,lng" format',
  })
  near?: string;

  @ApiPropertyOptional({ default: 10, description: 'Radius in km for near filter' })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  radiusKm?: number = 10;
}

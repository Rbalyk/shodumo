import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { Lang } from './localize';

export class LangQueryDto {
  @ApiPropertyOptional({
    enum: ['uk', 'en'],
    default: 'uk',
    description: 'Response content language',
  })
  @IsOptional()
  @IsIn(['uk', 'en'])
  lang: Lang = 'uk';
}

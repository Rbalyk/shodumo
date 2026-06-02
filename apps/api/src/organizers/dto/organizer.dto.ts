import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateOrganizerDto {
  @ApiPropertyOptional({ example: 'ShoDumo Crew' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Optional English bio' })
  @IsOptional()
  @IsString()
  bioEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  links?: Record<string, string>;
}

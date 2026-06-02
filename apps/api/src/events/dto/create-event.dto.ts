import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'Ранковий забіг по парку' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({
    example: 'Morning run in the park',
    description: 'Optional English title; filled in manually by the organizer',
  })
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ description: 'Optional English description' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty()
  @IsString()
  cityId!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: '2026-07-01T08:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Required when isPaid is true' })
  @ValidateIf((o: CreateEventDto) => o.isPaid === true)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
}

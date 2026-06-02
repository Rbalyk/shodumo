import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMediaDto {
  @ApiProperty({ description: 'Event the media belongs to' })
  @IsString()
  eventId!: string;

  @ApiProperty({ description: 'Original filename (used to build the stub URL)' })
  @IsString()
  fileName!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

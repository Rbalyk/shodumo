import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AdminEventQueryDto {
  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.PENDING })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus = EventStatus.PENDING;
}

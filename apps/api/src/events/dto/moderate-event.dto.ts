import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class ModerateEventDto {
  @ApiProperty({ enum: [EventStatus.PUBLISHED, EventStatus.ARCHIVED] })
  @IsIn([EventStatus.PUBLISHED, EventStatus.ARCHIVED])
  status!: EventStatus;
}

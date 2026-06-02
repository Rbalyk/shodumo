import { ApiProperty } from '@nestjs/swagger';
import { AttendanceType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AttendDto {
  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type!: AttendanceType;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@shodumo.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    enum: [Role.ATTENDEE, Role.ORGANIZER],
    default: Role.ATTENDEE,
  })
  @IsOptional()
  @IsIn([Role.ATTENDEE, Role.ORGANIZER])
  role?: Role;
}

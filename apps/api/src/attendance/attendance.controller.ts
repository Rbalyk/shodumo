import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Event } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LangQueryDto } from '../common/i18n/lang-query.dto';
import { AttendanceService } from './attendance.service';
import { AttendDto } from './dto/attend.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('events/:id/attend')
  @ApiOperation({ summary: 'Mark an event as GOING or SAVED' })
  attend(
    @CurrentUser('id') userId: string,
    @Param('id') eventId: string,
    @Body() dto: AttendDto,
  ) {
    return this.attendance.attend(userId, eventId, dto.type);
  }

  @Delete('events/:id/attend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a GOING or SAVED mark from an event' })
  unattend(
    @CurrentUser('id') userId: string,
    @Param('id') eventId: string,
    @Body() dto: AttendDto,
  ): Promise<void> {
    return this.attendance.unattend(userId, eventId, dto.type);
  }

  @Get('me/saved')
  @ApiOperation({ summary: "Current user's saved events" })
  listSaved(
    @CurrentUser('id') userId: string,
    @Query() { lang }: LangQueryDto,
  ): Promise<Event[]> {
    return this.attendance.listSaved(userId, lang);
  }
}

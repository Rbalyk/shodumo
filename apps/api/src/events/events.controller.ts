import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Event, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Paginated } from '../common/dto/paginated.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LangQueryDto } from '../common/i18n/lang-query.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventFilterDto } from './dto/event-filter.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get('events')
  @ApiOperation({ summary: 'Public event feed with filters (cached)' })
  feed(@Query() filter: EventFilterDto): Promise<Paginated<Event>> {
    return this.events.feed(filter);
  }

  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @Get('me/events')
  @ApiOperation({ summary: "Current organizer's events" })
  listMine(@CurrentUser('id') userId: string): Promise<Event[]> {
    return this.events.listMine(userId);
  }

  @Public()
  @Get('events/:slug')
  @ApiOperation({ summary: 'Public event details by slug' })
  findBySlug(@Param('slug') slug: string, @Query() { lang }: LangQueryDto) {
    return this.events.findBySlug(slug, lang);
  }

  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @Post('events')
  @ApiOperation({ summary: 'Create an event (status PENDING for moderation)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEventDto,
  ): Promise<Event> {
    return this.events.create(userId, dto);
  }

  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @Patch('events/:id')
  @ApiOperation({ summary: 'Update an owned event' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<Event> {
    return this.events.update(userId, id, dto);
  }

  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned event' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.events.remove(userId, id);
  }
}

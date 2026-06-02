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
import { Event, EventStatus, Role } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../categories/dto/category.dto';
import { CitiesService } from '../cities/cities.service';
import { CreateCityDto, UpdateCityDto } from '../cities/dto/city.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ModerateEventDto } from '../events/dto/moderate-event.dto';
import { EventsService } from '../events/events.service';
import { AdminEventQueryDto } from './dto/admin-event-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly events: EventsService,
    private readonly cities: CitiesService,
    private readonly categories: CategoriesService,
  ) {}

  // --- Event moderation ---

  @Get('events')
  @ApiOperation({ summary: 'List events for moderation (default PENDING)' })
  listEvents(@Query() query: AdminEventQueryDto): Promise<Event[]> {
    return this.events.listForModeration(query.status ?? EventStatus.PENDING);
  }

  @Patch('events/:id/moderate')
  @ApiOperation({ summary: 'Publish or archive an event' })
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateEventDto,
  ): Promise<Event> {
    return this.events.moderate(id, dto);
  }

  // --- Cities CRUD ---

  @Post('cities')
  @ApiOperation({ summary: 'Create a city' })
  createCity(@Body() dto: CreateCityDto) {
    return this.cities.create(dto);
  }

  @Patch('cities/:id')
  @ApiOperation({ summary: 'Update a city' })
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cities.update(id, dto);
  }

  @Delete('cities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a city' })
  removeCity(@Param('id') id: string): Promise<void> {
    return this.cities.remove(id);
  }

  // --- Categories CRUD ---

  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  removeCategory(@Param('id') id: string): Promise<void> {
    return this.categories.remove(id);
  }
}

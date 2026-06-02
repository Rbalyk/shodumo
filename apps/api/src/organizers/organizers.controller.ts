import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LangQueryDto } from '../common/i18n/lang-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateOrganizerDto } from './dto/organizer.dto';
import { OrganizersService } from './organizers.service';

@ApiTags('organizers')
@Controller()
export class OrganizersController {
  constructor(private readonly organizers: OrganizersService) {}

  @Public()
  @Get('organizers/:id')
  @ApiOperation({ summary: 'Public organizer profile with published events' })
  findPublic(@Param('id') id: string, @Query() { lang }: LangQueryDto) {
    return this.organizers.findPublic(id, lang);
  }

  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @Patch('me/organizer')
  @ApiOperation({ summary: 'Create or update the current organizer profile' })
  updateMine(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizerDto,
  ) {
    return this.organizers.upsertForUser(userId, dto);
  }
}

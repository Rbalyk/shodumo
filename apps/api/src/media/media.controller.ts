import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Media, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Roles(Role.ORGANIZER)
  @Post()
  @ApiOperation({ summary: 'Upload media for an owned event (stub)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMediaDto,
  ): Promise<Media> {
    return this.media.create(userId, dto);
  }
}

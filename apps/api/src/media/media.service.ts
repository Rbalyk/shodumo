import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Media } from '@prisma/client';
import { uniqueSlug } from '../common/utils/slugify';
import { OrganizersService } from '../organizers/organizers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizers: OrganizersService,
    private readonly config: ConfigService,
  ) {}

  // Stub: pretends to upload to Cloudflare R2 / S3 and stores a public URL.
  async create(userId: string, dto: CreateMediaDto): Promise<Media> {
    const organizer = await this.organizers.resolveForUser(userId);
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== organizer.id) {
      throw new ForbiddenException('You do not own this event');
    }

    const base = this.config.get<string>(
      'MEDIA_PUBLIC_BASE_URL',
      'http://localhost:3000/static',
    );
    const url = `${base}/events/${dto.eventId}/${uniqueSlug(dto.fileName)}`;

    return this.prisma.media.create({
      data: {
        eventId: dto.eventId,
        url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }
}

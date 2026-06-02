import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Organizer, Prisma } from '@prisma/client';
import { Lang, localizeOrganizer } from '../common/i18n/localize';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizerDto } from './dto/organizer.dto';

@Injectable()
export class OrganizersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(id: string, lang: Lang = 'uk') {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id },
      include: {
        events: {
          where: { status: 'PUBLISHED' },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }
    return localizeOrganizer(organizer, lang);
  }

  async resolveForUser(userId: string): Promise<Organizer> {
    const organizer = await this.prisma.organizer.findUnique({
      where: { userId },
    });
    if (!organizer) {
      throw new ForbiddenException(
        'Organizer profile is not set up. Update it via PATCH /me/organizer first.',
      );
    }
    return organizer;
  }

  upsertForUser(userId: string, dto: UpdateOrganizerDto): Promise<Organizer> {
    const links = dto.links as Prisma.InputJsonValue | undefined;
    return this.prisma.organizer.upsert({
      where: { userId },
      update: {
        name: dto.name,
        bio: dto.bio,
        bioEn: dto.bioEn,
        avatar: dto.avatar,
        links,
      },
      create: {
        userId,
        name: dto.name ?? 'Organizer',
        bio: dto.bio,
        bioEn: dto.bioEn,
        avatar: dto.avatar,
        links,
      },
    });
  }
}

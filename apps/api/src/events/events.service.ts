import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Event, EventStatus, Prisma } from '@prisma/client';
import { paginate, Paginated } from '../common/dto/paginated.dto';
import { Lang, localizeEvent, localizeEvents } from '../common/i18n/localize';
import { uniqueSlug } from '../common/utils/slugify';
import { OrganizersService } from '../organizers/organizers.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventFilterDto } from './dto/event-filter.dto';
import { ModerateEventDto } from './dto/moderate-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const FEED_CACHE_PREFIX = 'feed:';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly organizers: OrganizersService,
    private readonly config: ConfigService,
  ) {}

  async feed(filter: EventFilterDto): Promise<Paginated<Event>> {
    const cacheKey = `${FEED_CACHE_PREFIX}${JSON.stringify(filter)}`;
    const cached = await this.redis.get<Paginated<Event>>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.EventWhereInput = { status: EventStatus.PUBLISHED };

    if (filter.city) {
      where.city = { slug: filter.city };
    }
    if (filter.category) {
      where.category = { slug: filter.category };
    }
    if (filter.isPaid !== undefined) {
      where.isPaid = filter.isPaid;
    }
    if (filter.date) {
      where.startsAt = { gte: new Date(filter.date) };
    }
    if (filter.near) {
      const [lat, lng] = filter.near.split(',').map(Number);
      const radiusKm = filter.radiusKm ?? 10;
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
      where.lat = { gte: lat - latDelta, lte: lat + latDelta };
      where.lng = { gte: lng - lngDelta, lte: lng + lngDelta };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy: { startsAt: 'asc' },
        include: { city: true, category: true },
      }),
      this.prisma.event.count({ where }),
    ]);

    localizeEvents(data, filter.lang);
    const result = paginate(data, total, filter.page, filter.limit);
    await this.redis.set(
      cacheKey,
      result,
      this.config.get<number>('REDIS_FEED_TTL', 60),
    );
    return result;
  }

  async findBySlug(slug: string, lang: Lang = 'uk') {
    const event = await this.prisma.event.findFirst({
      where: { slug, status: EventStatus.PUBLISHED },
      include: {
        city: true,
        category: true,
        organizer: true,
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return localizeEvent(event, lang);
  }

  async create(userId: string, dto: CreateEventDto): Promise<Event> {
    const organizer = await this.organizers.resolveForUser(userId);
    const event = await this.prisma.event.create({
      data: {
        organizerId: organizer.id,
        cityId: dto.cityId,
        categoryId: dto.categoryId,
        title: dto.title,
        titleEn: dto.titleEn?.trim() || null,
        slug: uniqueSlug(dto.title),
        description: dto.description,
        descriptionEn: dto.descriptionEn?.trim() || null,
        startsAt: new Date(dto.startsAt),
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        coverImage: dto.coverImage,
        isPaid: dto.isPaid ?? false,
        price: dto.price ?? null,
        status: EventStatus.PENDING,
      },
    });
    await this.invalidateFeed();
    return event;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    await this.ensureOwnedBy(userId, id);
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        categoryId: dto.categoryId,
        title: dto.title,
        titleEn: dto.titleEn,
        description: dto.description,
        descriptionEn: dto.descriptionEn,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        coverImage: dto.coverImage,
        isPaid: dto.isPaid,
        price: dto.price,
      },
    });
    await this.invalidateFeed();
    return event;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwnedBy(userId, id);
    await this.prisma.event.delete({ where: { id } });
    await this.invalidateFeed();
  }

  async listMine(userId: string): Promise<Event[]> {
    const organizer = await this.organizers.resolveForUser(userId);
    return this.prisma.event.findMany({
      where: { organizerId: organizer.id },
      orderBy: { createdAt: 'desc' },
      include: { city: true, category: true },
    });
  }

  // --- Admin ---

  listForModeration(status: EventStatus): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: { city: true, category: true, organizer: true },
    });
  }

  async moderate(id: string, dto: ModerateEventDto): Promise<Event> {
    await this.ensureExists(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.invalidateFeed();
    return event;
  }

  private async ensureExists(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async ensureOwnedBy(userId: string, id: string): Promise<Event> {
    const organizer = await this.organizers.resolveForUser(userId);
    const event = await this.ensureExists(id);
    if (event.organizerId !== organizer.id) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  private invalidateFeed(): Promise<void> {
    return this.redis.delByPrefix(FEED_CACHE_PREFIX);
  }
}

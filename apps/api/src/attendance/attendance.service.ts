import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceType, Event, EventAttendee } from '@prisma/client';
import { Lang, localizeEvents } from '../common/i18n/localize';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async attend(
    userId: string,
    eventId: string,
    type: AttendanceType,
  ): Promise<EventAttendee> {
    await this.ensureEvent(eventId);
    return this.prisma.eventAttendee.upsert({
      where: { eventId_userId_type: { eventId, userId, type } },
      update: {},
      create: { eventId, userId, type },
    });
  }

  async unattend(
    userId: string,
    eventId: string,
    type: AttendanceType,
  ): Promise<void> {
    await this.prisma.eventAttendee.deleteMany({
      where: { eventId, userId, type },
    });
  }

  async listSaved(userId: string, lang: Lang = 'uk'): Promise<Event[]> {
    const rows = await this.prisma.eventAttendee.findMany({
      where: { userId, type: AttendanceType.SAVED },
      orderBy: { createdAt: 'desc' },
      include: { event: { include: { city: true, category: true } } },
    });
    return localizeEvents(
      rows.map((r) => r.event),
      lang,
    );
  }

  private async ensureEvent(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }
}

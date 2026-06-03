import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { EventModel } from '../../core/models';
import { CategoryMeta, IconName, categoryMeta } from './category-meta';

/** Card/detail view-model derived from a raw API event. */
export interface EventVM {
  id: string;
  slug: string;
  href: string;
  title: string;
  description: string;
  startsAt: string;
  startsAtIso: string;
  dateLabel: string;
  shortDate: string;
  time: string;
  address: string;
  place: string;
  lat: number | null;
  lng: number | null;
  cover: string;
  isPaid: boolean;
  priceLabel: string;
  attendeeCount: number;
  isAttending: boolean;
  isSaved: boolean;
  hue: string;
  glyph: IconName;
  catLabel: string;
  organizer: EventModel['organizer'];
  cityName: string;
}

/**
 * Normalizes API events into the view-model the card/detail templates consume,
 * applying language-aware date + price formatting. Stateless apart from the
 * active-language read, so it is safe on both server and browser.
 */
@Injectable({ providedIn: 'root' })
export class EventViewService {
  private readonly i18n = inject(I18nService);

  private get locale(): string {
    return this.i18n.lang() === 'en' ? 'en-GB' : 'uk-UA';
  }

  private parse(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  formatDate(value: string | null | undefined): string {
    const d = this.parse(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'long' }).format(d);
  }

  formatTime(value: string | null | undefined): string {
    const d = this.parse(value);
    if (!d) return '';
    return new Intl.DateTimeFormat(this.locale, { hour: '2-digit', minute: '2-digit' }).format(d);
  }

  /** e.g. "сб, 14 червня · 18:00" */
  formatDateTime(value: string | null | undefined): string {
    const d = this.parse(value);
    if (!d) return '';
    const wd = new Intl.DateTimeFormat(this.locale, { weekday: 'short' }).format(d).replace('.', '');
    return `${wd}, ${this.formatDate(d.toISOString())} · ${this.formatTime(d.toISOString())}`;
  }

  formatPrice(event: Pick<EventModel, 'isPaid' | 'price'>): string {
    if (!event.isPaid) return this.i18n.t('event.free');
    const p = event.price;
    if (p === null || p === undefined || p === '') return this.i18n.t('event.paid');
    const n = Number(p);
    if (Number.isNaN(n)) return String(p);
    return this.i18n.t('event.priceUah', { n: Math.round(n) });
  }

  normalize(e: EventModel): EventVM {
    const meta: CategoryMeta = categoryMeta(e.category, this.i18n.t('card.notFound'));
    const cityName = e.city?.name ?? '';
    const place = e.address || cityName;
    const startsAtIso = this.parse(e.startsAt)?.toISOString() ?? '';
    return {
      id: e.id,
      slug: e.slug,
      href: this.i18n.url(`/event/${e.slug}`),
      title: e.title,
      description: e.description ?? '',
      startsAt: e.startsAt,
      startsAtIso,
      dateLabel: this.formatDateTime(e.startsAt),
      shortDate: this.formatDate(e.startsAt),
      time: this.formatTime(e.startsAt),
      address: e.address ?? '',
      place,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      cover: e.coverImage ?? '',
      isPaid: !!e.isPaid,
      priceLabel: this.formatPrice(e),
      attendeeCount: e.attendeeCount ?? e._count?.attendees ?? e.goingCount ?? 0,
      isAttending: !!e.isAttending,
      isSaved: !!e.isSaved,
      hue: meta.hue,
      glyph: meta.glyph,
      catLabel: meta.label,
      organizer: e.organizer ?? null,
      cityName,
    };
  }
}

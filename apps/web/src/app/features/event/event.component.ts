import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { EventCardComponent } from '../../shared/ui/event-card/event-card.component';
import { MiniMapComponent } from '../../shared/map/mini-map.component';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { I18nService } from '../../shared/i18n/i18n.service';
import { EventsApi } from '../../core/api/events.api';
import { EventViewService } from '../../shared/event/event-view.service';
import { SeoService } from '../../core/seo/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { EventModel } from '../../core/models';
import { RESPONSE_STATUS } from '../../core/tokens';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [IconComponent, EventCardComponent, MiniMapComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event.component.html',
  styleUrl: './event.component.scss',
})
export class EventComponent {
  private readonly api = inject(EventsApi);
  private readonly view = inject(EventViewService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // Present only during SSR (provided per-request by server.ts); null in the browser.
  private readonly responseStatus = inject(RESPONSE_STATUS, { optional: true });
  protected readonly i18n = inject(I18nService);

  /** `:slug` route param (withComponentInputBinding). */
  readonly slug = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly event = signal<EventModel | null>(null);
  protected readonly similar = signal<EventModel[]>([]);
  protected readonly attending = signal(false);
  protected readonly goingCount = signal(0);

  protected readonly vm = computed(() => {
    const e = this.event();
    return e ? this.view.normalize(e) : null;
  });

  protected readonly saved = signal(false);

  /** Description split into paragraphs (legacy `\n+` → <p> behaviour). */
  protected readonly paragraphs = computed(() => {
    const v = this.vm();
    const text = (v?.description || '').trim();
    if (!text) return [this.i18n.t('event.descFallback')];
    return text.split(/\n+/).filter((p) => p.trim().length);
  });

  protected readonly orgInitial = computed(() =>
    (this.vm()?.organizer?.name || '?').charAt(0).toUpperCase(),
  );

  constructor() {
    // Refetch when the slug changes (client navigation between events).
    effect(() => {
      const slug = this.slug();
      this.load(slug);
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.api
      .getBySlug(slug)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((raw) => {
        if (!raw || !raw.id) {
          this.notFound.set(true);
          this.event.set(null);
          if (this.responseStatus) this.responseStatus.code = 404;
          this.seo.update({
            path: `/event/${slug}`,
            title: `${this.i18n.t('event.notFoundTitle')} — Shodumo`,
            description: this.i18n.t('event.notFoundText'),
          });
          return;
        }
        this.event.set(raw);
        this.attending.set(!!raw.isAttending);
        this.saved.set(!!raw.isSaved);
        const vm = this.view.normalize(raw);
        this.goingCount.set(vm.attendeeCount);
        this.applySeo(raw, vm.place);
        this.loadSimilar(raw);
      });
  }

  private applySeo(e: EventModel, place: string): void {
    const vm = this.view.normalize(e);
    this.seo.update({
      path: `/event/${e.slug}`,
      title: `${e.title} — Shodumo`,
      description: e.description?.slice(0, 200) || this.i18n.t('meta.event.desc'),
      image: vm.cover || null,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: e.title,
        startDate: e.startsAt,
        description: e.description || undefined,
        image: vm.cover ? [vm.cover] : undefined,
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: place,
          address: e.address || e.city?.name || undefined,
          ...(e.lat != null && e.lng != null
            ? { geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng } }
            : {}),
        },
        organizer: e.organizer
          ? { '@type': 'Organization', name: e.organizer.name }
          : undefined,
        offers: {
          '@type': 'Offer',
          price: e.isPaid ? Number(e.price ?? 0) : 0,
          priceCurrency: 'UAH',
        },
      },
    });
  }

  private loadSimilar(e: EventModel): void {
    this.api
      .list({ city: e.city?.slug, category: e.category?.slug, limit: 4 })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        const list = (res?.data ?? []).filter((x) => x.slug !== e.slug).slice(0, 3);
        this.similar.set(list);
      });
  }

  protected toggleAttend(): void {
    const e = this.event();
    if (!e) return;
    if (!this.auth.isAuthenticated()) {
      this.router.navigate([], { queryParams: { auth: 'login' }, queryParamsHandling: 'merge' });
      return;
    }
    const going = !this.attending();
    this.attending.set(going);
    this.goingCount.update((n) => Math.max(0, n + (going ? 1 : -1)));
    const op = going ? this.api.attend(e.id, 'GOING') : this.api.unattend(e.id, 'GOING');
    op.subscribe({
      next: () => this.toast.success(this.i18n.t(going ? 'toast.going' : 'toast.notGoing')),
      error: () => {
        this.attending.set(!going);
        this.goingCount.update((n) => Math.max(0, n + (going ? -1 : 1)));
        this.toast.error(this.i18n.t('toast.updateFailed'));
      },
    });
  }

  protected toggleSave(): void {
    const e = this.event();
    if (!e) return;
    if (!this.auth.isAuthenticated()) {
      this.router.navigate([], { queryParams: { auth: 'login' }, queryParamsHandling: 'merge' });
      return;
    }
    const saved = !this.saved();
    this.saved.set(saved);
    const op = saved ? this.api.attend(e.id, 'SAVED') : this.api.unattend(e.id, 'SAVED');
    op.subscribe({
      next: () => this.toast.success(this.i18n.t(saved ? 'toast.saved' : 'toast.unsaved')),
      error: () => {
        this.saved.set(!saved);
        this.toast.error(this.i18n.t('toast.updateFailed'));
      },
    });
  }

  protected share(): void {
    if (!this.isBrowser) return;
    const url = this.doc.location.href;
    const title = this.doc.title;
    const nav = this.doc.defaultView?.navigator;
    if (nav?.share) {
      nav.share({ title, url }).catch(() => undefined);
    } else if (nav?.clipboard) {
      nav.clipboard
        .writeText(url)
        .then(() => this.toast.success(this.i18n.t('toast.linkCopied')))
        .catch(() => undefined);
    }
  }
}

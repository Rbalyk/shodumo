import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { EventCardComponent } from '../../shared/ui/event-card/event-card.component';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { I18nService } from '../../shared/i18n/i18n.service';
import { OrganizerApi } from '../../core/api/organizer.api';
import { SeoService } from '../../core/seo/seo.service';
import { OrganizerDetail } from '../../core/models';
import { RESPONSE_STATUS } from '../../core/tokens';

interface OrgLink {
  key: string;
  href: string;
}

@Component({
  selector: 'app-organizer',
  standalone: true,
  imports: [IconComponent, EventCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organizer.component.html',
  styleUrl: './organizer.component.scss',
})
export class OrganizerComponent {
  private readonly api = inject(OrganizerApi);
  private readonly seo = inject(SeoService);
  // Present only during SSR (provided per-request by server.ts); null in the browser.
  private readonly responseStatus = inject(RESPONSE_STATUS, { optional: true });
  protected readonly i18n = inject(I18nService);

  /** `:id` route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly org = signal<OrganizerDetail | null>(null);

  protected readonly events = computed(() => this.org()?.events ?? []);
  protected readonly avatarInitial = computed(() =>
    (this.org()?.name || '?').trim().charAt(0).toUpperCase(),
  );

  protected readonly links = computed<OrgLink[]>(() => {
    const l = this.org()?.links ?? {};
    const out: OrgLink[] = [];
    if (l['website']) out.push({ key: 'organizer.website', href: l['website'] });
    if (l['instagram']) out.push({ key: 'organizer.instagram', href: l['instagram'] });
    if (l['telegram']) out.push({ key: 'organizer.telegram', href: l['telegram'] });
    return out;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.api
      .getPublic(id)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((org) => {
        if (!org || !org.id) {
          this.notFound.set(true);
          this.org.set(null);
          if (this.responseStatus) this.responseStatus.code = 404;
          this.seo.update({
            path: `/organizer/${id}`,
            title: `${this.i18n.t('organizer.fallbackName')} — Shodumo`,
            description: this.i18n.t('organizer.metaDesc'),
          });
          return;
        }
        this.org.set(org);
        this.applySeo(org);
      });
  }

  private applySeo(org: OrganizerDetail): void {
    const name = org.name || this.i18n.t('organizer.fallbackName');
    this.seo.update({
      path: `/organizer/${org.id}`,
      title: `${name} — Shodumo`,
      description: org.bio?.slice(0, 200) || this.i18n.t('organizer.metaDesc'),
      image: org.avatar || null,
      type: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        description: org.bio || undefined,
        image: org.avatar || undefined,
      },
    });
  }
}

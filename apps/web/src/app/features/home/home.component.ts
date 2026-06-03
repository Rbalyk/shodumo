import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { EventCardComponent } from '../../shared/ui/event-card/event-card.component';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { I18nService } from '../../shared/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { EventsApi } from '../../core/api/events.api';
import { ReferenceApi } from '../../core/api/reference.api';
import { CityService } from '../../core/city/city.service';
import { Category, EventModel } from '../../core/models';
import { categoryMeta, IconName } from '../../shared/event/category-meta';
import { environment } from '../../../environments/environment';

interface FilterChip {
  cat: string;
  icon: IconName;
  key: string;
}

/** Fixed quick-filter chips (1:1 with the legacy design). */
const CHIPS: FilterChip[] = [
  { cat: '', icon: 'sparkles', key: 'filter.all' },
  { cat: 'забіги', icon: 'run', key: 'filter.runs' },
  { cat: 'дегустації', icon: 'wine', key: 'filter.tastings' },
  { cat: 'воркшопи', icon: 'workshop', key: 'filter.workshops' },
  { cat: 'музика', icon: 'music', key: 'filter.music' },
  { cat: 'маркети', icon: 'market', key: 'filter.markets' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IconComponent, EventCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly api = inject(EventsApi);
  private readonly ref = inject(ReferenceApi);
  private readonly cityService = inject(CityService);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);

  /** `?q=` bound from the route (withComponentInputBinding). */
  readonly q = input('');

  protected readonly chips = CHIPS;
  protected readonly category = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly events = signal<EventModel[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly skeletons = Array.from({ length: 6 });

  protected readonly city = this.cityService;

  private inflight = false;

  constructor() {
    this.seo.update({
      path: '/',
      title: this.i18n.t('meta.home.title'),
      description: this.i18n.t('meta.home.desc'),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Shodumo',
        url: environment.siteUrl,
      },
    });

    this.ref
      .getCategories()
      .pipe(catchError(() => of([] as Category[])))
      .subscribe((list) => this.categories.set(list));

    // Reload whenever the city, the active category, or the search term changes.
    effect(() => {
      const city = this.cityService.selected();
      const category = this.category();
      const q = this.q();
      untracked(() => this.load(city, category, q));
    });
  }

  protected setCategory(slug: string): void {
    this.category.set(slug);
  }

  protected retry(): void {
    this.load(this.cityService.selected(), this.category(), this.q());
  }

  protected glyphFor(category: Category): IconName {
    return categoryMeta(category, '').glyph;
  }

  private load(city: string, category: string, q: string): void {
    if (this.inflight) return;
    this.inflight = true;
    this.loading.set(true);
    this.error.set(false);

    this.api
      .list({ city, category: category || undefined, q: q || undefined, page: 1, limit: 12 })
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
        finalize(() => {
          this.inflight = false;
          this.loading.set(false);
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        this.events.set(res.data ?? []);
        this.total.set(res.meta?.total ?? res.data?.length ?? 0);
      });
  }
}

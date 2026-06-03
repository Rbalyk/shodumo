import type * as Leaflet from 'leaflet';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';
import { I18nService } from '../../shared/i18n/i18n.service';
import { EventsApi } from '../../core/api/events.api';
import { EventViewService, EventVM } from '../../shared/event/event-view.service';
import { CityService } from '../../core/city/city.service';
import { SeoService } from '../../core/seo/seo.service';
import { EventModel } from '../../core/models';
import { ATTR, LVIV, TILE, accentIcon, loadLeaflet } from '../../shared/map/leaflet';
import { iconSvg } from '../../shared/ui/icon/icon-set';

/** Full Leaflet map page: every event in the selected city as a marker. */
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent {
  private readonly api = inject(EventsApi);
  private readonly view = inject(EventViewService);
  private readonly city = inject(CityService);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);

  protected readonly events = signal<EventModel[]>([]);
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');

  private map: Leaflet.Map | null = null;
  private L: typeof Leaflet | null = null;
  private layer: Leaflet.LayerGroup | null = null;

  private readonly vms = computed(() =>
    this.events()
      .map((e) => this.view.normalize(e))
      .filter((v) => v.lat != null && v.lng != null),
  );

  constructor() {
    this.seo.update({
      path: '/map',
      title: this.i18n.t('meta.map.title'),
      description: this.i18n.t('meta.map.desc'),
    });

    // Fetch the city's events (runs on the server too → transfer cache).
    effect(() => {
      const city = this.city.selected();
      this.api
        .list({ city, limit: 100 })
        .pipe(catchError(() => of(null)))
        .subscribe((res) => this.events.set(res?.data ?? []));
    });

    // Browser-only: init Leaflet once, then keep markers in sync with the vms.
    afterNextRender(async () => {
      const el = this.canvas()?.nativeElement;
      if (!el) return;
      this.L = await loadLeaflet();
      this.map = this.L.map(el, { scrollWheelZoom: true }).setView(LVIV, 13);
      this.L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(this.map);
      this.layer = this.L.layerGroup().addTo(this.map);
      this.renderMarkers(this.vms());
    });

    effect(() => {
      const vms = this.vms();
      if (this.map && this.L) this.renderMarkers(vms);
    });
  }

  private renderMarkers(vms: EventVM[]): void {
    const L = this.L;
    const map = this.map;
    const layer = this.layer;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    const bounds: [number, number][] = [];
    for (const v of vms) {
      if (v.lat == null || v.lng == null) continue;
      const marker = L.marker([v.lat, v.lng], { icon: accentIcon(L, v.hue) });
      marker.bindPopup(this.popupHtml(v), { closeButton: false, minWidth: 210 });
      marker.addTo(layer);
      bounds.push([v.lat, v.lng]);
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }

  private popupHtml(v: EventVM): string {
    return (
      '<div class="map-popup">' +
      `<div class="cover ph ${v.hue}"><span class="glyph">${iconSvg(v.glyph, { size: 28 })}</span></div>` +
      `<div class="title">${this.esc(v.title)}</div>` +
      `<div class="date">${this.esc(v.dateLabel)}</div>` +
      `<a class="link" href="${v.href}">${this.esc(this.i18n.t('event.more'))} ${iconSvg('chevRight', { size: 14 })}</a>` +
      '</div>'
    );
  }

  private esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
      switch (c) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  }
}

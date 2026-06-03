import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  viewChild,
} from '@angular/core';
import { ATTR, TILE, accentIcon, loadLeaflet } from './leaflet';

/** Static single-marker mini map for the event detail page (browser-only). */
@Component({
  selector: 'sd-mini-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mini-map.component.html',
  styleUrl: './mini-map.component.scss',
})
export class MiniMapComponent {
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  readonly hue = input('cat-music');
  readonly ariaLabel = input('');

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');

  constructor() {
    afterNextRender(async () => {
      const lat = this.lat();
      const lng = this.lng();
      if (lat == null || lng == null) return;
      const L = await loadLeaflet();
      const map = L.map(this.canvas().nativeElement, {
        scrollWheelZoom: false,
        dragging: false,
        zoomControl: false,
        doubleClickZoom: false,
        attributionControl: false,
      }).setView([lat, lng], 15);
      L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);
      L.marker([lat, lng], { icon: accentIcon(L, this.hue()) }).addTo(map);
    });
  }
}

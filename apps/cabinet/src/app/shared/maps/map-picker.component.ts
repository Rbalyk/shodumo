import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { MapLoaderService } from './map-loader.service';

export interface LatLng {
  lat: number;
  lng: number;
}

const LVIV: LatLng = { lat: 49.8397, lng: 24.0297 };

/** Click-to-pick location on a Google Map. Degrades to a notice when no API key. */
@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [GoogleMap, MapMarker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ready()) {
      <google-map
        height="280px"
        width="100%"
        [center]="center()"
        [zoom]="13"
        (mapClick)="pick($event)"
      >
        @if (marker(); as m) {
          <map-marker [position]="m" />
        }
      </google-map>
      <p class="hint muted">{{ coordsLabel() }}</p>
    } @else {
      <div class="fallback">
        <p class="muted">🗺️ Google Maps недоступний (немає API-ключа). Введіть координати вручну нижче.</p>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      google-map { border-radius: var(--r-md); overflow: hidden; display: block; }
      .hint { margin-top: 8px; font-size: 12.5px; }
      .fallback { padding: 18px; border: 1.5px dashed var(--line-2); border-radius: var(--r-md); text-align: center; }
    `,
  ],
})
export class MapPickerComponent implements OnInit {
  private readonly loader = inject(MapLoaderService);

  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  readonly pointChange = output<LatLng>();

  readonly ready = signal(false);
  readonly marker = signal<LatLng | null>(null);
  readonly center = signal<LatLng>(LVIV);

  ngOnInit(): void {
    const lat = this.lat();
    const lng = this.lng();
    if (lat != null && lng != null) {
      this.marker.set({ lat, lng });
      this.center.set({ lat, lng });
    }
    void this.loader.load().then((ok) => this.ready.set(ok));
  }

  pick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const point: LatLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    this.marker.set(point);
    this.pointChange.emit(point);
  }

  coordsLabel(): string {
    const m = this.marker();
    return m ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` : 'Натисніть на карту, щоб поставити точку';
  }
}

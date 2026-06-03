import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
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

/** A picked location, optionally enriched with a reverse-geocoded address. */
export interface PickedPoint extends LatLng {
  address?: string;
}

const LVIV: LatLng = { lat: 49.8397, lng: 24.0297 };

/**
 * Click- or drag-to-pick location on a Google Map. Reacts to `[lat]/[lng]`
 * (e.g. set by Address autocomplete) and to `[recenter]` (e.g. city change).
 * Degrades to a notice when there is no API key.
 */
@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [GoogleMap, MapMarker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-picker.component.html',
  styleUrl: './map-picker.component.scss',
})
export class MapPickerComponent implements OnInit {
  private readonly loader = inject(MapLoaderService);

  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  /** Pan/center the map here without dropping a marker (used on city change). */
  readonly recenter = input<LatLng | null>(null);
  readonly pointChange = output<PickedPoint>();

  readonly ready = signal(false);
  readonly marker = signal<LatLng | null>(null);
  readonly center = signal<LatLng>(LVIV);
  readonly zoom = signal(13);

  readonly markerOptions: google.maps.MarkerOptions = { draggable: true };

  private geocoder: google.maps.Geocoder | null = null;

  constructor() {
    // lat/lng inputs (autocomplete / form patch) → move marker + center on it.
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (lat != null && lng != null) {
        const point = { lat, lng };
        this.marker.set(point);
        this.center.set(point);
      }
    });
    // city recenter → pan there (city-level zoom), keep any existing marker.
    effect(() => {
      const target = this.recenter();
      if (target) {
        this.center.set(target);
        this.zoom.set(12);
      }
    });
  }

  ngOnInit(): void {
    void this.loader.load().then((ok) => {
      this.ready.set(ok);
      if (ok && typeof google !== 'undefined') {
        this.geocoder = new google.maps.Geocoder();
      }
    });
  }

  pick(event: google.maps.MapMouseEvent): void {
    if (event.latLng) this.commit({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  dragEnd(event: google.maps.MapMouseEvent): void {
    if (event.latLng) this.commit({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  /** Update the marker and emit the point, reverse-geocoding the address if possible. */
  private commit(point: LatLng): void {
    this.marker.set(point);
    if (!this.geocoder) {
      this.pointChange.emit(point);
      return;
    }
    this.geocoder.geocode({ location: point }, (results, status) => {
      const address =
        status === google.maps.GeocoderStatus.OK && results?.[0]
          ? results[0].formatted_address
          : undefined;
      this.pointChange.emit({ ...point, address });
    });
  }

  coordsLabel(): string {
    const m = this.marker();
    return m ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` : 'Натисніть на карту, щоб поставити точку';
  }
}

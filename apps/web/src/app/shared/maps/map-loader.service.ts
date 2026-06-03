import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Loads the Google Maps JS API once, on demand. */
@Injectable({ providedIn: 'root' })
export class MapLoaderService {
  private promise: Promise<boolean> | null = null;

  get hasKey(): boolean {
    return !!environment.googleMapsKey;
  }

  load(): Promise<boolean> {
    if (this.promise) return this.promise;

    if (!this.hasKey) {
      this.promise = Promise.resolve(false);
      return this.promise;
    }

    this.promise = new Promise<boolean>((resolve) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      // `places` powers Address autocomplete; geocoding (reverse-geocode on
      // marker drag) is part of the core JS API, no extra library needed.
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return this.promise;
  }
}

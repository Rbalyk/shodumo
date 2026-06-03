import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { Media } from '../models';

/**
 * Media upload. NOTE: the current API `POST /media` is a stub — it accepts a
 * `fileName` and returns a generated stub URL; it does not handle the binary.
 * The UI captures the file for UX/preview and sends its name.
 */
@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  upload(eventId: string, fileName: string, sortOrder = 0): Observable<Media> {
    return this.http.post<Media>(`${this.base}/media`, { eventId, fileName, sortOrder });
  }
}

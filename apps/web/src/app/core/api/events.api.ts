import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { I18nService } from '../../shared/i18n/i18n.service';
import {
  AttendanceType,
  EventModel,
  EventQuery,
  EventWritePayload,
  Paginated,
} from '../models';

/**
 * Public event reads (feed + detail) and attendance mutations.
 *
 * Content GETs append the active UI language (`?lang=`) so the API returns the
 * right localized copy. Reads run on the server during SSR (cookies forwarded by
 * the credentials interceptor) and are replayed to the client via the HTTP
 * transfer cache — so the first paint is personalized and never flashes.
 */
@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly i18n = inject(I18nService);

  /** Paginated public feed. */
  list(query: EventQuery = {}): Observable<Paginated<EventModel>> {
    let params = new HttpParams().set('lang', this.i18n.lang());
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Paginated<EventModel>>(`${this.base}/events`, { params });
  }

  /** Single published event by slug (public read). */
  getBySlug(slug: string): Observable<EventModel> {
    return this.http.get<EventModel>(`${this.base}/events/${encodeURIComponent(slug)}`, {
      params: { lang: this.i18n.lang() },
    });
  }

  /** Events the authenticated user has saved (plain list, not paginated). */
  saved(): Observable<EventModel[]> {
    return this.http.get<EventModel[]>(`${this.base}/me/saved`, {
      params: { lang: this.i18n.lang() },
    });
  }

  attend(eventId: string, type: AttendanceType = 'GOING'): Observable<void> {
    return this.http.post<void>(`${this.base}/events/${encodeURIComponent(eventId)}/attend`, {
      type,
    });
  }

  unattend(eventId: string, type: AttendanceType = 'GOING'): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/${encodeURIComponent(eventId)}/attend`, {
      body: { type },
    });
  }

  // ----- organizer-owned operations (cabinet) -----

  /** All events owned by the authenticated organizer (every status). */
  myEvents(): Observable<EventModel[]> {
    return this.http.get<EventModel[]>(`${this.base}/me/events`);
  }

  create(payload: EventWritePayload): Observable<EventModel> {
    return this.http.post<EventModel>(`${this.base}/events`, payload);
  }

  update(id: string, payload: Partial<EventWritePayload>): Observable<EventModel> {
    return this.http.patch<EventModel>(`${this.base}/events/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/${id}`);
  }
}

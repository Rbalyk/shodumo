import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventModel, EventWritePayload, Lang } from '../models';

/** Organizer-owned event operations. */
@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

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

  /** Public read by slug — used for the live preview. */
  getBySlug(slug: string, lang: Lang = 'uk'): Observable<EventModel> {
    return this.http.get<EventModel>(`${this.base}/events/${slug}`, { params: { lang } });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lang, OrganizerProfile, OrganizerWritePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class OrganizerApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Upsert the authenticated organizer's profile. */
  updateMe(payload: OrganizerWritePayload): Observable<OrganizerProfile> {
    return this.http.patch<OrganizerProfile>(`${this.base}/me/organizer`, payload);
  }

  /** Public organizer profile (id) — used for the public preview. */
  getPublic(id: string, lang: Lang = 'uk'): Observable<OrganizerProfile> {
    return this.http.get<OrganizerProfile>(`${this.base}/organizers/${id}`, { params: { lang } });
  }
}

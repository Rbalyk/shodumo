import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { I18nService } from '../../shared/i18n/i18n.service';
import { OrganizerDetail, OrganizerProfile, OrganizerWritePayload } from '../models';

/** Public organizer profile + their published events, plus the owner upsert. */
@Injectable({ providedIn: 'root' })
export class OrganizerApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly i18n = inject(I18nService);

  getPublic(id: string): Observable<OrganizerDetail> {
    return this.http.get<OrganizerDetail>(`${this.base}/organizers/${encodeURIComponent(id)}`, {
      params: { lang: this.i18n.lang() },
    });
  }

  /** Upsert the authenticated organizer's profile (cabinet). */
  updateMe(payload: OrganizerWritePayload): Observable<OrganizerProfile> {
    return this.http.patch<OrganizerProfile>(`${this.base}/me/organizer`, payload);
  }
}

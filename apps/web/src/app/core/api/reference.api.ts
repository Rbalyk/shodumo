import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { I18nService } from '../../shared/i18n/i18n.service';
import { Category, City } from '../models';

/** Public reference data: cities + categories (localized by active language). */
@Injectable({ providedIn: 'root' })
export class ReferenceApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly i18n = inject(I18nService);

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.base}/cities`, { params: { lang: this.i18n.lang() } });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`, {
      params: { lang: this.i18n.lang() },
    });
  }
}

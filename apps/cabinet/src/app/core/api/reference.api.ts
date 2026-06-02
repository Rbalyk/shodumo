import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, City, Lang } from '../models';

/** Public reference data: cities + categories. */
@Injectable({ providedIn: 'root' })
export class ReferenceApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getCities(lang: Lang = 'uk'): Observable<City[]> {
    return this.http.get<City[]>(`${this.base}/cities`, { params: { lang } });
  }

  getCategories(lang: Lang = 'uk'): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`, { params: { lang } });
  }
}

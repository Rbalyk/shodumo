import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { Category, City, EventModel, EventStatus, TaxonomyWritePayload } from '../models';

/** Admin operations: moderation queue + taxonomy CRUD. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  events(status: EventStatus = 'PENDING'): Observable<EventModel[]> {
    return this.http.get<EventModel[]>(`${this.base}/admin/events`, { params: { status } });
  }

  /** API supports PUBLISHED | ARCHIVED only — no rejection reason field. */
  moderate(id: string, status: Extract<EventStatus, 'PUBLISHED' | 'ARCHIVED'>): Observable<EventModel> {
    return this.http.patch<EventModel>(`${this.base}/admin/events/${id}/moderate`, { status });
  }

  // ----- cities -----
  createCity(payload: TaxonomyWritePayload): Observable<City> {
    return this.http.post<City>(`${this.base}/admin/cities`, payload);
  }
  updateCity(id: string, payload: Partial<TaxonomyWritePayload>): Observable<City> {
    return this.http.patch<City>(`${this.base}/admin/cities/${id}`, payload);
  }
  deleteCity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/cities/${id}`);
  }

  // ----- categories -----
  createCategory(payload: TaxonomyWritePayload): Observable<Category> {
    return this.http.post<Category>(`${this.base}/admin/categories`, payload);
  }
  updateCategory(id: string, payload: Partial<TaxonomyWritePayload>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/admin/categories/${id}`, payload);
  }
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/categories/${id}`);
  }
}

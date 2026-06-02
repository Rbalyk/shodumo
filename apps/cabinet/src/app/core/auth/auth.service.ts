import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthProfile, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // Auth lives entirely in httpOnly cookies now; the profile (loaded via
  // /auth/me) is the single source of "are we logged in".
  private readonly _profile = signal<AuthProfile | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly isAuthenticated = computed(() => !!this._profile());
  readonly role = computed<Role | null>(() => this._profile()?.role ?? null);

  login(email: string, password: string): Observable<AuthProfile> {
    return this.http
      .post<AuthProfile>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  refresh(): Observable<AuthProfile> {
    return this.http
      .post<AuthProfile>(`${this.base}/auth/refresh`, {})
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  /** Fetch the authoritative profile from the API (id, email, name, role). */
  loadMe(): Observable<AuthProfile> {
    return this.http
      .get<AuthProfile>(`${this.base}/auth/me`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  logout(): void {
    this._profile.set(null);
    // Fire-and-forget: clears the server cookies.
    this.http.post(`${this.base}/auth/logout`, {}).subscribe({ error: () => undefined });
  }

  /** Landing route for the current role. */
  homeRoute(): string {
    switch (this.role()) {
      case 'ADMIN':
        return '/admin';
      case 'ORGANIZER':
        return '/cabinet';
      default:
        return '/login';
    }
  }
}

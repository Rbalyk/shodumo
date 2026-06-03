import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import { AuthProfile, Role } from '../models';

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  role?: 'ATTENDEE' | 'ORGANIZER';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // Auth lives entirely in httpOnly cookies; the profile (from /auth/me) is the
  // single source of "are we logged in".
  private readonly _profile = signal<AuthProfile | null>(null);

  readonly profile = this._profile.asReadonly();
  readonly isAuthenticated = computed(() => !!this._profile());
  readonly role = computed<Role | null>(() => this._profile()?.role ?? null);
  readonly isOrganizer = computed(() => this.role() === 'ORGANIZER');
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  login(email: string, password: string): Observable<AuthProfile> {
    return this.http
      .post<AuthProfile>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  /** Registers a pending account — API emails a confirmation link (202). */
  register(payload: RegisterPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/register`, payload);
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

  /** Drop the in-memory session without calling the API (used after a dead refresh). */
  clearSession(): void {
    this._profile.set(null);
  }

  /** Landing route for the current role inside the unified app. */
  homeRoute(): string {
    switch (this.role()) {
      case 'ADMIN':
        return '/admin';
      case 'ORGANIZER':
        return '/cabinet';
      default:
        return '/';
    }
  }
}

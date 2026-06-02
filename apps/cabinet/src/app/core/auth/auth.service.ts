import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthProfile, AuthTokens, JwtPayload, Role } from '../models';

const ACCESS_KEY = 'sd_cab_access';
const REFRESH_KEY = 'sd_cab_refresh';

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json))) as JwtPayload;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _profile = signal<AuthProfile | null>(null);
  private readonly _accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));

  readonly profile = this._profile.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly role = computed<Role | null>(() => this._profile()?.role ?? null);

  constructor() {
    // hydrate role synchronously from the stored token so guards work on reload
    const token = this._accessToken();
    if (token) {
      const claims = decodeJwt(token);
      if (claims) {
        this._profile.set({ id: claims.sub, email: claims.email, name: claims.name ?? null, role: claims.role });
      }
    }
  }

  get accessToken(): string | null {
    return this._accessToken();
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  refresh(): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/refresh`, { refreshToken: this.refreshToken })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  /** Fetch the authoritative profile from the API (id, email, name, role). */
  loadMe(): Observable<AuthProfile> {
    return this.http
      .get<AuthProfile>(`${this.base}/auth/me`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    this._accessToken.set(tokens.accessToken);
    const claims = decodeJwt(tokens.accessToken);
    if (claims) {
      this._profile.set({ id: claims.sub, email: claims.email, name: claims.name ?? null, role: claims.role });
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._accessToken.set(null);
    this._profile.set(null);
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

import { Injectable, computed, inject, signal } from '@angular/core';
import { EventsApi } from '../../core/api/events.api';
import { EventModel } from '../../core/models';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Signal store for the authenticated organizer's events (shared dashboard + list). */
@Injectable({ providedIn: 'root' })
export class CabinetEventsStore {
  private readonly api = inject(EventsApi);

  private readonly _events = signal<EventModel[]>([]);
  private readonly _state = signal<LoadState>('idle');

  readonly events = this._events.asReadonly();
  readonly state = this._state.asReadonly();

  readonly summary = computed(() => {
    const list = this._events();
    const goingOf = (e: EventModel) => e.goingCount ?? e._count?.attendees ?? 0;
    return {
      total: list.length,
      published: list.filter((e) => e.status === 'PUBLISHED').length,
      pending: list.filter((e) => e.status === 'PENDING').length,
      going: list.reduce((sum, e) => sum + goingOf(e), 0),
    };
  });

  readonly upcoming = computed(() =>
    [...this._events()]
      .filter((e) => new Date(e.startsAt).getTime() >= Date.now())
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 5),
  );

  load(force = false): void {
    if (!force && this._state() === 'ready') return;
    this._state.set('loading');
    this.api.myEvents().subscribe({
      next: (events) => {
        this._events.set(events);
        this._state.set('ready');
      },
      error: () => this._state.set('error'),
    });
  }

  removeLocal(id: string): void {
    this._events.update((list) => list.filter((e) => e.id !== id));
  }
}

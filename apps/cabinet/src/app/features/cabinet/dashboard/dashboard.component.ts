import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CabinetEventsStore } from '../cabinet-events.store';
import { EventModel } from '../../../core/models';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe, StatusBadgeComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h1 class="page-title">{{ 'dash.title' | t }}</h1>
      <a class="btn btn--grad" routerLink="/cabinet/events/new">{{ 'dash.newEvent' | t }}</a>
    </div>

    @switch (store.state()) {
      @case ('loading') { <app-state-panel mode="loading" /> }
      @case ('error') { <app-state-panel mode="error" (retry)="store.load(true)" /> }
      @default {
        <div class="tiles">
          <div class="card tile">
            <span class="tile-label">{{ 'dash.total' | t }}</span>
            <strong class="tile-value">{{ store.summary().total }}</strong>
          </div>
          <div class="card tile">
            <span class="tile-label">{{ 'dash.published' | t }}</span>
            <strong class="tile-value pub">{{ store.summary().published }}</strong>
          </div>
          <div class="card tile">
            <span class="tile-label">{{ 'dash.pending' | t }}</span>
            <strong class="tile-value pend">{{ store.summary().pending }}</strong>
          </div>
          <div class="card tile">
            <span class="tile-label">{{ 'dash.going' | t }}</span>
            <strong class="tile-value grad">{{ store.summary().going }}</strong>
          </div>
        </div>

        <section class="card upcoming">
          <h2 class="sec-title">{{ 'dash.upcoming' | t }}</h2>
          @if (store.upcoming().length === 0) {
            <app-state-panel mode="empty" [inline]="true" />
          } @else {
            <ul class="list">
              @for (e of store.upcoming(); track e.id) {
                <li class="row">
                  <a class="row-main" [routerLink]="['/cabinet/events', e.id, 'edit']">
                    <span class="row-title">{{ e.title }}</span>
                    <span class="row-date">{{ e.startsAt | date: 'dd MMM yyyy, HH:mm' }}</span>
                  </a>
                  <div class="row-side">
                    <span class="going">{{ goingOf(e) }}</span>
                    <app-status-badge [status]="e.status" />
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
      .page-title { font-size: 24px; font-weight: 800; }
      .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
      @media (max-width: 720px) { .tiles { grid-template-columns: 1fr 1fr; } }
      .tile { padding: 18px; display: flex; flex-direction: column; gap: 6px; }
      .tile-label { font-size: 12.5px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.03em; }
      .tile-value { font-size: 32px; font-weight: 800; line-height: 1; }
      .tile-value.pub { color: var(--st-published); }
      .tile-value.pend { color: var(--st-pending); }
      .tile-value.grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
      .upcoming { padding: 20px; }
      .sec-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-3); margin-bottom: 12px; }
      .list { display: flex; flex-direction: column; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
      .row:last-child { border-bottom: 0; }
      .row-main { display: flex; flex-direction: column; gap: 3px; text-decoration: none; color: inherit; min-width: 0; }
      .row-title { font-weight: 700; font-size: 14.5px; }
      .row-main:hover .row-title { color: var(--accent); }
      .row-date { font-size: 12.5px; color: var(--ink-3); }
      .row-side { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
      .going { font-weight: 700; font-size: 14px; color: var(--ink-2); }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  readonly store = inject(CabinetEventsStore);

  ngOnInit(): void {
    this.store.load();
  }

  goingOf(e: EventModel): number {
    return e.goingCount ?? e._count?.attendees ?? 0;
  }
}

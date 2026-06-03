import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CabinetEventsStore } from '../cabinet-events.store';
import { EventModel } from '../../../core/models';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import { fadeIn, fadeStagger } from '../../../shared/animations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe, StatusBadgeComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [fadeIn, fadeStagger],
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

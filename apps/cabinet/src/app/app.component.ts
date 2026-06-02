import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToasterComponent } from './shared/ui/toast/toaster.component';
import { ConfirmDialogComponent } from './shared/ui/confirm/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToasterComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toaster />
    <app-confirm-dialog />
  `,
})
export class AppComponent {}

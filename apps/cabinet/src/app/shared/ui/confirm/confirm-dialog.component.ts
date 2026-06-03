import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from './confirm.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
  readonly reason = signal('');

  ok(): void {
    this.confirm.resolve({ ok: true, reason: this.reason() });
    this.reason.set('');
  }

  cancel(): void {
    this.confirm.resolve({ ok: false });
    this.reason.set('');
  }
}

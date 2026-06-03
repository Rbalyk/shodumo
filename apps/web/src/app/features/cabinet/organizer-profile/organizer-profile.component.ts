import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, map } from 'rxjs';
import { OrganizerApi } from '../../../core/api/organizer.api';
import { AuthService } from '../../../core/auth/auth.service';
import { OrganizerWritePayload } from '../../../core/models';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { fadeIn } from '../../../shared/animations';

@Component({
  selector: 'app-organizer-profile',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organizer-profile.component.html',
  styleUrl: './organizer-profile.component.scss',
  animations: [fadeIn],
})
export class OrganizerProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OrganizerApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  readonly busy = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    bio: [''],
    bioEn: [''],
    avatar: [''],
    links: this.fb.array<FormGroup>([]),
  });

  /**
   * Live preview driven by `valueChanges` (debounced ~180ms) — a form value is
   * not a signal, so the previous `computed(() => form.getRawValue())` never
   * recomputed. `toSignal` bridges the stream into reactive state.
   */
  readonly preview = toSignal(
    this.form.valueChanges.pipe(
      debounceTime(180),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  readonly avatarBg = computed(() => {
    const a = this.preview().avatar?.trim();
    return a ? `url("${a}")` : 'var(--grad)';
  });
  readonly previewLinks = computed(() =>
    (this.preview().links ?? [])
      .map((l) => ({ key: (l['key'] ?? '').trim(), val: (l['val'] ?? '').trim() }))
      .filter((l) => l.key && l.val),
  );

  get links(): FormArray<FormGroup> {
    return this.form.controls.links;
  }

  ngOnInit(): void {
    // No GET /me/organizer in the API — seed the name from the authenticated profile.
    const profile = this.auth.profile();
    if (profile?.name) this.form.patchValue({ name: profile.name });
  }

  addLink(key = '', val = ''): void {
    this.links.push(this.fb.group({ key: [key], val: [val] }));
  }

  removeLink(i: number): void {
    this.links.removeAt(i);
  }

  private buildPayload(): OrganizerWritePayload {
    const v = this.form.getRawValue();
    const links: Record<string, string> = {};
    for (const l of v.links ?? []) {
      const key = (l['key'] ?? '').trim();
      const val = (l['val'] ?? '').trim();
      if (key && val) links[key] = val;
    }
    return {
      name: v.name ?? '',
      bio: v.bio?.trim() ? v.bio.trim() : null,
      bioEn: v.bioEn?.trim() ? v.bioEn.trim() : null,
      avatar: v.avatar?.trim() ? v.avatar.trim() : null,
      links: Object.keys(links).length ? links : null,
    };
  }

  save(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api.updateMe(this.buildPayload()).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.i18n.t('profile.saved'));
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 400) this.form.markAllAsTouched();
      },
    });
  }
}

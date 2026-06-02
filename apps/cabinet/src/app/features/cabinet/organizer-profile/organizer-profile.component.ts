import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OrganizerApi } from '../../../core/api/organizer.api';
import { AuthService } from '../../../core/auth/auth.service';
import { OrganizerWritePayload } from '../../../core/models';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-organizer-profile',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">{{ 'profile.title' | t }}</h1>

    <div class="layout">
      <form class="card form" [formGroup]="form" (ngSubmit)="save()">
        <div class="field">
          <label class="label" for="name">{{ 'profile.name' | t }}</label>
          <input id="name" class="control" type="text" formControlName="name" />
          @if (invalid('name')) { <p class="err">{{ 'common.required' | t }}</p> }
        </div>

        <div class="field">
          <label class="label" for="bio">{{ 'profile.bio' | t }}</label>
          <textarea id="bio" class="control" rows="4" formControlName="bio"></textarea>
        </div>

        <div class="field">
          <label class="label" for="bioEn">{{ 'profile.bioEn' | t }}</label>
          <textarea id="bioEn" class="control" rows="3" formControlName="bioEn"></textarea>
        </div>

        <div class="field">
          <label class="label" for="avatar">{{ 'profile.avatar' | t }}</label>
          <input id="avatar" class="control" type="text" formControlName="avatar" />
        </div>

        <div class="field">
          <span class="label">{{ 'profile.links' | t }}</span>
          <div formArrayName="links" class="links">
            @for (g of links.controls; track g; let i = $index) {
              <div class="link-row" [formGroupName]="i">
                <input class="control" type="text" formControlName="key" [placeholder]="i18n.t('profile.linkKey')" />
                <input class="control" type="text" formControlName="val" [placeholder]="i18n.t('profile.linkVal')" />
                <button class="btn btn--ghost btn--sm danger" type="button" (click)="removeLink(i)">✕</button>
              </div>
            }
          </div>
          <button class="btn btn--soft btn--sm" type="button" (click)="addLink()">{{ 'profile.addLink' | t }}</button>
        </div>

        <div class="actions">
          <button class="btn btn--grad" type="submit" [disabled]="busy()">
            {{ busy() ? ('common.saving' | t) : ('common.save' | t) }}
          </button>
        </div>
      </form>

      <aside class="card preview">
        <span class="preview-label muted">{{ 'common.preview' | t }}</span>
        <div class="avatar" [style.background-image]="avatarBg()"></div>
        <h3 class="preview-name">{{ preview().name || ('profile.name' | t) }}</h3>
        @if (preview().bio) { <p class="preview-bio">{{ preview().bio }}</p> }
        <div class="preview-links">
          @for (l of previewLinks(); track l.key) {
            <span class="chip">{{ l.key }}</span>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .page-title { font-size: 24px; font-weight: 800; margin-bottom: 18px; }
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
      @media (max-width: 880px) { .layout { grid-template-columns: 1fr; } }
      .form { padding: 22px; }
      .field { margin-bottom: 16px; }
      .label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
      .err { font-size: 12px; color: var(--danger); margin-top: 5px; }
      .links { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
      .link-row { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 8px; align-items: center; }
      .danger { color: var(--danger); }
      .actions { display: flex; justify-content: flex-end; padding-top: 4px; }
      .preview { padding: 22px; text-align: center; position: sticky; top: 16px; }
      .preview-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
      .avatar { width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 12px; background: var(--grad); background-size: cover; background-position: center; }
      .preview-name { font-size: 17px; font-weight: 800; }
      .preview-bio { font-size: 13px; color: var(--ink-2); margin-top: 8px; }
      .preview-links { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
      .chip { padding: 3px 10px; border-radius: var(--r-pill); font-size: 11.5px; font-weight: 700; background: var(--surface-2); color: var(--ink-2); }
    `,
  ],
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

  readonly preview = computed(() => this.form.getRawValue());
  readonly avatarBg = computed(() => {
    const a = this.form.controls.avatar.value?.trim();
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

  invalid(name: 'name'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }
}

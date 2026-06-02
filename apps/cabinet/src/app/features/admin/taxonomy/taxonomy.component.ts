import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../../core/api/admin.api';
import { ReferenceApi } from '../../../core/api/reference.api';
import { Category, City, TaxonomyWritePayload } from '../../../core/models';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

type Kind = 'city' | 'category';

@Component({
  selector: 'app-taxonomy',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">{{ 'tax.title' | t }}</h1>
    <p class="note muted">{{ 'tax.noDeactivate' | t }}</p>

    <div class="cols">
      <!-- Cities -->
      <section class="card col">
        <h2 class="sec-title">{{ 'tax.cities' | t }}</h2>
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ 'tax.name' | t }}</th>
              <th>{{ 'tax.nameEn' | t }}</th>
              <th class="actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (c of cities(); track c.id) {
              <tr>
                <td class="name">{{ c.name }}</td>
                <td class="muted">{{ c.nameEn || '—' }}</td>
                <td class="actions">
                  <button class="btn btn--ghost btn--sm" type="button" (click)="edit('city', c)">{{ 'common.edit' | t }}</button>
                  <button class="btn btn--ghost btn--sm danger" type="button" (click)="remove('city', c)">{{ 'common.delete' | t }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <form class="add" [formGroup]="cityForm" (ngSubmit)="submit('city')">
          <input class="control" type="text" formControlName="name" [placeholder]="i18n.t('tax.name')" />
          <input class="control" type="text" formControlName="nameEn" [placeholder]="i18n.t('tax.nameEn')" />
          <input class="control" type="text" formControlName="slug" [placeholder]="i18n.t('tax.slug')" />
          <div class="add-actions">
            @if (editingCity()) {
              <button class="btn btn--ghost btn--sm" type="button" (click)="cancel('city')">{{ 'common.cancel' | t }}</button>
            }
            <button class="btn btn--grad btn--sm" type="submit" [disabled]="cityForm.invalid">
              {{ (editingCity() ? 'common.save' : 'tax.add') | t }}
            </button>
          </div>
        </form>
      </section>

      <!-- Categories -->
      <section class="card col">
        <h2 class="sec-title">{{ 'tax.categories' | t }}</h2>
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ 'tax.name' | t }}</th>
              <th>{{ 'tax.nameEn' | t }}</th>
              <th class="actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (c of categories(); track c.id) {
              <tr>
                <td class="name">{{ c.name }}</td>
                <td class="muted">{{ c.nameEn || '—' }}</td>
                <td class="actions">
                  <button class="btn btn--ghost btn--sm" type="button" (click)="edit('category', c)">{{ 'common.edit' | t }}</button>
                  <button class="btn btn--ghost btn--sm danger" type="button" (click)="remove('category', c)">{{ 'common.delete' | t }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <form class="add" [formGroup]="categoryForm" (ngSubmit)="submit('category')">
          <input class="control" type="text" formControlName="name" [placeholder]="i18n.t('tax.name')" />
          <input class="control" type="text" formControlName="nameEn" [placeholder]="i18n.t('tax.nameEn')" />
          <input class="control" type="text" formControlName="slug" [placeholder]="i18n.t('tax.slug')" />
          <div class="add-actions">
            @if (editingCategory()) {
              <button class="btn btn--ghost btn--sm" type="button" (click)="cancel('category')">{{ 'common.cancel' | t }}</button>
            }
            <button class="btn btn--grad btn--sm" type="submit" [disabled]="categoryForm.invalid">
              {{ (editingCategory() ? 'common.save' : 'tax.add') | t }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .page-title { font-size: 24px; font-weight: 800; }
      .note { margin: 6px 0 18px; font-size: 13px; }
      .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
      @media (max-width: 880px) { .cols { grid-template-columns: 1fr; } }
      .col { padding: 20px; }
      .sec-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-3); margin-bottom: 12px; }
      .tbl { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      .tbl th, .tbl td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); font-size: 13.5px; }
      .tbl th { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-3); }
      .tbl tbody tr:last-child td { border-bottom: 0; }
      .name { font-weight: 700; }
      .actions { display: flex; gap: 4px; justify-content: flex-end; }
      .danger { color: var(--danger); }
      .add { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 14px; border-top: 1.5px dashed var(--line-2); }
      .add-actions { grid-column: 1 / -1; display: flex; gap: 8px; justify-content: flex-end; }
    `,
  ],
})
export class TaxonomyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminApi);
  private readonly reference = inject(ReferenceApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  readonly cities = signal<City[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly editingCity = signal<string | null>(null);
  readonly editingCategory = signal<string | null>(null);

  readonly cityForm = this.fb.group({
    name: ['', Validators.required],
    nameEn: [''],
    slug: [''],
  });
  readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
    nameEn: [''],
    slug: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.reference.getCities().subscribe((c) => this.cities.set(c));
    this.reference.getCategories().subscribe((c) => this.categories.set(c));
  }

  private formOf(kind: Kind) {
    return kind === 'city' ? this.cityForm : this.categoryForm;
  }
  private editingOf(kind: Kind) {
    return kind === 'city' ? this.editingCity : this.editingCategory;
  }

  edit(kind: Kind, item: City | Category): void {
    this.editingOf(kind).set(item.id);
    this.formOf(kind).patchValue({ name: item.name, nameEn: item.nameEn ?? '', slug: item.slug });
  }

  cancel(kind: Kind): void {
    this.editingOf(kind).set(null);
    this.formOf(kind).reset({ name: '', nameEn: '', slug: '' });
  }

  submit(kind: Kind): void {
    const form = this.formOf(kind);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const v = form.getRawValue();
    const payload: TaxonomyWritePayload = {
      name: v.name ?? '',
      nameEn: v.nameEn?.trim() ? v.nameEn.trim() : null,
      slug: v.slug?.trim() ? v.slug.trim() : undefined,
    };
    const id = this.editingOf(kind)();
    const toastKey = kind === 'city' ? 'tax.savedCity' : 'tax.savedCategory';

    const request$ =
      kind === 'city'
        ? id
          ? this.admin.updateCity(id, payload)
          : this.admin.createCity(payload)
        : id
          ? this.admin.updateCategory(id, payload)
          : this.admin.createCategory(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(this.i18n.t(toastKey));
        this.cancel(kind);
        this.reload();
      },
    });
  }

  async remove(kind: Kind, item: City | Category): Promise<void> {
    const res = await this.confirm.ask({
      message: this.i18n.t('tax.deleteConfirm'),
      danger: true,
      confirmLabel: this.i18n.t('common.delete'),
    });
    if (!res.ok) return;
    const request$ = kind === 'city' ? this.admin.deleteCity(item.id) : this.admin.deleteCategory(item.id);
    request$.subscribe({
      next: () => {
        this.toast.success(this.i18n.t('tax.deleted'));
        this.reload();
      },
    });
  }
}

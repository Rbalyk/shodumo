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
  templateUrl: './taxonomy.component.html',
  styleUrl: './taxonomy.component.scss',
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

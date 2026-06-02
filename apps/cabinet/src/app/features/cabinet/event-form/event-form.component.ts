import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EventsApi } from '../../../core/api/events.api';
import { ReferenceApi } from '../../../core/api/reference.api';
import { MediaApi } from '../../../core/api/media.api';
import { CabinetEventsStore } from '../cabinet-events.store';
import { Category, City, EventModel, EventWritePayload } from '../../../core/models';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import { MapPickerComponent, LatLng } from '../../../shared/maps/map-picker.component';

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink, TranslatePipe, StatePanelComponent, MapPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventsApi);
  private readonly reference = inject(ReferenceApi);
  private readonly media = inject(MediaApi);
  private readonly store = inject(CabinetEventsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  /** Route param (events/:id/edit) bound via withComponentInputBinding. */
  readonly id = input<string>();

  readonly cities = signal<City[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly status = signal<EventModel['status'] | null>(null);

  readonly isEdit = computed(() => !!this.id());

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    titleEn: [''],
    categoryId: ['', Validators.required],
    cityId: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    descriptionEn: [''],
    startsAt: ['', Validators.required],
    address: [''],
    lat: this.fb.control<number | null>(null),
    lng: this.fb.control<number | null>(null),
    coverImage: [''],
    isPaid: [false],
    price: this.fb.control<number | null>(null),
  });

  // live preview helpers
  readonly preview = computed(() => this.form.getRawValue());
  readonly cityName = computed(() => this.cities().find((c) => c.id === this.form.controls.cityId.value)?.name ?? '');
  readonly categoryName = computed(
    () => this.categories().find((c) => c.id === this.form.controls.categoryId.value)?.name ?? '',
  );

  ngOnInit(): void {
    // keep price validity in sync with the isPaid toggle
    this.form.controls.isPaid.valueChanges.subscribe((paid) => this.applyPriceValidators(!!paid));

    this.reference.getCities().subscribe((c) => this.cities.set(c));
    this.reference.getCategories().subscribe((c) => this.categories.set(c));

    const id = this.id();
    if (!id) {
      this.loading.set(false);
      return;
    }
    // load the event to edit from the organizer's own list (includes raw EN fields)
    this.api.myEvents().subscribe({
      next: (events) => {
        const event = events.find((e) => e.id === id);
        if (event) this.patchFrom(event);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applyPriceValidators(paid: boolean): void {
    const price = this.form.controls.price;
    price.setValidators(paid ? [Validators.required, Validators.min(0)] : []);
    if (!paid) price.setValue(null);
    price.updateValueAndValidity();
  }

  private patchFrom(e: EventModel): void {
    this.status.set(e.status);
    this.form.patchValue({
      title: e.title,
      titleEn: e.titleEn ?? '',
      categoryId: e.categoryId ?? e.category?.id ?? '',
      cityId: e.cityId ?? e.city?.id ?? '',
      description: e.description,
      descriptionEn: e.descriptionEn ?? '',
      startsAt: toLocalInput(e.startsAt),
      address: e.address ?? '',
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      coverImage: e.coverImage ?? '',
      isPaid: e.isPaid,
      price: e.price != null ? Number(e.price) : null,
    });
  }

  onPoint(point: LatLng): void {
    this.form.patchValue({ lat: point.lat, lng: point.lng });
  }

  onFile(fileList: FileList | null): void {
    const file = fileList?.[0];
    if (!file) return;
    const id = this.id();
    if (!id) {
      this.toast.info('Завантаження обкладинки доступне після першого збереження події');
      return;
    }
    this.media.upload(id, file.name, 0).subscribe({
      next: (m) => {
        this.form.patchValue({ coverImage: m.url });
        this.toast.success(this.i18n.t('form.saved'));
      },
    });
  }

  private buildPayload(): EventWritePayload {
    const v = this.form.getRawValue();
    return {
      title: v.title ?? '',
      titleEn: v.titleEn?.trim() ? v.titleEn.trim() : null,
      description: v.description ?? '',
      descriptionEn: v.descriptionEn?.trim() ? v.descriptionEn.trim() : null,
      cityId: v.cityId ?? '',
      categoryId: v.categoryId ?? '',
      startsAt: new Date(v.startsAt ?? '').toISOString(),
      address: v.address?.trim() ? v.address.trim() : null,
      lat: v.lat,
      lng: v.lng,
      coverImage: v.coverImage?.trim() ? v.coverImage.trim() : null,
      isPaid: !!v.isPaid,
      price: v.isPaid ? v.price : null,
    };
  }

  save(submit: boolean): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const payload = this.buildPayload();
    const id = this.id();
    const request$ = id ? this.api.update(id, payload) : this.api.create(payload);

    request$.subscribe({
      next: () => {
        this.store.load(true);
        this.toast.success(this.i18n.t(submit ? 'form.submitted' : 'form.saved'));
        void this.router.navigate(['/cabinet/events']);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (err.status === 400) this.form.markAllAsTouched();
      },
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }
}

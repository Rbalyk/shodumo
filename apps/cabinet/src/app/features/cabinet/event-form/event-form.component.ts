import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { debounceTime, map } from 'rxjs';
import { EventsApi } from '../../../core/api/events.api';
import { ReferenceApi } from '../../../core/api/reference.api';
import { MediaApi } from '../../../core/api/media.api';
import { CabinetEventsStore } from '../cabinet-events.store';
import { Category, City, EventModel, EventWritePayload } from '../../../core/models';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import { MapPickerComponent, LatLng, PickedPoint } from '../../../shared/maps/map-picker.component';
import { MapLoaderService } from '../../../shared/maps/map-loader.service';
import { cityCoords } from '../../../shared/maps/city-coords';
import { fadeIn } from '../../../shared/animations';

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
  imports: [
    ReactiveFormsModule,
    DatePipe,
    RouterLink,
    TranslatePipe,
    StatePanelComponent,
    MapPickerComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
  animations: [fadeIn],
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventsApi);
  private readonly reference = inject(ReferenceApi);
  private readonly media = inject(MediaApi);
  private readonly store = inject(CabinetEventsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapLoader = inject(MapLoaderService);
  readonly i18n = inject(I18nService);

  /** Route param (events/:id/edit) bound via withComponentInputBinding. */
  readonly id = input<string>();

  /** Address <input> host for Google Places Autocomplete (§5). */
  readonly addressInput = viewChild<ElementRef<HTMLInputElement>>('addressInput');

  readonly cities = signal<City[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly status = signal<EventModel['status'] | null>(null);

  /** Pan the map to this point on city change, without dropping a marker (§6). */
  readonly mapRecenter = signal<LatLng | null>(null);

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

  /** Debounced snapshot driving the live preview (§4). */
  readonly preview = toSignal(
    this.form.valueChanges.pipe(
      debounceTime(180),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  readonly cityName = computed(
    () => this.cities().find((c) => c.id === this.preview().cityId)?.name ?? '',
  );
  readonly categoryName = computed(
    () => this.categories().find((c) => c.id === this.preview().categoryId)?.name ?? '',
  );

  constructor() {
    // Wire up Places Autocomplete once the input exists and the Maps API is ready (§5).
    effect((onCleanup) => {
      const host = this.addressInput()?.nativeElement;
      if (!host) return;
      let autocomplete: google.maps.places.Autocomplete | null = null;
      let listener: google.maps.MapsEventListener | null = null;

      void this.mapLoader.load().then((ok) => {
        if (!ok || typeof google === 'undefined' || !google.maps.places) return;
        autocomplete = new google.maps.places.Autocomplete(host, {
          fields: ['geometry', 'formatted_address', 'name'],
          componentRestrictions: { country: 'ua' },
        });
        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace();
          const loc = place.geometry?.location;
          this.zone.run(() => {
            this.form.patchValue({
              address: place.formatted_address ?? place.name ?? this.form.controls.address.value,
              ...(loc ? { lat: loc.lat(), lng: loc.lng() } : {}),
            });
          });
        });
      });

      onCleanup(() => listener?.remove());
    });
  }

  ngOnInit(): void {
    // keep price validity in sync with the isPaid toggle
    this.form.controls.isPaid.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paid) => this.applyPriceValidators(!!paid));

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

  /** City select changed → recenter the map to the city's coords (§6). */
  onCityChange(cityId: string): void {
    const city = this.cities().find((c) => c.id === cityId);
    const coords = cityCoords(city?.slug);
    if (coords) this.mapRecenter.set(coords);
  }

  /** Map pick/drag → sync coordinates and, when reverse-geocoded, the address (§5). */
  onPoint(point: PickedPoint): void {
    this.form.patchValue({
      lat: point.lat,
      lng: point.lng,
      ...(point.address ? { address: point.address } : {}),
    });
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
}

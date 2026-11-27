import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import type { BookingResponse } from '../../../../shared/api-types';
import { activeServices, CATEGORIES, findService, formatPrice } from '../../../../shared/catalog';
import { bookableDates, formatTime } from '../../../../shared/slots';
import { EMAIL_PATTERN, isValidPhone, LIMITS } from '../../../../shared/validation';
import { BookingApi, submitError, type SubmitError } from '../../core/api/booking.api';
import { I18n } from '../../core/i18n/i18n.service';
import { uuid } from '../../core/uuid';

type Step = 1 | 2 | 3 | 4;
type TimesState = 'idle' | 'loading' | 'ready' | 'error';
type Field = 'name' | 'email' | 'phone' | 'note' | 'privacyAck';

/** Field ids in screen order, used to focus the first invalid one. */
const FIELD_ORDER: readonly Field[] = ['name', 'email', 'phone', 'note', 'privacyAck'];

/** Like Validators.required, but spaces alone count as empty. */
const requiredText = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() ? null : { required: true };

/** Empty is left to requiredText, so only one message shows. */
const phoneValidator = (control: AbstractControl<string>): ValidationErrors | null =>
  !control.value.trim() || isValidPhone(control.value) ? null : { phone: true };

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class BookingPage {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(BookingApi);

  protected readonly formatTime = formatTime;
  protected readonly limits = LIMITS;
  protected readonly stepNumbers = [1, 2, 3, 4] as const;
  protected readonly groups = CATEGORIES.map((category) => ({
    category,
    services: activeServices(category.id),
  })).filter((group) => group.services.length);

  protected readonly step = signal<Step>(1);
  protected readonly serviceId = signal('');
  protected readonly date = signal('');
  protected readonly startMin = signal<number | null>(null);
  /** Filled in the browser only: "today" must not be frozen into the prerendered page. */
  protected readonly dates = signal<string[]>([]);
  protected readonly starts = signal<number[]>([]);
  protected readonly timesState = signal<TimesState>('idle');
  protected readonly sending = signal(false);
  protected readonly error = signal<SubmitError | null>(null);
  protected readonly result = signal<BookingResponse | null>(null);

  protected readonly service = computed(() => findService(this.serviceId()));
  protected readonly summary = computed(() => {
    const service = this.service();
    if (!service) return [];
    const t = this.i18n.t();
    const date = this.date();
    const start = this.startMin();
    return [
      { label: t.booking.service, value: this.i18n.pick(service.name) },
      { label: t.booking.duration, value: `${service.durationMin} ${t.common.minutes}` },
      { label: t.booking.price, value: formatPrice(service.priceCents, this.i18n.lang()) },
      ...(date ? [{ label: t.booking.date, value: this.longDate(date) }] : []),
      ...(start !== null ? [{ label: t.booking.time, value: formatTime(start) }] : []),
    ];
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      [
        requiredText,
        Validators.pattern(`\\s*\\S[\\s\\S]{${LIMITS.nameMin - 2},}\\S\\s*`),
        Validators.maxLength(LIMITS.nameMax),
      ],
    ],
    email: [
      '',
      [
        requiredText,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(LIMITS.emailMax),
      ],
    ],
    phone: ['', [requiredText, phoneValidator]],
    note: ['', [Validators.maxLength(LIMITS.noteMax)]],
    privacyAck: [false, [Validators.requiredTrue]],
    website: [''],
  });

  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private timesRequest?: Subscription;
  private attempt = { fingerprint: '', key: '' };

  constructor() {
    const route = inject(ActivatedRoute);
    inject(DestroyRef).onDestroy(() => this.timesRequest?.unsubscribe());
    afterNextRender(() => {
      this.dates.set(bookableDates(new Date()));
      const preselected = route.snapshot.queryParamMap.get('service');
      if (preselected && findService(preselected)) this.selectService(preselected);
    });
  }

  protected price(cents: number): string {
    return formatPrice(cents, this.i18n.lang());
  }

  protected longDate(date: string): string {
    return this.i18n.formatDate(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected selectService(id: string): void {
    if (id !== this.serviceId()) {
      this.serviceId.set(id);
      this.date.set('');
      this.startMin.set(null);
      this.timesState.set('idle');
    }
    this.goTo(2);
  }

  protected selectDate(date: string): void {
    this.date.set(date);
    this.startMin.set(null);
    this.error.set(null);
    this.loadTimes();
  }

  protected loadTimes(): void {
    // Cancelling the previous request stops a slow reply from overwriting a newer date.
    this.timesRequest?.unsubscribe();
    this.timesState.set('loading');
    this.timesRequest = this.api.availability(this.serviceId(), this.date()).subscribe({
      next: ({ starts }) => {
        this.starts.set(starts);
        this.timesState.set('ready');
      },
      error: () => this.timesState.set('error'),
    });
  }

  protected selectTime(start: number): void {
    this.startMin.set(start);
    this.error.set(null);
  }

  protected goTo(step: Step): void {
    this.step.set(step);
    // Move focus to the new step so keyboard and screen-reader users follow along.
    setTimeout(() => this.heading()?.nativeElement.focus());
  }

  protected submitDetails(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.goTo(4);
      return;
    }
    // Take the user straight to the first field that needs fixing.
    const first = FIELD_ORDER.find((field) => this.form.controls[field].invalid);
    if (first) setTimeout(() => document.getElementById(first)?.focus());
  }

  protected invalid(field: Field): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  /** "Empty" and "wrong format" get different messages. */
  protected errorText(field: 'name' | 'email' | 'phone'): string {
    const errors = this.i18n.t().booking.errors;
    if (this.form.controls[field].hasError('required')) {
      return { name: errors.nameRequired, email: errors.emailRequired, phone: errors.phoneRequired }[
        field
      ];
    }
    return errors[field];
  }

  protected confirm(): void {
    const start = this.startMin();
    if (this.sending() || start === null || this.form.invalid) return;
    this.sending.set(true);
    this.error.set(null);

    const { name, email, phone, note, website } = this.form.getRawValue();
    const details = {
      serviceId: this.serviceId(),
      date: this.date(),
      startMin: start,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      note: note.trim() || undefined,
    };
    // Same details, same key: retrying after a lost reply cannot create a second booking.
    const fingerprint = JSON.stringify(details);
    if (fingerprint !== this.attempt.fingerprint) this.attempt = { fingerprint, key: uuid() };

    this.api
      .book({
        ...details,
        lang: this.i18n.lang(),
        privacyAck: true,
        idempotencyKey: this.attempt.key,
        website,
      })
      .subscribe({
        next: (result) => {
          this.sending.set(false);
          this.result.set(result);
          setTimeout(() => this.heading()?.nativeElement.focus());
        },
        error: (failure: unknown) => {
          this.sending.set(false);
          const code = submitError(failure);
          this.error.set(code);
          if (code === 'SLOT_TAKEN') {
            // Keep the typed details and ask only for a new time.
            this.startMin.set(null);
            this.loadTimes();
            this.goTo(2);
          }
        },
      });
  }

  protected startOver(): void {
    this.result.set(null);
    this.error.set(null);
    this.form.reset();
    this.attempt = { fingerprint: '', key: '' };
    this.serviceId.set('');
    this.date.set('');
    this.startMin.set(null);
    this.timesState.set('idle');
    this.goTo(1);
  }
}

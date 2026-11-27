import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';
import type {
  ApiError,
  AvailabilityResponse,
  BookingRequest,
  BookingResponse,
} from '../../../../shared/api-types';

const TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly http = inject(HttpClient);

  availability(serviceId: string, date: string) {
    return this.http
      .get<AvailabilityResponse>('/api/availability', { params: { serviceId, date } })
      .pipe(timeout(TIMEOUT_MS));
  }

  book(request: BookingRequest) {
    return this.http.post<BookingResponse>('/api/bookings', request).pipe(timeout(TIMEOUT_MS));
  }
}

export type SubmitError = 'SLOT_TAKEN' | 'LIMIT_REACHED' | 'INVALID' | 'SERVER_ERROR';

export function submitError(error: unknown): SubmitError {
  const code = error instanceof HttpErrorResponse ? (error.error as ApiError | null)?.error : null;
  return code === 'SLOT_TAKEN' || code === 'LIMIT_REACHED' || code === 'INVALID'
    ? code
    : 'SERVER_ERROR';
}

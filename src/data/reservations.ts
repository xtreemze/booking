import type { Guest, Reservation, ReservationStatus } from '../domain/types';

const STORAGE_KEY = 'booking.reservations.v1';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStatus(value: unknown): value is ReservationStatus {
  return value === 'confirmed' || value === 'pending' || value === 'cancelled';
}

function isGuest(value: unknown): value is Guest {
  if (!value || typeof value !== 'object') return false;
  const guest = value as Record<string, unknown>;
  return isString(guest.name) && isString(guest.email) && isString(guest.phone) && isString(guest.notes);
}

function isReservation(value: unknown): value is Reservation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    isString(item.id) &&
    isString(item.businessId) &&
    isString(item.serviceId) &&
    isString(item.resourceId) &&
    isString(item.start) &&
    isString(item.end) &&
    typeof item.partySize === 'number' &&
    Number.isInteger(item.partySize) &&
    item.partySize > 0 &&
    isStatus(item.status) &&
    isGuest(item.guest) &&
    isString(item.createdAt)
  );
}

export function loadReservations(): readonly Reservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReservation);
  } catch {
    return [];
  }
}

export function persistReservations(reservations: readonly Reservation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

export function createReservationId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

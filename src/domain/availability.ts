import type {
  AvailabilityRequest,
  AvailableSlot,
  BusinessConfig,
  Reservation,
  Resource,
  Service,
  TimeWindow,
} from './types';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid time: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid time: ${value}`);
  return hour * 60 + minute;
}

function atLocalTime(date: string, minutes: number): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(year, month - 1, day, 0, minutes, 0, 0);
  if (Number.isNaN(result.getTime())) throw new Error(`Invalid date: ${date}`);
  return result;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function fitsAnyWindow(start: Date, end: Date, windows: readonly TimeWindow[], date: string): boolean {
  return windows.some((window) => {
    const open = atLocalTime(date, timeToMinutes(window.start));
    const close = atLocalTime(date, timeToMinutes(window.end));
    return start >= open && end <= close;
  });
}

function effectiveReservationInterval(
  reservation: Reservation,
  services: readonly Service[],
): readonly [Date, Date] {
  const bookedService = services.find((service) => service.id === reservation.serviceId);
  const before = bookedService?.bufferBeforeMinutes ?? 0;
  const after = bookedService?.bufferAfterMinutes ?? 0;
  return [
    new Date(new Date(reservation.start).getTime() - before * MINUTE),
    new Date(new Date(reservation.end).getTime() + after * MINUTE),
  ];
}

function remainingCapacity(
  resource: Resource,
  start: Date,
  end: Date,
  business: BusinessConfig,
  reservations: readonly Reservation[],
): number {
  const collisions = reservations.filter((reservation) => {
    if (reservation.status === 'cancelled' || reservation.resourceId !== resource.id) return false;
    const [bookedStart, bookedEnd] = effectiveReservationInterval(reservation, business.services);
    return overlaps(start, end, bookedStart, bookedEnd);
  });

  if (resource.sharing === 'exclusive') return collisions.length === 0 ? resource.capacity : 0;
  const occupied = collisions.reduce((sum, reservation) => sum + reservation.partySize, 0);
  return Math.max(0, resource.capacity - occupied);
}

function candidateStarts(request: AvailabilityRequest): readonly Date[] {
  const { business, service, date } = request;
  const weekday = atLocalTime(date, 12 * 60).getDay();
  const windows = business.hours[weekday] ?? [];

  if (service.startTimes?.length) {
    return service.startTimes.map((time) => atLocalTime(date, timeToMinutes(time)));
  }

  const starts: Date[] = [];
  for (const window of windows) {
    const open = timeToMinutes(window.start);
    const close = timeToMinutes(window.end);
    for (let minute = open; minute < close; minute += business.policy.slotStepMinutes) {
      starts.push(atLocalTime(date, minute));
    }
  }
  return starts;
}

export function findAvailability(
  request: AvailabilityRequest,
  reservations: readonly Reservation[],
): readonly AvailableSlot[] {
  const { business, service, date, partySize } = request;
  if (partySize < 1 || partySize > service.maxPartySize) return [];

  const now = request.now ?? new Date();
  const duration = request.durationMinutes ?? service.durationMinutes;
  const horizon = new Date(now.getTime() + business.policy.bookingHorizonDays * DAY);
  const minimumStart = new Date(now.getTime() + business.policy.minimumNoticeMinutes * MINUTE);
  const weekday = atLocalTime(date, 12 * 60).getDay();
  const businessWindows = business.hours[weekday] ?? [];
  const resources = business.resources.filter(
    (resource) =>
      resource.serviceIds.includes(service.id) &&
      service.resourceKinds.includes(resource.kind) &&
      resource.capacity >= partySize,
  );

  const slots: AvailableSlot[] = [];
  for (const start of candidateStarts(request)) {
    const end = new Date(start.getTime() + duration * MINUTE);
    const blockedStart = new Date(start.getTime() - service.bufferBeforeMinutes * MINUTE);
    const blockedEnd = new Date(end.getTime() + service.bufferAfterMinutes * MINUTE);

    if (start < minimumStart || start > horizon) continue;
    if (service.mode !== 'stay' && !fitsAnyWindow(start, blockedEnd, businessWindows, date)) continue;

    for (const resource of resources) {
      const resourceWindows = resource.availability?.[weekday];
      if (resourceWindows && !fitsAnyWindow(start, blockedEnd, resourceWindows, date)) continue;

      const remaining = remainingCapacity(resource, blockedStart, blockedEnd, business, reservations);
      if (remaining < partySize) continue;

      slots.push({ start, end, resourceId: resource.id, remainingCapacity: remaining });
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime() || b.remainingCapacity - a.remainingCapacity);
}

export function formatMoney(cents: number, currency: string): string {
  if (cents === 0) return 'No prepayment';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export function formatSlot(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

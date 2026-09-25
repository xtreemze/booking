import { businesses } from '../domain/presets';
import type {
  BusinessConfig,
  DeliveryMode,
  Guest,
  Reservation,
  ReservationStatus,
  Service,
} from '../domain/types';

const STORAGE_KEY = 'booking.reservations.v2';
const STORAGE_VERSION = 2;
const EXAMPLE_PREFIX = 'example:';

export const VISITOR_CUSTOMER_ID = 'visitor-demo';

export interface ReservationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ReservationStore {
  load(): readonly Reservation[];
  save(reservations: readonly Reservation[]): void;
  reset(): readonly Reservation[];
}

interface StoredReservations {
  readonly version: number;
  readonly seededOn: string;
  readonly reservations: readonly Reservation[];
}

interface ExampleSpec {
  readonly id: string;
  readonly businessId: string;
  readonly serviceId: string;
  readonly resourceId: string;
  readonly dayOffset: number;
  readonly partySize: number;
  readonly customerId?: string;
  readonly deliveryMode?: DeliveryMode;
  readonly intake?: Readonly<Record<string, string>>;
}

const exampleSpecs: readonly ExampleSpec[] = [
  {
    id: 'example:barber',
    businessId: 'barber-demo',
    serviceId: 'haircut',
    resourceId: 'maya',
    dayOffset: 1,
    partySize: 1,
  },
  {
    id: 'example:restaurant',
    businessId: 'restaurant-demo',
    serviceId: 'dinner',
    resourceId: 'table-4a',
    dayOffset: 2,
    partySize: 3,
  },
  {
    id: 'example:studio',
    businessId: 'studio-demo',
    serviceId: 'mobility-class',
    resourceId: 'studio-a',
    dayOffset: 3,
    partySize: 2,
  },
  {
    id: 'example:visitor',
    businessId: 'interior-demo',
    serviceId: 'design-consultation',
    resourceId: 'designer-elias',
    dayOffset: 4,
    partySize: 1,
    customerId: VISITOR_CUSTOMER_ID,
    deliveryMode: 'customer',
    intake: {
      'project-type': 'Single room',
      'project-location': 'Client home',
      'design-goals': 'Improve the living-room layout, lighting and listening area.',
    },
  },
  {
    id: 'example:legal',
    businessId: 'legal-demo',
    serviceId: 'legal-consultation',
    resourceId: 'counsel-freja',
    dayOffset: 5,
    partySize: 1,
    deliveryMode: 'virtual',
    intake: {
      'matter-type': 'Contract',
      'matter-summary': 'Initial review of a service agreement.',
    },
  },
];

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStatus(value: unknown): value is ReservationStatus {
  return value === 'confirmed' || value === 'pending' || value === 'cancelled';
}

function isDeliveryMode(value: unknown): value is DeliveryMode {
  return value === 'business' || value === 'customer' || value === 'virtual';
}

function isGuest(value: unknown): value is Guest {
  if (!value || typeof value !== 'object') return false;
  const guest = value as Record<string, unknown>;
  return (
    isString(guest['name']) &&
    isString(guest['email']) &&
    isString(guest['phone']) &&
    isString(guest['notes'])
  );
}

function isIntake(value: unknown): value is Readonly<Record<string, string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isString);
}

function isReservation(value: unknown): value is Reservation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    isString(item['id']) &&
    isString(item['businessId']) &&
    isString(item['serviceId']) &&
    isString(item['resourceId']) &&
    isString(item['start']) &&
    isString(item['end']) &&
    typeof item['partySize'] === 'number' &&
    Number.isInteger(item['partySize']) &&
    item['partySize'] > 0 &&
    isStatus(item['status']) &&
    isGuest(item['guest']) &&
    isString(item['createdAt']) &&
    (item['customerId'] === undefined || isString(item['customerId'])) &&
    (item['deliveryMode'] === undefined || isDeliveryMode(item['deliveryMode'])) &&
    (item['intake'] === undefined || isIntake(item['intake']))
  );
}

function isStoredReservations(value: unknown): value is StoredReservations {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  return (
    envelope['version'] === STORAGE_VERSION &&
    isString(envelope['seededOn']) &&
    Array.isArray(envelope['reservations']) &&
    envelope['reservations'].every(isReservation)
  );
}

function parseMinutes(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function atMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function nextOpenDate(business: BusinessConfig, now: Date, minimumOffset: number): Date {
  for (let offset = minimumOffset; offset < minimumOffset + 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(12, 0, 0, 0);
    if ((business.hours[candidate.getDay()] ?? []).length > 0) return candidate;
  }
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + minimumOffset);
  fallback.setHours(12, 0, 0, 0);
  return fallback;
}

function startForExample(business: BusinessConfig, service: Service, day: Date): Date {
  const windows = business.hours[day.getDay()] ?? [];
  const firstWindow = windows[0];
  if (!firstWindow) return atMinutes(day, 12 * 60);

  const open = parseMinutes(firstWindow.start);
  const close = parseMinutes(firstWindow.end);
  const preferred = service.startTimes?.[0] ? parseMinutes(service.startTimes[0]) : open + 60;
  const latestStart = Math.max(open, close - service.durationMinutes);
  return atMinutes(day, Math.min(Math.max(open, preferred), latestStart));
}

export function createExampleReservations(now = new Date()): readonly Reservation[] {
  return exampleSpecs.flatMap((spec) => {
    const business = businesses.find((item) => item.id === spec.businessId);
    const service = business?.services.find((item) => item.id === spec.serviceId);
    if (!business || !service) return [];

    const day = nextOpenDate(business, now, spec.dayOffset);
    const start = startForExample(business, service, day);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    return [{
      id: spec.id,
      businessId: business.id,
      serviceId: service.id,
      resourceId: spec.resourceId,
      start: start.toISOString(),
      end: end.toISOString(),
      partySize: spec.partySize,
      status: business.policy.requiresApproval ? 'pending' : 'confirmed',
      guest: spec.customerId === VISITOR_CUSTOMER_ID
        ? {
            name: 'Demo Visitor',
            email: 'visitor@example.com',
            phone: '',
            notes: 'Existing visitor booking seeded for the local demo.',
          }
        : {
            name: 'Example customer',
            email: 'example@example.com',
            phone: '',
            notes: 'Relative example reservation.',
          },
      createdAt: now.toISOString(),
      ...(spec.customerId ? { customerId: spec.customerId } : {}),
      ...(spec.deliveryMode ? { deliveryMode: spec.deliveryMode } : {}),
      ...(spec.intake ? { intake: spec.intake } : {}),
    } satisfies Reservation];
  });
}

export function createLocalReservationStore(
  storage: ReservationStorage,
  clock: () => Date = () => new Date(),
): ReservationStore {
  function write(reservations: readonly Reservation[], seededOn = dateInputValue(clock())): void {
    const envelope: StoredReservations = {
      version: STORAGE_VERSION,
      seededOn,
      reservations,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  function reset(): readonly Reservation[] {
    const now = clock();
    const reservations = createExampleReservations(now);
    write(reservations, dateInputValue(now));
    return reservations;
  }

  return {
    load(): readonly Reservation[] {
      const now = clock();
      const today = dateInputValue(now);

      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return reset();

        const parsed: unknown = JSON.parse(raw);
        if (!isStoredReservations(parsed)) return reset();

        if (parsed.seededOn !== today) {
          const userReservations = parsed.reservations.filter(
            (reservation) => !reservation.id.startsWith(EXAMPLE_PREFIX),
          );
          const reservations = [...createExampleReservations(now), ...userReservations];
          write(reservations, today);
          return reservations;
        }

        return parsed.reservations;
      } catch {
        return reset();
      }
    },

    save(reservations: readonly Reservation[]): void {
      write(reservations);
    },

    reset,
  };
}

function createMemoryStorage(): ReservationStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export function createBrowserReservationStore(): ReservationStore {
  if (typeof window === 'undefined') return createLocalReservationStore(createMemoryStorage());
  return createLocalReservationStore(window.localStorage);
}

export function createReservationId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

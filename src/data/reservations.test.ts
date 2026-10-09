import { describe, expect, it } from 'vitest';
import type { Reservation } from '../domain/types';
import {
  createExampleReservations,
  createLocalReservationStore,
  type ReservationStorage,
  VISITOR_CUSTOMER_ID,
} from './reservations';

function memoryStorage(): ReservationStorage {
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

describe('relative local demo reservations', () => {
  it('creates exactly one existing visitor booking and keeps all examples relative to the supplied day', () => {
    const firstDay = new Date(2026, 0, 5, 9, 0, 0);
    const laterDay = new Date(2026, 0, 12, 9, 0, 0);

    const first = createExampleReservations(firstDay);
    const later = createExampleReservations(laterDay);

    expect(first).toHaveLength(5);
    expect(first.filter((reservation) => reservation.customerId === VISITOR_CUSTOMER_ID)).toHaveLength(1);
    expect(first.every((reservation) => new Date(reservation.start) > firstDay)).toBe(true);
    expect(later.every((reservation) => new Date(reservation.start) > laterDay)).toBe(true);
    expect(later[0]?.start).not.toBe(first[0]?.start);
  });

  it('migrates legacy local reservations into the async provider', async () => {
    const storage = memoryStorage();
    const now = new Date(2026, 0, 5, 9, 0, 0);
    const seed = createExampleReservations(now)[0];
    expect(seed).toBeDefined();
    const legacyReservation: Reservation = {
      ...(seed as Reservation),
      id: 'legacy-user-reservation',
    };

    storage.setItem('booking.reservations.v1', JSON.stringify([legacyReservation]));
    const store = createLocalReservationStore(storage, () => now);
    const migrated = await store.load();

    expect(migrated.some((reservation) => reservation.id === legacyReservation.id)).toBe(true);
    expect(migrated.filter((reservation) => reservation.id.startsWith('example:'))).toHaveLength(5);
    expect(storage.getItem('booking.reservations.v1')).toBeNull();
  });

  it('rebases seeded examples on a new day while preserving visitor-created local bookings', async () => {
    const storage = memoryStorage();
    let now = new Date(2026, 0, 5, 9, 0, 0);
    const store = createLocalReservationStore(storage, () => now);
    const seeded = await store.load();
    const originalExampleStart = seeded[0]?.start;

    const visitorSeed = seeded.find((reservation) => reservation.customerId === VISITOR_CUSTOMER_ID);
    expect(visitorSeed).toBeDefined();

    const userReservation: Reservation = {
      ...(visitorSeed as Reservation),
      id: 'user-created-reservation',
      createdAt: now.toISOString(),
    };
    await store.save([...seeded, userReservation]);

    now = new Date(2026, 0, 6, 9, 0, 0);
    const rebased = await store.load();

    expect(rebased).toHaveLength(seeded.length + 1);
    expect(rebased.find((reservation) => reservation.id === userReservation.id)).toEqual(userReservation);
    expect(rebased.find((reservation) => reservation.id === seeded[0]?.id)?.start).not.toBe(
      originalExampleStart,
    );
  });
});

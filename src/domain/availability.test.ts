import { describe, expect, it } from 'vitest';
import { findAvailability } from './availability';
import type { BusinessConfig, Reservation, ResourceSharing } from './types';

function makeBusiness(sharing: ResourceSharing, capacity: number): BusinessConfig {
  const open = [{ start: '09:00', end: '12:00' }] as const;
  return {
    id: 'test-business',
    preset: 'studio',
    name: 'Test',
    tagline: 'Test',
    timezone: 'UTC',
    currency: 'EUR',
    hours: { 0: open, 1: open, 2: open, 3: open, 4: open, 5: open, 6: open },
    policy: {
      slotStepMinutes: 30,
      minimumNoticeMinutes: 0,
      bookingHorizonDays: 90,
      cancellationNoticeMinutes: 60,
      requiresApproval: false,
      depositsEnabled: false,
      depositPercent: 0,
    },
    services: [{
      id: 'service',
      name: 'Service',
      description: 'Test service',
      mode: 'capacity',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceCents: 1000,
      maxPartySize: 8,
      resourceKinds: ['space'],
    }],
    resources: [{
      id: 'resource',
      name: 'Resource',
      kind: 'space',
      sharing,
      capacity,
      serviceIds: ['service'],
    }],
  };
}

function reservation(partySize: number): Reservation {
  return {
    id: 'existing',
    businessId: 'test-business',
    serviceId: 'service',
    resourceId: 'resource',
    start: new Date(2026, 9, 5, 9, 0).toISOString(),
    end: new Date(2026, 9, 5, 9, 30).toISOString(),
    partySize,
    status: 'confirmed',
    guest: { name: 'Guest', email: 'g@example.com', phone: '', notes: '' },
    createdAt: new Date(2026, 9, 1).toISOString(),
  };
}

const now = new Date(2026, 9, 4, 8, 0);

function requestFor(business: BusinessConfig, partySize: number) {
  const service = business.services[0];
  if (!service) throw new Error('missing test service');
  return { business, service, date: '2026-10-05', partySize, now } as const;
}

describe('findAvailability', () => {
  it('prevents overlaps on an exclusive resource and respects cleanup buffers', () => {
    const business = makeBusiness('exclusive', 1);
    const slots = findAvailability(requestFor(business, 1), [reservation(1)]);
    const times = slots.map((slot) => slot.start.getHours() * 60 + slot.start.getMinutes());

    expect(times).not.toContain(9 * 60);
    expect(times).not.toContain(9 * 60 + 30);
    expect(times).toContain(10 * 60);
  });

  it('subtracts occupancy for pooled capacity', () => {
    const business = makeBusiness('pooled', 4);
    const crowded = findAvailability(requestFor(business, 2), [reservation(3)]);
    const single = findAvailability(requestFor(business, 1), [reservation(3)]);

    expect(crowded.some((slot) => slot.start.getHours() === 9)).toBe(false);
    expect(single.find((slot) => slot.start.getHours() === 9)?.remainingCapacity).toBe(1);
  });

  it('ignores cancelled reservations', () => {
    const business = makeBusiness('exclusive', 1);
    const cancelled = { ...reservation(1), status: 'cancelled' as const };
    const slots = findAvailability(requestFor(business, 1), [cancelled]);

    expect(slots.some((slot) => slot.start.getHours() === 9 && slot.start.getMinutes() === 0)).toBe(true);
  });
});

# Booking

A configurable reservation system for businesses that sell time, access, space, or capacity.

The project avoids building separate products for barbers, clinics, restaurants, hotels, classes, and rentals. Instead, those businesses are configurations of the same scheduling primitives: **services**, **resources**, **capacity**, **availability**, and **booking policy**.

## What works now

The first MVP is a responsive React application with five live presets:

- **Barber** — staff-bound appointments with cleanup buffers.
- **Clinic** — staff appointments that can require approval before confirmation.
- **Restaurant** — party-size aware table allocation.
- **Hotel** — variable-length stays against exclusive room inventory.
- **Studio / class** — pooled capacity where multiple reservations share the same resource until capacity is exhausted.

Reservations are accepted through the UI and immediately affect subsequent availability. Demo data persists in the browser so the app can be exercised without infrastructure.

## Scheduling model

The important abstraction is the resource, not the industry.

```text
Business
  ├─ policies (notice, horizon, approval, deposits, slot step)
  ├─ services (duration, buffers, price, party size, booking mode)
  └─ resources
       ├─ exclusive → barber, doctor, table, hotel room, equipment
       └─ pooled    → class, tour, workshop, shared capacity
```

Availability is calculated from business hours, service rules, resource capabilities, existing reservations, buffers, minimum notice, booking horizon, party size, and exclusive/pooled capacity semantics.

See [`docs/architecture.md`](docs/architecture.md) for the invariants and production backend direction.

## Development

Requires a current Node.js release.

```bash
npm install
npm run dev
```

Verification:

```bash
npm run check
```

`check` runs the pure scheduling-engine tests and a strict TypeScript production build. CI runs the same command on pull requests.

## Stack

- React 19.3
- TypeScript 7 with strict compiler options
- Vite 8
- Vitest 5
- Lucide icons
- Plain CSS with responsive and reduced-motion behavior

The application deliberately has a small dependency surface. The scheduling rules live in framework-independent TypeScript.

## Production boundary

The current persistence adapter uses `localStorage` for a zero-configuration demonstration. That is not a production multi-user reservation database.

A production deployment must replace the data adapter with a transactional API/database and revalidate capacity atomically when a reservation is committed. That prevents two customers from receiving the same resource after both viewed an available slot.

The domain model is already separated from persistence so this can be added without rewriting the booking UI or availability rules.

## Product direction

The system is intended to grow into a multi-tenant booking platform with configurable locations, resources, hours and exceptions, intake fields, waitlists, deposits/payments, reminders, calendar sync, cancellation/no-show policy, staff skill matching, resource combinations, recurring events, analytics, and embeddable/public booking surfaces.

The core rule remains the same: add capabilities to the shared reservation engine instead of adding one-off industry branches.

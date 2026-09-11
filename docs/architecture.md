# Architecture

Booking is modeled around capabilities rather than business categories. A barber, clinician, table, room, studio, piece of equipment, or virtual host is a **resource**. A haircut, consultation, dinner seating, hotel stay, or class is a **service**. A reservation consumes capacity on one resource for an interval.

## Domain invariants

- Resources declare which services they can fulfill.
- `exclusive` resources reject any overlapping reservation. This fits people, treatment rooms, tables, hotel rooms, and equipment.
- `pooled` resources allow concurrent reservations up to a numeric capacity. This fits classes, tours, workshops, coworking capacity, and similar inventory.
- Services own duration and before/after buffers.
- Businesses own booking policy: slot granularity, notice period, booking horizon, approval requirement, cancellation notice, and deposit policy.
- Availability is derived. The UI never decides whether a slot is valid.
- Reservation status is explicit (`pending`, `confirmed`, `cancelled`) so approval workflows do not require a second booking model.

## Current boundaries

The browser MVP has three deliberately separate layers:

1. `src/domain` — pure types, preset configuration and deterministic availability rules.
2. `src/data` — reservation persistence adapter. The current implementation uses `localStorage` only for a zero-infrastructure demo.
3. `src/App.tsx` — the booking and configuration-preview experience.

The production backend should implement the same persistence boundary using a transactional database. Slot confirmation must be revalidated in the same transaction that writes the reservation; client-side availability is advisory and cannot prevent races between customers.

## Production data model

A relational implementation should use tenant-scoped tables for businesses, locations, services, resources, resource-service capabilities, weekly hours, exceptions/closures, customers, reservations, reservation resources, payments, and outbound notification jobs.

For robust concurrency, reservation creation should lock or serialize the relevant resource/time range, re-run capacity checks, write the reservation, and commit atomically. PostgreSQL range types/exclusion constraints are well suited to exclusive resources; pooled capacity still requires a transactional aggregate check or capacity ledger.

## Extensibility

The domain is intended to add these without changing the core reservation vocabulary:

- multiple locations and time zones;
- staff preferences and skill matching;
- room/table combination rules;
- recurring classes and events;
- deposits, authorizations, refunds and no-show fees;
- waitlists and automatic promotion;
- intake forms and business-specific custom fields;
- calendar sync and webhooks;
- notification templates and reminder policies;
- multi-resource bookings (for example clinician + room + equipment);
- accessibility constraints and resource attributes.

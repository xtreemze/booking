# Architecture

Booking is modeled around capabilities rather than business categories. A barber, clinician, table, room, studio, piece of equipment, or virtual host is a **resource**. A haircut, consultation, dinner seating, hotel stay, or class is a **service**. A reservation consumes capacity on one resource for an interval.

## Domain invariants

- Resources declare which services they can fulfill.
- `exclusive` resources reject overlapping reservations.
- `pooled` resources allow concurrent reservations up to numeric capacity.
- Services own duration and before/after buffers.
- Businesses own booking policy: slot granularity, notice period, booking horizon, approval requirement, cancellation notice, and deposit policy.
- Availability is derived. UI layers never decide whether a slot is valid.
- Reservation status is explicit (`pending`, `confirmed`, `cancelled`).

## Application boundaries

The repository separates product-domain authority from delivery technology:

1. `packages/domain` — framework-independent types, presets, and deterministic availability rules. This is the canonical scheduling source.
2. `packages/booking-widget` — Lit custom element for portable public booking/availability surfaces.
3. `src/data` — persistence adapter. The current implementation uses `localStorage` only for a zero-infrastructure demo.
4. `src/App.tsx` — React application shell and operator/configuration preview.
5. `src/domain` — compatibility re-exports while callers migrate to `@booking/domain`.

React remains the application framework for dense operator/admin workflows. Lit is deliberately limited to the embeddable web-component boundary, where framework independence and Shadow DOM encapsulation are product capabilities.

The `<booking-widget>` element consumes the same domain package as React and emits a composed `booking-slot-selected` custom event. It does not own authoritative reservation persistence. A host application or production API must perform the reservation commit.

## Production boundary

GitHub Pages hosts the static demonstration only. It is never an authoritative reservation backend.

The production backend should implement the persistence boundary using a transactional database. Slot confirmation must be revalidated in the same transaction that writes the reservation; client-side availability is advisory and cannot prevent races between customers.

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
- multi-resource bookings;
- accessibility constraints and resource attributes.

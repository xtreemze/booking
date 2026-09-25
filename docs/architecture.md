# Architecture

Booking is modeled around capabilities rather than business categories. A barber, clinician, designer, lawyer, tutor, technician, table, room, studio, piece of equipment, or virtual host is a **resource**. A haircut, consultation, dinner seating, hotel stay, class, field visit, or design session is a **service**. A reservation consumes capacity on one resource for an interval and may also capture delivery mode and service-specific intake.

## Domain invariants

- Resources declare which services they can fulfill.
- exclusive resources reject overlapping reservations.
- pooled resources allow concurrent reservations up to numeric capacity.
- Services own duration and before/after buffers.
- Services may declare delivery modes: at the business, at the customer location, or virtual.
- Services may declare typed intake fields without changing scheduling rules.
- Businesses own booking policy: slot granularity, notice period, booking horizon, approval requirement, cancellation notice, and deposit policy.
- Availability is derived. UI layers never decide whether a slot is valid.
- Reservation status is explicit: pending, confirmed, or cancelled.

## Application boundaries

The repository separates product-domain authority from delivery technology:

1. packages/domain — framework-independent types, presets, and deterministic availability rules. This is the canonical scheduling source.
2. packages/booking-widget — Lit custom element for portable public booking/availability surfaces.
3. src/data — persistence provider boundary. The current implementation is a local ReservationStore backed by localStorage.
4. src/App.tsx — React application shell, customer booking flow, visitor booking surface and configuration preview.
5. src/domain — compatibility re-exports while callers migrate to @booking/domain.

React remains the application framework for stateful customer and operator/admin workflows. Lit is deliberately limited to the embeddable web-component boundary, where framework independence and Shadow DOM encapsulation are product capabilities.

The booking UI is mobile-first: base styles target small touch devices and progressively enhance with min-width media queries. Scheduling behavior remains independent of layout.

The <booking-widget> element consumes the same domain package as React and emits a composed booking-slot-selected custom event. It does not own authoritative reservation persistence. A host application or production API must perform the reservation commit.

## Persistence boundary

The application consumes the ReservationStore interface rather than browser storage directly.

The demo provider:

- stores reservations in localStorage;
- seeds example reservations on first use;
- generates those examples from offsets relative to the current day, never hard-coded production dates;
- re-bases only seeded example reservations when the calendar day changes;
- preserves visitor-created local reservations;
- includes one seeded booking owned by the demo visitor so the upcoming-booking UI is always testable.

A production provider can replace the local implementation without changing the domain or booking components.

GitHub Pages hosts the static demonstration only. It is never an authoritative reservation backend.

The production backend should implement the persistence boundary using a transactional database. Slot confirmation must be revalidated in the same transaction that writes the reservation; client-side availability is advisory and cannot prevent races between customers.

## Production data model

A relational implementation should use tenant-scoped tables for businesses, locations, services, resources, resource-service capabilities, service delivery modes, intake definitions, weekly hours, exceptions/closures, customers, reservations, reservation intake values, reservation resources, payments, and outbound notification jobs.

For robust concurrency, reservation creation should lock or serialize the relevant resource/time range, re-run capacity checks, write the reservation, and commit atomically. PostgreSQL range types/exclusion constraints are well suited to exclusive resources; pooled capacity still requires a transactional aggregate check or capacity ledger.

## Service commonalities

Most booking professions can be composed from the same reusable components:

- service selection and duration;
- delivery/location selection;
- provider/resource allocation;
- exclusive or pooled capacity;
- date/range and slot selection;
- service-specific intake;
- customer contact details;
- deposits and approval policy;
- reservation status and upcoming-booking display;
- persistence through a provider interface.

A new profession should normally be configuration only. New scheduling code is justified only when a service introduces a genuinely new capability.

See docs/service-models.md for the broader service catalog and component mapping.

## Extensibility

The domain is intended to add these without changing the core reservation vocabulary:

- multiple locations and time zones;
- staff preferences and skill matching;
- room/table combination rules;
- recurring classes and events;
- deposits, authorizations, refunds and no-show fees;
- waitlists and automatic promotion;
- calendar sync and webhooks;
- notification templates and reminder policies;
- multi-resource bookings;
- travel zones and route-aware field-service scheduling;
- file/document intake;
- accessibility constraints and resource attributes.

# Service models

Booking services differ mostly in configuration, not in scheduling fundamentals. The application should model those fundamentals directly and treat professions as presets composed from them.

## Common booking services

The live demo now includes these service families:

- barber and grooming appointments;
- clinic consultations and procedures;
- restaurant tables;
- hotel stays;
- classes and studios;
- interior design consultations;
- audio / AV system consultations and on-site calibration;
- legal consultations;
- tutoring;
- home-service assessments;
- photography sessions;
- beauty appointments;
- pet grooming.

The same primitives also cover common services that are not yet first-class demo presets:

- dental, physiotherapy, counseling, nutrition and wellness;
- massage, nails, tattoo and other personal care;
- accounting, tax, financial, architecture, engineering and IT consulting;
- music lessons, language lessons, career coaching and personal training;
- cleaning, plumbing, electrical, HVAC, appliance repair and home inspection;
- auto repair, tire service and detailing;
- veterinary appointments, pet sitting and training;
- recording/rehearsal rooms, equipment rental, coworking rooms and venue rental;
- tours, activities and other timed experiences.

## Shared components

These service categories reduce to a small set of composable capabilities:

1. **Service** — name, description, duration, price, buffers and booking mode.
2. **Delivery** — at the business, at the customer location, online, or a choice among them.
3. **Resource** — professional, room, table, equipment, space or virtual capacity.
4. **Availability** — weekly windows, slot interval, notice period and booking horizon.
5. **Capacity** — exclusive inventory or pooled capacity, including party size.
6. **Intake** — service-specific text/select fields such as project type, address, subject, matter type or pet details.
7. **Policy** — approval, cancellation rules, deposits and other commercial constraints.
8. **Reservation** — customer, selected service/resource, interval, status, delivery mode and intake.
9. **Visitor booking surface** — upcoming booking summary and access back into provider availability.
10. **Persistence adapter** — local demo storage now; transactional API/database later.

A profession should only require a new UI component when it introduces a genuinely new booking capability. Adding another consultation profession should normally be data/configuration only.

## Relative example data

Demo reservations are generated from day offsets rather than fixed calendar dates. The local store keeps a seed date. When the app is opened on a later day, seeded example reservations are regenerated relative to that day while non-example visitor-created reservations are preserved.

One seeded reservation belongs to the local demo visitor so the "Your upcoming booking" component is always testable.

## Persistence boundary

The UI depends on the `ReservationStore` interface. The browser implementation uses `localStorage`, but scheduling code does not.

A production provider should implement the same logical operations against a transactional API. Reservation commits must re-check resource/capacity availability atomically on the server.

## Frontend framework

Keep **React** for the application shell and future operator/admin workflows, and keep **Lit** for the embeddable `<booking-widget>` custom element.

Why this split fits the product:

- the application is increasingly stateful: service selection, delivery choice, variable intake, availability, reservation management and future admin configuration;
- React is already isolated from the scheduling domain, so the domain remains portable;
- Lit provides a smaller framework-independent embedding boundary where a custom element is itself a product requirement;
- Astro would mainly help content-heavy server/static pages, while the core booking flow is interactive;
- moving the application to another reactive framework would create migration work without reducing the booking model or persistence complexity.

The mobile-first layout is implemented in plain CSS with small-screen defaults and `min-width` enhancements, so it is not coupled to the application framework.

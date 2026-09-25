# Booking

A configurable reservation system for businesses that sell time, expertise, access, space, or capacity.

The project avoids separate products for barbers, clinics, restaurants, hotels, consultants, field services, classes, and rentals. Those businesses are configurations of shared scheduling primitives: **services**, **delivery modes**, **resources**, **capacity**, **availability**, **intake**, and **booking policy**.

## Architecture

The frontend decision is deliberately split by responsibility:

- **TypeScript domain package** — canonical scheduling types, presets, and availability rules.
- **React 19.3** — application/admin composition and the configuration preview.
- **Lit 3.3** — portable <booking-widget> custom element for framework-independent embedding.
- **Vite 8** — application build and GitHub Pages static deployment.
- **Vitest + Playwright** — deterministic domain/data tests plus desktop/mobile browser regression coverage.
- **Biome** — repository linting and formatting.

The React application and Lit widget consume the same @booking/domain workspace package. GitHub Pages is a static demonstration boundary only; production reservation commits require a transactional backend.

For the current product shape, React remains the recommended application framework. The booking flow is increasingly stateful (service/delivery selection, dynamic intake, availability and reservation management), while Lit remains useful specifically where a framework-independent embeddable custom element is a product requirement. A framework migration would not simplify the domain or persistence model.

See [docs/architecture.md](docs/architecture.md) for invariants and backend direction, and [docs/service-models.md](docs/service-models.md) for the cross-profession booking model.

## What works now

The mobile-first application includes thirteen live examples:

- **Barber** — staff-bound appointments with cleanup buffers.
- **Clinic** — staff appointments that can require approval.
- **Restaurant** — party-size-aware table allocation.
- **Hotel** — variable-length stays against exclusive room inventory.
- **Studio / class** — pooled shared capacity.
- **Interior design** — in-studio, on-site or virtual consultation plus project intake.
- **Audio / AV** — system consultation and on-site calibration.
- **Legal** — confidential consultation intake with approval.
- **Tutoring** — provider-bound in-person or online sessions.
- **Home service** — field-service assessment with travel buffers and address intake.
- **Photography** — studio/location sessions with deposits.
- **Beauty** — personal-care appointments.
- **Pet care** — grooming with pet-specific intake.

The same primitives can represent dental, physiotherapy, counseling, accounting, tax, architecture, IT consulting, music lessons, coaching, cleaning, plumbing, electrical, auto service, veterinary appointments, equipment/venue rental, tours, and many other common booking services without adding profession-specific scheduling code.

Reservations made through the React demo immediately affect subsequent availability and persist in the browser. Seeded example reservations are generated relative to the current day and rebase when the day changes. One seeded upcoming reservation belongs to the demo visitor so the visitor-facing booking summary is testable without manual setup.

The Lit widget exposes the same availability model as an embeddable custom element and emits selection events for a host to handle.

## Persistence

The UI depends on a ReservationStore interface. The current browser provider uses localStorage, but the application does not depend directly on browser storage.

A future production provider can replace the local adapter with a transactional API/database. Slot confirmation must be revalidated atomically server-side to prevent concurrent customers from taking the same exclusive resource or exceeding pooled capacity.

## Development

Requires Node 24 and npm 11.

~~~bash
npm ci
npm run dev
~~~

Verification:

~~~bash
npm run check
npm run test:e2e
~~~

Formatting:

~~~bash
npm run format
~~~

The Vite production base is /booking/ so the built site can deploy directly as this repository's GitHub Pages project site.

## License

Proprietary. All rights reserved. No permission is granted to use, copy, modify, distribute, deploy, or create derivative works without prior express written permission from the copyright holder. See [LICENSE](LICENSE).

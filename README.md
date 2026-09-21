# Booking

A configurable reservation system for businesses that sell time, access, space, or capacity.

The project avoids separate products for barbers, clinics, restaurants, hotels, classes, and rentals. Those businesses are configurations of shared scheduling primitives: **services**, **resources**, **capacity**, **availability**, and **booking policy**.

## Architecture

The frontend decision is deliberately split by responsibility:

- **TypeScript domain package** — canonical scheduling types, presets, and availability rules.
- **React 19.3** — application/admin composition and the configuration preview.
- **Lit 3.3** — portable `<booking-widget>` custom element for framework-independent embedding.
- **Vite 8** — application build and GitHub Pages static deployment.
- **Vitest + Playwright** — deterministic domain tests plus desktop/mobile browser regression coverage.
- **Biome** — repository linting and formatting.

The React application and Lit widget consume the same `@booking/domain` workspace package. GitHub Pages is a static demonstration boundary only; production reservation commits require a transactional backend.

See [`docs/architecture.md`](docs/architecture.md) for invariants and backend direction.

## What works now

The responsive application includes five live presets:

- **Barber** — staff-bound appointments with cleanup buffers.
- **Clinic** — staff appointments that can require approval.
- **Restaurant** — party-size-aware table allocation.
- **Hotel** — variable-length stays against exclusive room inventory.
- **Studio / class** — pooled shared capacity.

Reservations made through the React demo immediately affect subsequent availability and persist in the browser. The Lit widget exposes the same availability model as an embeddable custom element and emits selection events for a host to handle.

## Development

Requires Node 24 and npm 11.

```bash
npm ci
npm run dev
```

Verification:

```bash
npm run check
npm run test:e2e
```

Formatting:

```bash
npm run format
```

The Vite production base is `/booking/` so the built site can deploy directly as this repository's GitHub Pages project site.

## Production boundary

The current browser persistence adapter uses `localStorage`. It is not a production multi-user reservation database.

A production deployment must replace that adapter with a transactional API/database and revalidate capacity atomically when a reservation is committed. The shared domain package stays independent from persistence and UI frameworks so backend and client implementations can converge on the same reservation vocabulary.

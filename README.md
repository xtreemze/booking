# Booking

A configurable reservation system for businesses that sell time, access, space, or capacity.

The product models barbers, clinics, restaurants, hotels, classes, rentals, consultations, and other bookable services as configurations of shared scheduling primitives: **services**, **resources**, **capacity**, **availability**, and **booking policy**.

## Architecture

Booking is an npm monorepo with explicit delivery boundaries:

- **Astro 7** in `apps/web` owns routing, static composition, the GitHub Pages build, and future content-oriented surfaces.
- **SolidJS** provides fine-grained client islands for the interactive booking and operator experience.
- **TypeScript domain package** in `packages/domain` is the canonical framework-independent scheduling model.
- **Lit** in `packages/booking-widget` provides the portable `<booking-widget>` custom element for framework-independent embedding.
- **Vite 8** is the build/runtime toolchain underneath Astro.
- **Biome 2.5** owns linting and formatting across the workspace.
- **Vitest + Playwright** cover deterministic domain behavior and desktop/mobile browser flows.

Astro and Lit consume the same `@booking/domain` package. UI layers may present availability but never own scheduling validity. GitHub Pages remains a static demonstration boundary; production reservation commits require a transactional backend.

See [`docs/architecture.md`](docs/architecture.md) for invariants and backend direction.

## Workspace

```text
apps/
  web/                    Astro application and Solid client islands
packages/
  domain/                 framework-independent booking domain
  booking-widget/         Lit custom element
  governance/             standards/control metadata
services/                  future deployable backend services
tools/                     repository, governance, and evidence checks
```

## What works now

The responsive demonstration includes five live presets:

- **Barber** — staff-bound appointments with cleanup buffers.
- **Clinic** — staff appointments that can require approval.
- **Restaurant** — party-size-aware table allocation.
- **Hotel** — variable-length stays against exclusive room inventory.
- **Studio / class** — pooled shared capacity.

Reservations made through the Solid booking island immediately affect subsequent availability and persist in the browser. The Lit widget exposes the same availability model as an embeddable custom element and emits selection events for a host to handle.

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

The Astro site is built under the `/booking/` base and outputs to `apps/web/dist` for GitHub Pages.

## Production boundary

The current browser persistence adapter uses `localStorage`. It is not a production multi-user reservation database.

A production deployment must replace that adapter with a transactional API/database and revalidate capacity atomically when a reservation is committed. The shared domain package stays independent from persistence and UI frameworks so backend and client implementations can converge on the same reservation vocabulary.

## License

Proprietary. All rights reserved. No permission is granted to use, copy, modify, distribute, deploy, or create derivative works without prior express written permission from the copyright holder. See [`LICENSE`](LICENSE).

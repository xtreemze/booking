# Engineering workspace

## Structure

The repository is an npm workspace:

- `/src` — React application shell, local persistence adapter, and compatibility imports
- `/packages/domain` — canonical framework-independent scheduling model
- `/packages/booking-widget` — Lit custom element for embeddable public booking
- `/packages/governance` — versioned standards/control metadata
- `/services/*` — independently deployable backend/services when introduced
- `/tools` — deterministic repository, governance, and evidence checks
- `/.github` — CI, Pages deployment, security automation, ownership, and review policy

## Required verification

`npm run check` is the deterministic engineering gate: workspace contract, governance registry validation, Biome linting, domain tests, strict TypeScript, and production build.

`npm run ci` adds the dependency vulnerability gate. Playwright runs separately in CI against the production Vite build at the GitHub Pages base path.

## Package boundaries

Reusable packages expose explicit public APIs. Services may depend on packages, but packages must not depend on deployable services. UI packages consume `@booking/domain`; the domain must never import React, Lit, browser persistence, GitHub, CI, or evidence implementation details.

React is retained for application/admin composition. Lit is used for the web-component distribution boundary rather than as a wholesale application rewrite.

## Reproducibility

The dependency graph is lockfile-controlled. CI and Pages use `npm ci`; changes to dependencies must update and commit `package-lock.json`.

## Static deployment boundary

GitHub Pages deploys the Vite production output under `/booking/`. It is a demonstration and embeddable-client host only. Transactional reservation commits, tenant isolation, payments, secrets, and audit records belong in backend services.

## Evidence evolution

The current `.evidence` artifacts are CI-level evidence. The production governance/evidence plane described in Issue #6 will require durable, immutable, point-in-time records outside ephemeral CI storage.

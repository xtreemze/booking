# Engineering workspace

## Structure

The repository is an npm workspace:

- `/apps/web` — Astro application shell, Solid client islands, browser persistence adapters, and deployable static output
- `/packages/domain` — canonical framework-independent scheduling model
- `/packages/booking-widget` — Lit custom element for embeddable public booking
- `/packages/governance` — versioned standards/control metadata
- `/services/*` — independently deployable backend/services when introduced
- `/tools` — deterministic repository, governance, and evidence checks
- `/.github` — CI, Pages deployment, security automation, ownership, and review policy

## Toolchain

The root workspace pins the repository-wide engineering tools. Astro owns the web build and uses Vite 8 internally. Solid is integrated through the official Astro integration. Biome owns formatting and linting across Astro, TypeScript, JavaScript, CSS, JSON, and repository configuration.

Framework dependencies belong to the application or package that actually uses them; the root remains orchestration-only.

## Required verification

`npm run check` is the deterministic engineering gate: workspace contract, governance registry validation, Biome linting, domain tests, workspace type checking, and the Astro production build.

`npm run ci` adds the dependency vulnerability gate. Playwright runs separately in CI against the production Astro preview at the GitHub Pages base path.

## Package boundaries

Reusable packages expose explicit public APIs. Services may depend on packages, but packages must not depend on deployable services.

`@booking/domain` must never import Astro, Solid, Lit, browser persistence, GitHub, CI, or evidence implementation details. The Astro/Solid application and Lit widget both consume that domain API.

Astro owns pages and composition. Solid owns stateful application islands. Lit is reserved for portable custom elements rather than being used as a second application framework.

## Reproducibility

The dependency graph is lockfile-controlled. CI and Pages use `npm ci`; changes to dependencies must update and commit `package-lock.json`.

## Static deployment boundary

GitHub Pages deploys `apps/web/dist` under `/booking/`. It is a demonstration and embeddable-client host only. Transactional reservation commits, tenant isolation, payments, secrets, and audit records belong in backend services.

## Evidence evolution

The current `.evidence` artifacts are CI-level evidence. The production governance/evidence plane described in Issue #6 will require durable, immutable, point-in-time records outside ephemeral CI storage.

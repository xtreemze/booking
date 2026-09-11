# Engineering workspace

## Structure

The repository is an npm workspace while the existing browser application remains at the root:

- `/src` — current booking web application and scheduling domain
- `/packages/*` — reusable packages and bounded-context libraries
- `/services/*` — independently deployable backend/services when introduced
- `/packages/governance` — versioned standards/control metadata
- `/tools` — deterministic repository, governance and evidence checks
- `/.github` — CI, security automation, ownership and review policy

Keeping the current app at the root avoids a relocation-only diff while giving future backend and governance work stable package boundaries.

## Required verification

`npm run check` is the deterministic engineering gate: workspace contract, governance registry validation, tests, strict TypeScript and production build.

`npm run ci` adds the dependency vulnerability gate. CI then generates a CycloneDX SBOM and an evidence manifest containing source/run provenance and SHA-256 digests of control-relevant workspace files.

CI evidence supports auditability but does not itself prove conformity with any standard.

## Package boundaries

Reusable packages should expose explicit public APIs. Services may depend on packages, but packages must not depend on deployable services. Business-domain code should not import GitHub/CI/evidence implementation details. Governance metadata should remain usable independently from the booking runtime.

## Reproducibility

A committed dependency lockfile is required before a production release is described as reproducible. The workspace check currently emits a warning rather than failing because this repository was bootstrapped before a lockfile was generated; closing that gap is tracked separately.

## Evidence evolution

The current `.evidence` artifacts are CI-level evidence. The production governance/evidence plane described in Issue #6 will require durable, immutable, point-in-time records outside ephemeral CI storage.

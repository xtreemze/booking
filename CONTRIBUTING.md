# Contributing

Booking is developed through auditable changes rather than direct feature accumulation.

## Workflow

1. Use an issue for product requirements, risks, architectural decisions, or work that spans more than one focused change.
2. Keep implementation changes in pull requests.
3. Preserve strict TypeScript and domain invariants rather than weakening types for convenience.
4. Run `npm run check` before review.
5. Document security, privacy, data-model, concurrency, migration, and compliance implications in the PR when relevant.
6. Treat generated CI evidence as supporting evidence, not as a substitute for review or independent audit.

## Architecture

The browser application currently remains the root package. New reusable modules belong under `packages/*`; independently deployable backend components belong under `services/*`. Do not introduce cross-package imports that bypass package public APIs once those packages exist.

## Compliance content

Do not copy copyrighted ISO standard text into the repository unless appropriately licensed. The governance registry stores standard identifiers, editions, applicability metadata, internal controls, mappings, and evidence requirements.

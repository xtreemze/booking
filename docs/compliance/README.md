# Compliance-by-design workspace

This directory documents the engineering integration of Issue #6. Machine-readable governance metadata lives in `packages/governance/registry` so it can later be consumed by services, admin tooling, evidence exports, and automated control tests.

## Rules

- Store standard identifiers, editions, applicability, internal controls and evidence requirements; do not reproduce licensed ISO text.
- External frameworks map many-to-many onto stable internal controls.
- Framework editions and mappings are versioned data rather than hard-coded behavior.
- CI evidence is cryptographically identifiable through file digests and source-run provenance.
- Application observability, product analytics, domain history and compliance evidence are distinct data classes.
- Certification and legal compliance are organizational outcomes; repository checks must not claim certification.

## Current automation

`npm run compliance:check` validates registry structure, uniqueness and referential integrity.

`npm run evidence:generate` creates `.evidence/ci-evidence.json`, including the commit/workflow context available in GitHub Actions and SHA-256 digests of governance and CI configuration.

The CI workflow additionally emits a CycloneDX software bill of materials. These artifacts are retained by GitHub Actions for review and future evidence-pipeline integration.

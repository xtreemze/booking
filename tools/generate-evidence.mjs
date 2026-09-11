import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const evidenceFiles = [
  'package.json',
  'tsconfig.app.json',
  '.github/workflows/ci.yml',
  '.github/workflows/codeql.yml',
  'packages/governance/registry/standards.json',
  'packages/governance/registry/controls.json',
];

async function digest(path) {
  const content = await readFile(path);
  return createHash('sha256').update(content).digest('hex');
}

async function readEvent() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return {};
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return {};
  }
}

const event = await readEvent();
const standards = JSON.parse(await readFile('packages/governance/registry/standards.json', 'utf8'));
const controls = JSON.parse(await readFile('packages/governance/registry/controls.json', 'utf8'));
const digests = Object.fromEntries(await Promise.all(evidenceFiles.map(async (path) => [path, await digest(path)])));

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  verificationResult: process.env.EVIDENCE_RESULT ?? 'local-unasserted',
  source: {
    repository: process.env.GITHUB_REPOSITORY ?? null,
    checkedOutCommit: process.env.GITHUB_SHA ?? null,
    headCommit: event.pull_request?.head?.sha ?? process.env.GITHUB_SHA ?? null,
    baseCommit: event.pull_request?.base?.sha ?? null,
    ref: process.env.GITHUB_REF ?? null,
    headRef: process.env.GITHUB_HEAD_REF ?? null,
    baseRef: process.env.GITHUB_BASE_REF ?? null,
    event: process.env.GITHUB_EVENT_NAME ?? null,
    actor: process.env.GITHUB_ACTOR ?? null,
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  },
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  governance: {
    standardsSchemaVersion: standards.schemaVersion,
    controlsSchemaVersion: controls.schemaVersion,
    standardsCount: standards.standards.length,
    controlsCount: controls.controls.length,
  },
  sha256: digests,
};

await mkdir('.evidence', { recursive: true });
await writeFile('.evidence/ci-evidence.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('Evidence manifest written to .evidence/ci-evidence.json');

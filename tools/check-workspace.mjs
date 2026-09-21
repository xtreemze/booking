import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'SECURITY.md',
  'CONTRIBUTING.md',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
  'package-lock.json',
  'packages/domain/package.json',
  'packages/booking-widget/package.json',
  'packages/governance/registry/standards.json',
  'packages/governance/registry/controls.json',
];

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const tsconfig = JSON.parse(await readFile('tsconfig.app.json', 'utf8'));

const errors = [];

if (packageJson.private !== true) errors.push('Root package must remain private.');
if (!Array.isArray(packageJson.workspaces)) errors.push('Root package must declare npm workspaces.');
for (const workspace of ['packages/*', 'services/*']) {
  if (!packageJson.workspaces?.includes(workspace)) errors.push(`Missing workspace pattern: ${workspace}`);
}

const strictFlags = [
  'strict',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
  'noImplicitOverride',
  'noFallthroughCasesInSwitch',
  'noImplicitReturns',
  'noPropertyAccessFromIndexSignature',
  'useUnknownInCatchVariables',
];

for (const flag of strictFlags) {
  if (tsconfig.compilerOptions?.[flag] !== true) errors.push(`TypeScript strict flag must remain enabled: ${flag}`);
}

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    errors.push(`Required workspace file is missing: ${file}`);
  }
}

if (errors.length > 0) {
  console.error('Workspace contract violations:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Workspace contract verified.');

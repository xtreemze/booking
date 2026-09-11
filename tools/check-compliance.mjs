import { readFile } from 'node:fs/promises';

const standardsDocument = JSON.parse(await readFile('packages/governance/registry/standards.json', 'utf8'));
const controlsDocument = JSON.parse(await readFile('packages/governance/registry/controls.json', 'utf8'));
const errors = [];

if (standardsDocument.schemaVersion !== 1) errors.push('Unsupported standards registry schema version.');
if (controlsDocument.schemaVersion !== 1) errors.push('Unsupported controls registry schema version.');
if (!Array.isArray(standardsDocument.standards)) errors.push('Standards registry must contain standards[].');
if (!Array.isArray(controlsDocument.controls)) errors.push('Controls registry must contain controls[].');

const standards = standardsDocument.standards ?? [];
const controls = controlsDocument.controls ?? [];
const standardIds = new Set();
const controlIds = new Set();
const allowedStatus = new Set(['active', 'guidance', 'conditional', 'planned', 'superseded']);

for (const standard of standards) {
  if (typeof standard.id !== 'string' || standard.id.length === 0) errors.push('Every standard requires an id.');
  if (standardIds.has(standard.id)) errors.push(`Duplicate standard id: ${standard.id}`);
  standardIds.add(standard.id);
  if (!allowedStatus.has(standard.status)) errors.push(`Unsupported status for ${standard.id}: ${standard.status}`);
  if (typeof standard.title !== 'string' || standard.title.length === 0) errors.push(`Missing title for ${standard.id}`);
  if (typeof standard.edition !== 'string' || standard.edition.length === 0) errors.push(`Missing edition for ${standard.id}`);
}

for (const control of controls) {
  if (!/^CTRL-[A-Z]{3}-\d{3}$/.test(control.id ?? '')) errors.push(`Invalid control id: ${control.id}`);
  if (controlIds.has(control.id)) errors.push(`Duplicate control id: ${control.id}`);
  controlIds.add(control.id);
  if (typeof control.title !== 'string' || control.title.length === 0) errors.push(`Missing title for ${control.id}`);
  if (!Array.isArray(control.frameworks) || control.frameworks.length === 0) errors.push(`Control ${control.id} must map to at least one framework.`);
  for (const framework of control.frameworks ?? []) {
    if (!standardIds.has(framework)) errors.push(`Control ${control.id} references unknown framework: ${framework}`);
  }
  if (!Array.isArray(control.evidence) || control.evidence.length === 0) errors.push(`Control ${control.id} requires evidence definitions.`);
  if (typeof control.ownerRole !== 'string' || control.ownerRole.length === 0) errors.push(`Control ${control.id} requires an ownerRole.`);
}

if (errors.length > 0) {
  console.error('Governance registry violations:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Governance registry verified: ${standards.length} standards, ${controls.length} internal controls.`);

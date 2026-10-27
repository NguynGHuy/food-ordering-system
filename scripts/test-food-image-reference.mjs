import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from '../FE/node_modules/typescript/lib/typescript.js';

const source = await readFile(new URL('../FE/src/utils/foodImageReference.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { isFoodImageReference } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const fixtures = JSON.parse(await readFile(new URL('../DatMonAnOnline.Tests/Fixtures/food-image-references.json', import.meta.url), 'utf8'));
for (const [index, fixture] of fixtures.entries()) {
  assert.equal(isFoodImageReference(fixture.value), fixture.valid, `Image reference fixture ${index}`);
}
assert.equal(isFoodImageReference('https://example.invalid/' + 'a'.repeat(255)), false);
console.log(`PASS ${fixtures.length + 1} frontend image-reference cases (shared with backend tests)`);

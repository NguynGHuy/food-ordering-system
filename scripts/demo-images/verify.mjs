import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { catalog, root, seedRows } from './catalog.mjs';

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
assert.equal(catalog.filter(x => x.kind === 'restaurants').length, 10);
assert.equal(catalog.filter(x => x.kind === 'foods').length, 124);
assert.equal(manifest.length, 134);
assert.equal(new Set(manifest.map(x => x.path)).size, 134);
assert.equal(new Set(manifest.map(x => x.sha256)).size, 134, 'Each demo asset is distinct');
for (const asset of catalog) {
  const entry = manifest.find(x => x.path === asset.path);
  assert(entry, `Missing manifest: ${asset.path}`);
  assert.equal(entry.name, asset.name);
  const file = readFileSync(path.join(root, 'DatMonAnOnline.API/wwwroot', asset.path));
  assert.equal(file.toString('ascii', 0, 4), 'RIFF');
  assert.equal(file.toString('ascii', 8, 12), 'WEBP');
  assert.equal(createHash('sha256').update(file).digest('hex'), entry.sha256);
  assert(file.length < 400_000, `Oversized demo asset: ${asset.path}`);
}
const seedPath = path.join(root, 'DatMonAnOnline.API/Database/SeedDemo.sql');
if (process.argv.includes('--update-seed')) {
  let sql = readFileSync(seedPath, 'utf8');
  for (const [table, kind, field, count] of [['nhahang', 'restaurants', 5, 10], ['monan', 'foods', 6, 124]]) {
    const expression = new RegExp('(INSERT INTO `' + table + '`[^;]*?\\bVALUES\\s*)([\\s\\S]*?)(;)');
    let changed = 0;
    sql = sql.replace(expression, (_, prefix, values, suffix) => prefix + values.replace(/\(([^\r\n]*)\)/g, (row, body) => {
      const tokens = [...body.matchAll(/'(?:[^']|'')*'|[^,]+/g)];
      const id = Number(tokens[0][0]);
      const asset = catalog.find(x => x.kind === kind && x.id === id);
      assert(asset, `Unknown ${table} row ${id}`);
      const token = tokens[field];
      assert(token && (token[0].trim() === 'NULL' || token[0].trim().startsWith("'")));
      const replaced = body.slice(0, token.index) + "'" + asset.path + "'" + body.slice(token.index + token[0].length);
      // No schema, IDs, prices, account or financial fields are edited.
      assert.equal(replaced.slice(0, token.index), body.slice(0, token.index));
      changed++;
      return '(' + replaced + ')';
    }) + suffix);
    assert.equal(changed, count, `${table} row count changed`);
  }
  writeFileSync(seedPath, sql);
}
for (const [table, kind, field] of [['nhahang', 'restaurants', 5], ['monan', 'foods', 6]]) {
  for (const row of seedRows(table)) assert.equal(row[field], catalog.find(x => x.kind === kind && x.id === row[0]).path);
}
assert.deepEqual(readdirSync(path.dirname(seedPath)).sort(), ['Database.sql', 'SeedDemo.sql']);
console.log(`PASS 10 covers + 124 food images: local WebP, unique content, checksums, size budget, seed paths, exactly two SQL files (${(manifest.reduce((sum, x) => sum + x.bytes, 0) / 1024 / 1024).toFixed(2)} MiB)`);

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export function seedRows(table) {
  const sql = readFileSync(new URL('../../DatMonAnOnline.API/Database/SeedDemo.sql', import.meta.url), 'utf8');
  const start = sql.indexOf('INSERT INTO `' + table + '`');
  if (start < 0) throw new Error(`Missing seed table: ${table}`);
  const values = sql.slice(start).match(/\bVALUES\s*([\s\S]*?);/)[1];
  return [...values.matchAll(/\(([^\r\n]*)\)/g)].map(match =>
    [...match[1].matchAll(/'(?:[^']|'')*'|[^,]+/g)].map(([value]) => {
      value = value.trim();
      return value.startsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : value === 'NULL' ? null : Number(value);
    }));
}
export const slug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const catalog = [
  ...seedRows('nhahang').map(row => ({ kind: 'restaurants', id: row[0], name: row[2], description: row[3] })),
  ...seedRows('monan').map(row => ({ kind: 'foods', id: row[0], restaurantId: row[1], name: row[3], description: row[4] })),
].map(item => ({ ...item, path: `/uploads/${item.kind}/demo-v1-${item.id}-${slug(item.name)}.webp` }));

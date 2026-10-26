import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastClosedDate } from '../src/utils/settlementDate.ts';

for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Ho_Chi_Minh']) {
  test(`settlement cutoff follows Vietnam midnight in browser zone ${zone}`, () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = zone;
      for (const [instant, expected] of [
        ['2026-10-24T16:59:59.999Z', '2026-10-23'],
        ['2026-10-24T17:00:00.000Z', '2026-10-24'],
        ['2025-12-31T17:00:00.000Z', '2025-12-31'],
        ['2024-02-29T17:00:00.000Z', '2024-02-29'],
        ['2026-02-28T17:00:00.000Z', '2026-02-28'],
      ]) assert.equal(lastClosedDate(new Date(instant)), expected, instant);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}

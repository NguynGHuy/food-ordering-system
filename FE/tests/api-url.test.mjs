import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiUrl } from '../src/services/api.ts';

test('production uses same-origin, development retains the local API', () => {
  assert.equal(getApiUrl(undefined, false), '/api');
  assert.equal(getApiUrl(undefined, true), 'http://localhost:5038/api');
});
test('REST and hub can share an absolute or prefixed API base', () => {
  assert.equal(getApiUrl(' https://api.example.invalid/api/ ', false), 'https://api.example.invalid/api');
  assert.equal(getApiUrl('/foodie/api/', false), '/foodie/api');
});
test('rejects credentials, unsupported schemes and ambiguous URLs', () => {
  for (const value of ['javascript:alert(1)', '//example.invalid/api', 'https://u:p@example.invalid/api', '/api?token=test']) {
    assert.throws(() => getApiUrl(value, false));
  }
});

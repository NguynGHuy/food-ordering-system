import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSql } from './sanitize-demo-seed.mjs';

test('anonymizes fixture fields, preserves IDs and is idempotent', () => {
  const sql = "CREATE TABLE `taikhoan` (\n  `MaTaiKhoan` int,\n  `Email` text,\n  `MatKhau` text,\n  `SoDienThoai` text\n) ENGINE=InnoDB;\nINSERT INTO `taikhoan` VALUES (7,'fixture@example.test','fixture-hash','fixture-phone');";
  const clean = sanitizeSql(sql);
  assert.match(clean, /\(7,'demo.account7@example.invalid','DEMO_RESET_REQUIRED','0900000007'\)/);
  assert.equal(sanitizeSql(clean), clean);
});

test('does not change financial tables or execute SQL', () => {
  const sql = 'INSERT INTO `vi` VALUES (1,7,15000);';
  assert.equal(sanitizeSql(sql), sql);
});

test('rejects malformed fixtures rather than losing columns', () => {
  const sql = "CREATE TABLE `taikhoan` (\n  `MaTaiKhoan` int\n) ENGINE=InnoDB;\nINSERT INTO `taikhoan` VALUES (1,2);";
  assert.throws(() => sanitizeSql(sql), /Column mismatch/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../lib/db.js';
import { buildCatalog } from '../lib/pattern-data.js';
import {
  createRedemptionBatch,
  redeemCode,
  revokeCode,
  saveProgress,
  normaliseCode,
} from '../lib/redemption.js';

test('a batch stores only hashes and codes carry 128-bit entropy', () => {
  const db = createTestDb();
  const { batchId, codes } = createRedemptionBatch(db, { patternId: 'azure-dragon-v1', quantity: 3, adminId: 'admin-1' });

  assert.equal(codes.length, 3);
  for (const code of codes) {
    const hex = code.replace('PB-', '');
    assert.equal(hex.length, 32); // 16 字节 = 128 位
    assert.match(hex, /^[0-9A-F]{32}$/);
  }
  // 数据库不保存明文，只保存唯一哈希
  const rows = db.prepare('SELECT code_hash, status, batch_id FROM redemption_codes').all();
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.status, 'active');
    assert.equal(row.batch_id, batchId);
    assert.equal(row.code_hash.length, 64); // sha256 hex
    assert.ok(!codes.includes(row.code_hash));
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM redemption_batches').get().n, 1);
});

test('a valid code grants its pattern exactly once inside one transaction', () => {
  const db = createTestDb();
  const [code] = createRedemptionBatch(db, { patternId: 'azure-dragon-v1', quantity: 1 }).codes;

  assert.deepEqual(redeemCode(db, code, 'user-1'), { ok: true, patternId: 'azure-dragon-v1' });
  assert.equal(db.prepare('SELECT status FROM redemption_codes').get().status, 'redeemed');
  assert.equal(
    db.prepare('SELECT source FROM entitlements WHERE user_id = ? AND pattern_id = ?').get('user-1', 'azure-dragon-v1').source,
    'redeem',
  );
  // 同一码不能被第二个账户再次使用
  assert.deepEqual(redeemCode(db, code, 'user-2'), { ok: false, reason: 'used' });
  // 大小写与空格规范化后等价
  assert.deepEqual(redeemCode(db, `  ${normaliseCode(code).toLowerCase()}  `, 'user-3'), { ok: false, reason: 'used' });
});

test('a revoked or unknown code cannot unlock a pattern', () => {
  const db = createTestDb();
  const [code] = createRedemptionBatch(db, { patternId: 'azure-dragon-v1', quantity: 1 }).codes;
  const id = db.prepare('SELECT id FROM redemption_codes').get().id;
  assert.equal(revokeCode(db, id, 'admin-1'), true);
  assert.deepEqual(redeemCode(db, code, 'user-1'), { ok: false, reason: 'invalid' });
  assert.deepEqual(redeemCode(db, 'PB-NOPE', 'user-1'), { ok: false, reason: 'invalid' });
});

test('only an entitled owner can save section progress', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO entitlements (user_id, pattern_id) VALUES ('user-1','azure-dragon-v1')").run();
  assert.deepEqual(saveProgress(db, 'user-1', 'azure-dragon-v1', 'A01', true), { complete: true });
  assert.throws(() => saveProgress(db, 'user-2', 'azure-dragon-v1', 'A01', true), /not entitled/);
});

test('formal pattern colour totals reconcile across sections', () => {
  for (const pattern of buildCatalog()) {
    const sectionSum = pattern.sections.reduce((n, s) => n + s.cells.length, 0);
    assert.equal(pattern.totalBeads, sectionSum);
    // 全图各色数量之和 = 全图总颗数
    assert.equal(pattern.colours.reduce((n, c) => n + c.count, 0), pattern.totalBeads);
    for (const section of pattern.sections) {
      // 分区各色数量之和 = 分区颗数
      assert.equal(section.colours.reduce((n, c) => n + c.count, 0), section.cells.length);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  seedDatabase,
  createRedemptionCodes,
  redeemCode,
  revokeCode,
  saveProgress,
} from '../lib/redemption.js';

test('a valid code grants its pattern once', () => {
  const db = new Database(':memory:');
  seedDatabase(db);
  const [code] = createRedemptionCodes(db, 'azure-dragon', 1);

  assert.deepEqual(redeemCode(db, code, 'user-1'), {
    ok: true,
    patternId: 'azure-dragon',
  });
  assert.deepEqual(redeemCode(db, code, 'user-2'), {
    ok: false,
    reason: 'used',
  });
});

test('only an owner can save pattern progress', () => {
  const db = new Database(':memory:');
  seedDatabase(db);
  db.prepare('INSERT INTO user_patterns (user_id, pattern_id) VALUES (?, ?)').run(
    'user-1',
    'azure-dragon',
  );

  assert.deepEqual(saveProgress(db, 'user-1', 'azure-dragon', 'A01', true), { complete: true });
  assert.throws(
    () => saveProgress(db, 'user-2', 'azure-dragon', 'A01', true),
    /not entitled/,
  );
});

test('a revoked code cannot unlock a pattern', () => {
  const db = new Database(':memory:');
  seedDatabase(db);
  const [code] = createRedemptionCodes(db, 'azure-dragon', 1);
  const row = db.prepare('SELECT id FROM redemption_codes').get();

  assert.equal(revokeCode(db, row.id), true);
  assert.deepEqual(redeemCode(db, code, 'user-1'), { ok: false, reason: 'invalid' });
});

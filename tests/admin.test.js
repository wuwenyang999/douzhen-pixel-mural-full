import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth-store.js';
import { createRedemptionBatch, manualGrant, revokeCode } from '../lib/redemption.js';

test('only an admin can perform admin actions', () => {
  assert.throws(() => requireAdmin({ role: 'member' }), /forbidden/);
  assert.throws(() => requireAdmin(null), /forbidden/);
  assert.doesNotThrow(() => requireAdmin({ role: 'admin' }));
});

test('manual grant creates an entitlement and writes an audit record', () => {
  const db = createTestDb();
  manualGrant(db, { patternId: 'azure-dragon-v1', userId: 'user-9', adminId: 'admin-1' });

  const ent = db.prepare('SELECT source FROM entitlements WHERE user_id = ?').get('user-9');
  assert.equal(ent.source, 'manual');
  const audit = db.prepare("SELECT action FROM admin_audit_logs WHERE action = 'entitlement.manual_grant'").all();
  assert.equal(audit.length, 1);
});

test('batch create and revoke are audited without storing plaintext', () => {
  const db = createTestDb();
  createRedemptionBatch(db, { patternId: 'azure-dragon-v1', quantity: 2, adminId: 'admin-1' });
  const id = db.prepare('SELECT id FROM redemption_codes LIMIT 1').get().id;
  revokeCode(db, id, 'admin-1');

  const actions = db.prepare('SELECT action FROM admin_audit_logs ORDER BY id').all().map((r) => r.action);
  assert.deepEqual(actions, ['batch.create', 'code.revoke']);
  const leak = db.prepare("SELECT COUNT(*) AS n FROM admin_audit_logs WHERE detail_json LIKE '%PB-%'").get().n;
  assert.equal(leak, 0); // 审计不记录明文码
});

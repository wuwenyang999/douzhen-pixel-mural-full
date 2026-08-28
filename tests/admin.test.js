import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../lib/auth-store.js';

test('only an admin can create a redemption batch', () => {
  assert.throws(() => requireAdmin({ role: 'member' }), /forbidden/);
  assert.doesNotThrow(() => requireAdmin({ role: 'admin' }));
});

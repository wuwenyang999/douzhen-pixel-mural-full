import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { seedDatabase } from '../lib/redemption.js';
import { createUser, authenticateUser } from '../lib/auth-store.js';

test('registration hashes a password and authentication returns the user', async () => {
  const db = new Database(':memory:');
  seedDatabase(db);

  const user = await createUser(db, {
    email: 'maker@example.com',
    password: 'safe-password',
  });
  const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);

  assert.notEqual(stored.password_hash, 'safe-password');
  assert.deepEqual(await authenticateUser(db, 'maker@example.com', 'safe-password'), user);
});

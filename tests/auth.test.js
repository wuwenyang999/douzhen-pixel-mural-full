import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../lib/db.js';
import { authenticateUser, createUser, deactivateUser } from '../lib/auth-store.js';

test('registration stores only a password hash and authentication succeeds', async () => {
  const db = createTestDb();
  const user = await createUser(db, { email: 'Maker@Example.com', password: 'safe-password' });

  const row = db.prepare('SELECT email, password_hash FROM users WHERE id = ?').get(user.id);
  assert.equal(row.email, 'maker@example.com'); // 邮箱小写标准化
  assert.notEqual(row.password_hash, 'safe-password');
  assert.match(row.password_hash, /^\$2[aby]\$/); // bcrypt 哈希

  const authed = await authenticateUser(db, 'maker@example.com', 'safe-password');
  assert.equal(authed.id, user.id);
  assert.ok(db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(user.id).last_login_at);
  assert.equal(await authenticateUser(db, 'maker@example.com', 'wrong'), null);
});

test('deleting an account removes email and password and blocks login, keeps anonymous id', async () => {
  const db = createTestDb();
  const user = await createUser(db, { email: 'leave@example.com', password: 'safe-password' });
  // 绑定一份权益（模拟已兑换）
  db.prepare('INSERT INTO entitlements (user_id, pattern_id) VALUES (?, ?)').run(user.id, 'azure-dragon-v1');

  assert.equal(deactivateUser(db, user.id), true);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  assert.equal(row.email, null);
  assert.equal(row.password_hash, null);
  assert.ok(row.deleted_at);
  // 匿名权益审计仍在，防止兑换码被再次使用
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE user_id = ?').get(user.id).n, 1);
  // 无法再登录
  assert.equal(await authenticateUser(db, 'leave@example.com', 'safe-password'), null);
});

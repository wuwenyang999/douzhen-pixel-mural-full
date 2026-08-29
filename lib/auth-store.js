import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function createUser(db, { email, password, role = 'member' }) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    id,
    normaliseEmail(email),
    passwordHash,
    role,
  );
  return { id, email: normaliseEmail(email), role };
}

export async function authenticateUser(db, email, password) {
  const row = db
    .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ? AND deleted_at IS NULL')
    .get(normaliseEmail(email));

  if (!row || !row.password_hash) return null;
  if (!(await bcrypt.compare(password, row.password_hash))) return null;

  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
  return { id: row.id, email: row.email, role: row.role };
}

export function requireAdmin(user) {
  if (!user || user.role !== 'admin') throw new Error('forbidden');
}

// 注销账户：删除邮箱与密码（不可再登录），保留匿名 id 关联的兑换审计，
// 使被注销账户用过的兑换码无法被再次使用。
export function deactivateUser(db, userId) {
  const result = db
    .prepare(
      `UPDATE users
       SET email = NULL, password_hash = NULL, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .run(userId);
  return result.changes === 1;
}

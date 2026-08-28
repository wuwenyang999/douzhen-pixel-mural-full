import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

export async function createUser(db, { email, password, role = 'member' }) {
  const user = {
    id: crypto.randomUUID(),
    email: normaliseEmail(email),
    role,
  };
  const passwordHash = await bcrypt.hash(password, 12);

  db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    user.id,
    user.email,
    passwordHash,
    user.role,
  );

  return user;
}

export async function authenticateUser(db, email, password) {
  const row = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?').get(
    normaliseEmail(email),
  );

  if (!row || !(await bcrypt.compare(password, row.password_hash))) return null;

  return { id: row.id, email: row.email, role: row.role };
}

export function requireAdmin(user) {
  if (!user || user.role !== 'admin') throw new Error('forbidden');
}

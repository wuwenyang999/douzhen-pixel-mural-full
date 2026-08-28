import { getDb } from './db.js';
import { authenticateUser, createUser } from './auth-store.js';

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase();
}

export async function registerMember({ email, password }) {
  const normalisedEmail = email.trim().toLowerCase();
  const role = normalisedEmail === configuredAdminEmail() ? 'admin' : 'member';
  return createUser(getDb(), { email: normalisedEmail, password, role });
}

export async function loginMember({ email, password }) {
  return authenticateUser(getDb(), email, password);
}

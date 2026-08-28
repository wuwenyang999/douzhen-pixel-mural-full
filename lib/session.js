import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const cookieName = 'pixel_mural_session';

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || 'replace-this-local-session-secret-before-deployment',
  );
}

export async function setSession(user) {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.set(cookieName, '', { path: '/', maxAge: 0 });
}

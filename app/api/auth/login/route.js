import { NextResponse } from 'next/server';
import { loginMember } from '../../../../lib/auth.js';
import { setSession } from '../../../../lib/session.js';
import { clientIp, loginLimiter } from '../../../../lib/rate-limit.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const ip = clientIp(request);
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  const emailKey = email.trim().toLowerCase();

  const limit = loginLimiter.check(`${ip}:${emailKey}`);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterMs / 1000 / 60);
    return NextResponse.redirect(new URL(`/login?error=尝试过于频繁，请约${mins}分钟后再试`, request.url));
  }

  const user = await loginMember({ email, password });
  if (!user) {
    loginLimiter.fail(`${ip}:${emailKey}`);
    return NextResponse.redirect(new URL('/login?error=邮箱或密码不正确', request.url));
  }

  loginLimiter.reset(`${ip}:${emailKey}`);
  await setSession(user);
  return NextResponse.redirect(new URL('/my-patterns', request.url));
}

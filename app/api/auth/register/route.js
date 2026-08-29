import { NextResponse } from 'next/server';
import { registerMember } from '../../../../lib/auth.js';
import { setSession } from '../../../../lib/session.js';
import { clientIp, loginLimiter } from '../../../../lib/rate-limit.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const ip = clientIp(request);
  const limit = loginLimiter.check(`register:${ip}`);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterMs / 1000 / 60);
    return NextResponse.redirect(new URL(`/login?error=尝试过于频繁，请约${mins}分钟后再试`, request.url));
  }

  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  if (!email.includes('@') || password.length < 8) {
    loginLimiter.fail(`register:${ip}`);
    return NextResponse.redirect(new URL('/login?error=请填写有效邮箱和至少8位密码', request.url));
  }

  try {
    const user = await registerMember({ email, password });
    loginLimiter.reset(`register:${ip}`);
    await setSession(user);
    return NextResponse.redirect(new URL('/library', request.url));
  } catch (error) {
    loginLimiter.fail(`register:${ip}`);
    const duplicate = String(error?.message || '').includes('UNIQUE');
    return NextResponse.redirect(
      new URL(duplicate ? '/login?error=该邮箱已注册，请直接登录' : '/login?error=注册失败，请稍后再试', request.url),
    );
  }
}

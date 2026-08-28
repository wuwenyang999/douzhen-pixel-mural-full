import { NextResponse } from 'next/server';
import { registerMember } from '../../../../lib/auth.js';
import { setSession } from '../../../../lib/session.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  if (!email.includes('@') || password.length < 8) return NextResponse.redirect(new URL('/login?error=请填写有效邮箱和至少8位密码', request.url));

  try {
    const user = await registerMember({ email, password });
    await setSession(user);
    return NextResponse.redirect(new URL('/library', request.url));
  } catch {
    return NextResponse.redirect(new URL('/login?error=该邮箱已注册，请直接登录', request.url));
  }
}

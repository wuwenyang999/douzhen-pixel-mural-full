import { NextResponse } from 'next/server';
import { loginMember } from '../../../../lib/auth.js';
import { setSession } from '../../../../lib/session.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const form = await request.formData();
  const user = await loginMember({ email: String(form.get('email') || ''), password: String(form.get('password') || '') });
  if (!user) return NextResponse.redirect(new URL('/login?error=邮箱或密码不正确', request.url));
  await setSession(user);
  return NextResponse.redirect(new URL('/my-patterns', request.url));
}

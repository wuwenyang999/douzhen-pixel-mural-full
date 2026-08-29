import { NextResponse } from 'next/server';
import { deleteAccount } from '../../../../lib/auth.js';
import { getCurrentUser, clearSession } from '../../../../lib/session.js';

export const runtime = 'nodejs';

// 注销账户：匿名化邮箱与密码、清除会话；兑换审计保留匿名 id，防止兑换码重复使用。
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: '请先登录。' }, { status: 401 });
  deleteAccount(user.id);
  await clearSession();
  return NextResponse.json({ ok: true });
}

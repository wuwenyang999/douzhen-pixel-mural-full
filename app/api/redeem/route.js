import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db.js';
import { getPatternById } from '../../../lib/patterns.js';
import { redeemCode } from '../../../lib/redemption.js';
import { getCurrentUser } from '../../../lib/session.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: '请先登录后再兑换。' }, { status: 401 });
  const { code = '' } = await request.json();
  const result = redeemCode(getDb(), String(code), user.id);
  if (!result.ok) return NextResponse.json({ message: result.reason === 'used' ? '这个兑换码已被使用。' : '兑换码无效或已作废。' }, { status: 400 });
  const pattern = getPatternById(result.patternId);
  return NextResponse.json({ patternId: pattern.id, slug: pattern.slug });
}

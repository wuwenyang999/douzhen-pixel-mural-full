import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db.js';
import { getPatternById } from '../../../lib/patterns.js';
import { redeemCode } from '../../../lib/redemption.js';
import { getCurrentUser } from '../../../lib/session.js';
import { clientIp, redeemLimiter } from '../../../lib/rate-limit.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: '请先登录后再兑换。' }, { status: 401 });

  const ip = clientIp(request);
  const limitKey = `${ip}:${user.id}`;
  const limit = redeemLimiter.check(limitKey);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterMs / 1000 / 60);
    return NextResponse.json({ message: `尝试过于频繁，请约 ${mins} 分钟后再试。` }, { status: 429 });
  }

  const { code = '' } = await request.json();
  const result = redeemCode(getDb(), String(code), user.id);
  if (!result.ok) {
    redeemLimiter.fail(limitKey);
    // 统一文案，不暴露兑换码是否存在。
    const message = result.reason === 'used'
      ? '这个兑换码已被使用，无法再次兑换。'
      : '兑换码无效或已作废，请核对后再试。';
    return NextResponse.json({ message }, { status: 400 });
  }

  redeemLimiter.reset(limitKey);
  const pattern = getPatternById(result.patternId);
  return NextResponse.json({ patternId: pattern.id, slug: pattern.slug });
}

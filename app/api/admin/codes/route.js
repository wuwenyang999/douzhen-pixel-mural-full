import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth-store.js';
import { getDb } from '../../../../lib/db.js';
import { getPatternById } from '../../../../lib/patterns.js';
import { createRedemptionCodes, revokeCode } from '../../../../lib/redemption.js';
import { getCurrentUser } from '../../../../lib/session.js';

export const runtime = 'nodejs';

async function getAdmin() {
  const user = await getCurrentUser();
  try {
    requireAdmin(user);
    return user;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ message: '没有管理权限。' }, { status: 403 });
  const codes = getDb().prepare(`
    SELECT redemption_codes.id, redemption_codes.redeemed_at, redemption_codes.revoked_at, patterns.title
    FROM redemption_codes INNER JOIN patterns ON patterns.id = redemption_codes.pattern_id
    ORDER BY redemption_codes.id DESC LIMIT 30
  `).all().map((row) => ({ id: row.id, title: row.title, redeemedAt: row.redeemed_at, revokedAt: row.revoked_at }));
  return NextResponse.json({ codes });
}

export async function POST(request) {
  if (!(await getAdmin())) return NextResponse.json({ message: '没有管理权限。' }, { status: 403 });

  const { action, patternId, count, codeId } = await request.json();
  if (action === 'revoke') return NextResponse.json({ revoked: revokeCode(getDb(), Number(codeId)) });
  const safeCount = Number(count);
  if (!getPatternById(String(patternId)) || !Number.isInteger(safeCount) || safeCount < 1 || safeCount > 100) {
    return NextResponse.json({ message: '图纸或兑换码数量无效。' }, { status: 400 });
  }

  return NextResponse.json({ codes: createRedemptionCodes(getDb(), String(patternId), safeCount) });
}

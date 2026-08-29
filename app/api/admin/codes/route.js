import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth-store.js';
import { getDb } from '../../../../lib/db.js';
import { getPatternById } from '../../../../lib/patterns.js';
import {
  createRedemptionBatch,
  manualGrant,
  revokeCode,
} from '../../../../lib/redemption.js';
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
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ message: '没有管理权限。' }, { status: 403 });
  const db = getDb();

  const codes = db
    .prepare(
      `SELECT c.id, c.status, c.redeemed_at, c.revoked_at, p.title, b.id AS batch_id
       FROM redemption_codes c
       INNER JOIN patterns p ON p.id = c.pattern_id
       LEFT JOIN redemption_batches b ON b.id = c.batch_id
       ORDER BY c.id DESC LIMIT 50`,
    )
    .all();

  const batches = db
    .prepare(
      `SELECT b.id, b.quantity, b.created_at, p.title,
              SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) AS active_count,
              SUM(CASE WHEN c.status = 'redeemed' THEN 1 ELSE 0 END) AS redeemed_count,
              SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) AS revoked_count
       FROM redemption_batches b
       INNER JOIN patterns p ON p.id = b.pattern_id
       LEFT JOIN redemption_codes c ON c.batch_id = b.id
       GROUP BY b.id
       ORDER BY b.created_at DESC LIMIT 20`,
    )
    .all();

  const users = db
    .prepare(`SELECT id, email FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`)
    .all();

  const audit = db
    .prepare(
      `SELECT id, admin_id, action, target_type, target_id, detail_json, created_at
       FROM admin_audit_logs ORDER BY id DESC LIMIT 50`,
    )
    .all();

  return NextResponse.json({ codes, batches, users, audit });
}

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ message: '没有管理权限。' }, { status: 403 });
  const db = getDb();
  const body = await request.json();

  if (body.action === 'revoke') {
    return NextResponse.json({ revoked: revokeCode(db, Number(body.codeId), admin.id) });
  }

  if (body.action === 'grant') {
    const pattern = getPatternById(String(body.patternId));
    const user = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(String(body.userId));
    if (!pattern || !user) return NextResponse.json({ message: '图纸或用户不存在。' }, { status: 400 });
    manualGrant(db, { patternId: pattern.id, userId: user.id, adminId: admin.id });
    return NextResponse.json({ granted: true });
  }

  // 默认：生成一批兑换码
  const { patternId, count, note } = body;
  const safeCount = Number(count);
  if (!getPatternById(String(patternId)) || !Number.isInteger(safeCount) || safeCount < 1 || safeCount > 200) {
    return NextResponse.json({ message: '图纸或兑换码数量无效（单次 1-200）。' }, { status: 400 });
  }

  const result = createRedemptionBatch(db, {
    patternId: String(patternId),
    quantity: safeCount,
    adminId: admin.id,
    note: String(note || ''),
  });
  return NextResponse.json(result);
}

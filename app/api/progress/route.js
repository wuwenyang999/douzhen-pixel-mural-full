import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db.js';
import { saveProgress } from '../../../lib/redemption.js';
import { getCurrentUser } from '../../../lib/session.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: '请先登录。' }, { status: 401 });
  const { patternId, sectionId, complete } = await request.json();
  try {
    return NextResponse.json(saveProgress(getDb(), user.id, String(patternId), String(sectionId), Boolean(complete)));
  } catch {
    return NextResponse.json({ message: '这张图纸尚未解锁。' }, { status: 403 });
  }
}

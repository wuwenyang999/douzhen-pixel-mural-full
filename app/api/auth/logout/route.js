import { NextResponse } from 'next/server';
import { clearSession } from '../../../../lib/session.js';

export async function POST(request) {
  await clearSession();
  return NextResponse.redirect(new URL('/', request.url));
}

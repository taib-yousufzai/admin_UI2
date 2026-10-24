import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'admin-ui',
    timestamp: new Date().toISOString(),
  });
}

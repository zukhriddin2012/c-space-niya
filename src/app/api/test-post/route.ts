import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ method: 'GET', status: 'ok', time: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ method: 'POST', status: 'ok', body, time: new Date().toISOString() });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

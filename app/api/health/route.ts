import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'aura-scientists',
      runtime: 'nextjs',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      configured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

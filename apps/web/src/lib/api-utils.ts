import { NextResponse } from 'next/server';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (err.message === 'SUPABASE_CONFIG_MISSING') {
      return NextResponse.json(
        { error: 'Service not configured. Set SUPABASE environment variables.' },
        { status: 503 }
      );
    }
  }
  console.error('Unhandled API error:', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

import { NextResponse } from 'next/server';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return request.headers.get('x-real-ip') || null;
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      err.details ? { error: err.message, details: err.details } : { error: err.message },
      { status: err.status }
    );
  }

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
    if (err.message.startsWith('INVALID_ENV:')) {
      return NextResponse.json(
        { error: err.message.replace('INVALID_ENV:', '').trim() || 'Invalid environment configuration' },
        { status: 503 }
      );
    }
  }
  console.error('Unhandled API error:', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

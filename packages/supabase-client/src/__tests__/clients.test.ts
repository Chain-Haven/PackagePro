import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createBrowserClient } from '../browser';
import { createServerClient } from '../server';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('createBrowserClient', () => {
  test('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    expect(() => createBrowserClient()).toThrow(/Missing Supabase environment variables/);
  });

  test('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(() => createBrowserClient()).toThrow(/Missing Supabase environment variables/);
  });

  test('returns a client when both env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});

describe('createServerClient', () => {
  test('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    expect(() => createServerClient()).toThrow(/Missing Supabase server environment variables/);
  });

  test('throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(() => createServerClient()).toThrow(/Missing Supabase server environment variables/);
  });

  test('returns a non-persistent client when env is configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const client = createServerClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});

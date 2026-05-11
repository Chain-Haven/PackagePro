import { describe, expect, it, vi } from 'vitest';
import { buildAuditQueries } from '../audit-page-data';

function createQueryRecorder(
  table: string,
  calls: Array<{ table: string; method: string; args: unknown[] }>
) {
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      calls.push({ table, method: 'eq', args: [column, value] });
      return query;
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      calls.push({ table, method: 'in', args: [column, values] });
      return query;
    }),
    order: vi.fn((column: string, options: { ascending: boolean }) => {
      calls.push({ table, method: 'order', args: [column, options] });
      return query;
    }),
    limit: vi.fn((value: number) => {
      calls.push({ table, method: 'limit', args: [value] });
      return query;
    }),
  };

  return query;
}

describe('buildAuditQueries', () => {
  it('scopes non-audit tables to the organization store ids', () => {
    const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
    const supabase = {
      from: (table: string) => ({
        select: () => createQueryRecorder(table, calls),
      }),
    };

    buildAuditQueries(supabase, 'org-1', ['store-1', 'store-2']);

    expect(calls).toContainEqual({
      table: 'email_events',
      method: 'in',
      args: ['store_id', ['store-1', 'store-2']],
    });
    expect(calls).toContainEqual({
      table: 'webhook_deliveries',
      method: 'in',
      args: ['store_id', ['store-1', 'store-2']],
    });
  });
});

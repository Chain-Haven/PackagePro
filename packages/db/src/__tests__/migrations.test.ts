import { describe, expect, test } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MIGRATION_FILES } from '../index';

const migrationsDir = resolve(__dirname, '../../migrations');

describe('MIGRATION_FILES', () => {
  test('matches migrations/ directory contents', () => {
    const onDisk = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    expect([...MIGRATION_FILES].sort()).toEqual(onDisk);
  });

  test('is sorted by numeric prefix', () => {
    const sorted = [...MIGRATION_FILES].sort();
    expect([...MIGRATION_FILES]).toEqual(sorted);
  });

  test('has unique numeric prefixes', () => {
    const prefixes = MIGRATION_FILES.map((f) => f.split('_')[0]);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  test('every entry follows NNN_description.sql format', () => {
    for (const file of MIGRATION_FILES) {
      expect(file).toMatch(/^\d{3}_[a-z0-9_]+\.sql$/);
    }
  });
});

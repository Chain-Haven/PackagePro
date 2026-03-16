import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { findForbiddenEnvFiles } from './verify-no-local-secrets.mjs';

test('findForbiddenEnvFiles reports forbidden env files', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'packagepro-secrets-'));
  await fs.writeFile(path.join(tempDir, '.env.local'), 'SECRET=1\n', 'utf8');
  await fs.writeFile(path.join(tempDir, '.env.production'), 'SECRET=2\n', 'utf8');

  const result = await findForbiddenEnvFiles(tempDir);

  assert.deepEqual(
    result.map((entry) => path.basename(entry)).sort(),
    ['.env.local', '.env.production']
  );
});

test('findForbiddenEnvFiles returns an empty list when none exist', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'packagepro-secrets-empty-'));
  const result = await findForbiddenEnvFiles(tempDir);
  assert.deepEqual(result, []);
});

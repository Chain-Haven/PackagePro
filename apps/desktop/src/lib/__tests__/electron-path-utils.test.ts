import path from 'path';
import { describe, expect, it } from 'vitest';
import { resolveWithin } from '../../../electron/path-utils';

describe('resolveWithin', () => {
  it('allows paths within the base directory', () => {
    const result = resolveWithin('/tmp/packagepro', '/tmp/packagepro/session/file.enc');
    expect(result).toBe(path.resolve('/tmp/packagepro/session/file.enc'));
  });

  it('rejects paths that escape the base directory', () => {
    expect(() =>
      resolveWithin('/tmp/packagepro', '/tmp/packagepro/../outside/file.enc')
    ).toThrow('Path escapes allowed directory');
  });
});

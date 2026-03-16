import { describe, expect, it, vi } from 'vitest';
import { createConfigUpdater } from '../../../electron/config-store';

describe('createConfigUpdater', () => {
  it('serializes overlapping config patches without dropping keys', async () => {
    let state: Record<string, unknown> = {};
    const readConfig = vi.fn(async () => ({ ...state }));
    const writeConfig = vi.fn(async (next: Record<string, unknown>) => {
      await Promise.resolve();
      state = { ...next };
    });
    const updateConfig = createConfigUpdater(readConfig, writeConfig);

    await Promise.all([
      updateConfig({ alpha: 1 }),
      updateConfig({ beta: 2 }),
      updateConfig({ gamma: 3 }),
    ]);

    expect(state).toEqual({
      alpha: 1,
      beta: 2,
      gamma: 3,
    });
  });
});

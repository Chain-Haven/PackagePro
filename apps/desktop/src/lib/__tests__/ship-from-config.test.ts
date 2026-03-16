import { describe, expect, it, vi } from 'vitest';
import { loadShipFromConfig, persistShipFromConfig } from '../ship-from-config';

describe('ship-from config helpers', () => {
  it('loads previously saved warehouse values from electron config', async () => {
    const getConfig = vi.fn(async (key: string) => {
      const values: Record<string, string> = {
        ship_from_name: 'Warehouse',
        ship_from_address: '123 Main St',
        ship_from_city: 'Boise',
        ship_from_state: 'ID',
        ship_from_zip: '83701',
      };

      return values[key] ?? null;
    });

    const config = await loadShipFromConfig({
      getConfig,
    } as unknown as Window['electronAPI']);

    expect(config).toEqual({
      name: 'Warehouse',
      address: '123 Main St',
      city: 'Boise',
      state: 'ID',
      zip: '83701',
    });
  });

  it('persists warehouse values through electron config', async () => {
    const setConfigMany = vi.fn(async () => ({ success: true }));

    await persistShipFromConfig(
      {
        setConfigMany,
      } as unknown as Window['electronAPI'],
      {
        name: 'Warehouse',
        address: '123 Main St',
        city: 'Boise',
        state: 'ID',
        zip: '83701',
      }
    );

    expect(setConfigMany).toHaveBeenCalledTimes(1);
    expect(setConfigMany).toHaveBeenCalledWith(
      expect.objectContaining({
        ship_from_address: '123 Main St',
      })
    );
  });
});

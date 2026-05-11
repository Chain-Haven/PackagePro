export type ShipFromConfig = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const SHIP_FROM_KEYS = {
  name: 'ship_from_name',
  address: 'ship_from_address',
  city: 'ship_from_city',
  state: 'ship_from_state',
  zip: 'ship_from_zip',
} as const;

export async function loadShipFromConfig(
  electronAPI: Window['electronAPI']
): Promise<Partial<ShipFromConfig>> {
  const [name, address, city, state, zip] = await Promise.all([
    electronAPI.getConfig(SHIP_FROM_KEYS.name),
    electronAPI.getConfig(SHIP_FROM_KEYS.address),
    electronAPI.getConfig(SHIP_FROM_KEYS.city),
    electronAPI.getConfig(SHIP_FROM_KEYS.state),
    electronAPI.getConfig(SHIP_FROM_KEYS.zip),
  ]);

  return {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof address === 'string' ? { address } : {}),
    ...(typeof city === 'string' ? { city } : {}),
    ...(typeof state === 'string' ? { state } : {}),
    ...(typeof zip === 'string' ? { zip } : {}),
  };
}

export async function persistShipFromConfig(
  electronAPI: Window['electronAPI'],
  config: ShipFromConfig
) {
  await electronAPI.setConfigMany({
    [SHIP_FROM_KEYS.name]: config.name,
    [SHIP_FROM_KEYS.address]: config.address,
    [SHIP_FROM_KEYS.city]: config.city,
    [SHIP_FROM_KEYS.state]: config.state,
    [SHIP_FROM_KEYS.zip]: config.zip,
  });
}

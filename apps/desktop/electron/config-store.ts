export function createConfigUpdater<T extends Record<string, unknown>>(
  readConfig: () => Promise<T>,
  writeConfig: (data: T) => Promise<void>
) {
  let queue = Promise.resolve();

  return async (patch: Partial<T>) => {
    const run = queue.then(async () => {
      const current = await readConfig();
      const next = {
        ...current,
        ...patch,
      } as T;
      await writeConfig(next);
      return next;
    });

    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

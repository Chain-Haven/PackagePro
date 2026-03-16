import path from 'path';

export function resolveWithin(baseDir: string, targetPath: string) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path escapes allowed directory');
  }

  return resolvedTarget;
}

import fs from 'node:fs/promises';
import path from 'node:path';

const FORBIDDEN_ENV_FILES = ['.env.local', '.env.production'];

export async function findForbiddenEnvFiles(baseDir, fileNames = FORBIDDEN_ENV_FILES) {
  const matches = [];

  for (const fileName of fileNames) {
    const targetPath = path.join(baseDir, fileName);
    try {
      const stats = await fs.stat(targetPath);
      if (stats.isFile()) {
        matches.push(targetPath);
      }
    } catch {
      // Ignore missing files.
    }
  }

  return matches;
}

async function main() {
  const matches = await findForbiddenEnvFiles(process.cwd());
  if (matches.length === 0) {
    return;
  }

  const relativeMatches = matches.map((entry) => path.relative(process.cwd(), entry));
  const error = [
    'Refusing to continue because forbidden local secret files exist:',
    ...relativeMatches.map((entry) => `- ${entry}`),
    'Move production secrets to managed deployment stores before building or shipping.',
  ].join('\n');

  throw new Error(error);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

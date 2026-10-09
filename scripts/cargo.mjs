import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export function cargo(args) {
  const local = join(homedir(), '.cargo', 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo');
  const result = spawnSync(existsSync(local) ? local : 'cargo', args, { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (process.argv[1]?.endsWith('/cargo.mjs')) cargo(process.argv.slice(2));

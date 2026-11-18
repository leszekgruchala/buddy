import { lstat, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { object } from './types.ts';

/** Parse an untrusted JSON file without following symlinks or blocking on special files. */
export async function readRegularJson(path: string): Promise<unknown> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected a regular JSON file at ${path}.`);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!(await handle.stat()).isFile()) throw new Error(`Expected a regular JSON file at ${path}.`);
    return JSON.parse(await handle.readFile('utf8'));
  } finally { await handle.close(); }
}

/** Reject existing symlink ancestors before creating manager directories or snapshots. */
export async function assertRealParents(path: string): Promise<void> {
  let candidate = resolve(path);
  for (;;) {
    try {
      const info = await lstat(candidate);
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(candidate) !== candidate) {
        throw new Error(`Manager paths must use real directories, without symlinks: ${candidate}`);
      }
      return;
    } catch (error) {
      if (!object(error) || error.code !== 'ENOENT') throw error;
      candidate = dirname(candidate);
    }
  }
}

import { execFile } from 'node:child_process';
import type { Command, Runner } from './types.ts';

/** Execute argument arrays without a shell, with bounded time and captured output.
 * @param signal Cancels the running command. Cleanup can use a separate runner.
 * @param timeout Maximum elapsed milliseconds per child process; cleanup uses a shorter bound.
 */
export function runner(signal?: AbortSignal, timeout = 120_000): Runner {
  return (command: Command) => new Promise((resolve, reject) => {
    const activeSignal = command.signal && signal ? AbortSignal.any([signal, command.signal]) : command.signal ?? signal;
    if (activeSignal?.aborted) {
      reject(new Error('Operation cancelled.'));
      return;
    }
    const limit = Math.min(timeout, command.timeoutMs ?? timeout);
    const expiresAt = performance.now() + limit;
    const timeoutError = () => {
      const label = command.timeoutMs === undefined ? command.bin : [command.bin, ...command.args].join(' ');
      return new Error(`Cannot run ${label}: timed out after ${limit} ms.`);
    };
    let stopped: Error | undefined;
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    const child = execFile(command.bin, command.args, {
      cwd: command.cwd,
      encoding: 'utf8',
      killSignal: 'SIGKILL',
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      clearTimeout(deadlineTimer);
      clearTimeout(cancelTimer);
      activeSignal?.removeEventListener('abort', cancel);
      const failure = stopped ?? (performance.now() >= expiresAt ? timeoutError() : undefined);
      if (failure) {
        reject(failure);
        return;
      }
      if (error && typeof error.code !== 'number') {
        reject(new Error(`Cannot run ${command.bin}: ${error.message}`));
        return;
      }
      resolve({ code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr });
    });
    const forceStop = () => {
      // Descendants can keep the pipes open after the direct child exits.
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.kill('SIGKILL');
    };
    const deadlineTimer = setTimeout(() => {
      stopped ??= timeoutError();
      forceStop();
    }, Math.ceil(expiresAt - performance.now()));
    const cancel = () => {
      if (stopped) return;
      stopped = new Error('Operation cancelled.');
      cancelTimer = setTimeout(forceStop, 500);
      child.kill('SIGTERM');
    };
    activeSignal?.addEventListener('abort', cancel, { once: true });
  });
}

/** Read native JSON, including Claude's final-line mutation result format. */
export function parseJson(output: string): unknown {
  try { return JSON.parse(output); } catch {
    const last = output.trim().split('\n').at(-1);
    if (last) {
      try { return JSON.parse(last); } catch { /* Report the boundary failure below. */ }
    }
    throw new Error('The agent returned invalid JSON. Update the agent or use its native plugin commands.');
  }
}

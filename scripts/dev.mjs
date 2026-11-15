import { spawn } from 'node:child_process';
import { spawnSync } from 'node:child_process';

const commands = [
  ['API', ['run', 'dev'], { cwd: 'apps/api' }],
  ['Web', ['run', 'dev'], { cwd: 'apps/web' }],
];

const children = commands.map(([label, args, options]) => {
  const child = spawn('npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  child.on('error', (error) => {
    process.stderr.write(`${label} dev server could not start: ${error.message}\n`);
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (code && code !== 0) stopAll(code);
  });
  return child;
});

let stopping = false;
function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = exitCode;
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

/**
 * Copies the secret/integration variables from a local env file into the
 * linked Vercel project's Production environment (docs/deployment.md).
 * Values are piped straight to the Vercel CLI and never printed.
 *
 *   node scripts/vercel-env-push.mjs api   # apps/api/.env  -> linked API project
 *   node scripts/vercel-env-push.mjs web   # apps/web/.env.local -> linked web project
 *
 * Only the names listed below are sent. Local-only values (PORT, NODE_ENV,
 * localhost URLs) are deliberately skipped; set those per environment.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERCEL = ['--yes', 'vercel@67.0.0'];

const TARGETS = {
  api: {
    dir: 'apps/api',
    files: ['.env.local', '.env'],
    names: ['SARVAM_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    sensitive: new Set(['SARVAM_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),
  },
  web: {
    dir: 'apps/web',
    files: ['.env.local', '.env'],
    names: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ],
    sensitive: new Set(),
  },
};

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const which = process.argv[2];
const target = TARGETS[which];
if (!target) {
  console.error('Usage: node scripts/vercel-env-push.mjs <api|web>');
  process.exit(1);
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(repoRoot, target.dir);
if (!existsSync(join(dir, '.vercel', 'project.json'))) {
  console.error(
    `${target.dir} is not linked to a Vercel project yet (run "npx vercel link" there first).`,
  );
  process.exit(1);
}

const values = {};
for (const file of [...target.files].reverse()) {
  const path = join(dir, file);
  if (existsSync(path)) Object.assign(values, parseEnv(readFileSync(path, 'utf8')));
}

let failed = 0;
for (const name of target.names) {
  const value = values[name];
  if (!value) {
    console.log(`skip  ${name} (not set locally)`);
    continue;
  }
  const args = [...VERCEL, 'env', 'add', name, 'production', '--force'];
  if (target.sensitive.has(name)) args.push('--sensitive');
  const result = spawnSync('npx', args, {
    cwd: dir,
    input: value,
    stdio: ['pipe', 'ignore', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (result.status === 0) console.log(`set   ${name}`);
  else {
    failed += 1;
    console.log(`FAIL  ${name}: ${String(result.stderr).trim().split('\n').pop()}`);
  }
}
process.exit(failed ? 1 : 0);

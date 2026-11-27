/**
 * Builds apps/api as one Vercel Function using the Build Output API
 * (https://vercel.com/docs/build-output-api/v3), so Vercel never has to
 * compile the workspace TypeScript packages itself.
 *
 *   node scripts/build-vercel.mjs   (from apps/api)
 *
 * Output: apps/api/.vercel/output — deploy with `vercel deploy --prebuilt`.
 */
import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.vercel', 'output');
const fn = join(output, 'functions', 'index.func');

await rm(output, { recursive: true, force: true });
await mkdir(fn, { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'vercel.ts')],
  outfile: join(fn, 'index.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: 'linked',
  // Everything (including @tattva/* TypeScript sources) is bundled, so the
  // function needs no node_modules at runtime.
  logLevel: 'info',
});

await writeFile(
  join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      // Sarvam answers can take ~20 s; leave headroom for one retry.
      maxDuration: 60,
    },
    null,
    2,
  ),
);

await writeFile(
  join(output, 'config.json'),
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/index' }] }, null, 2),
);

console.log(`Built Vercel output at ${output}`);

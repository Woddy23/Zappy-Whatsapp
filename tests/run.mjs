import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const files = (await readdir('tests')).filter(name => name.endsWith('.test.mjs')).sort();
if (!files.length) throw new Error('No regression test files found.');
await build({ entryPoints: ['src/core.ts', 'src/adapter.ts'], outdir: 'tests/compiled', bundle: true, format: 'esm', platform: 'node', target: 'node22' });
const result = spawnSync(process.execPath, ['--test', ...files.map(name => `tests/${name}`)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

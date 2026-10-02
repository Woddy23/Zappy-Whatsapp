import { spawnSync } from 'node:child_process';
const result = spawnSync(process.env.PYTHON ?? 'python', ['tests/browser-check.py'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

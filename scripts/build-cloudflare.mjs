import { spawnSync } from 'node:child_process';

// The deployed browser calls /api on the same Worker origin.
// API_ORIGIN is configured on the Worker, rather than embedded in the bundle.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_BUILD: '1', NEXT_PUBLIC_API_URL: '' },
});
process.exit(result.status ?? 1);

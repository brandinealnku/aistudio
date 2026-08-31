import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const token = `studio_${randomBytes(24).toString('base64url')}`;
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

console.log('Creating RESET_TOKEN for Cloudflare Worker "aistudio"...');

const result = spawnSync(
  npx,
  ['--yes', 'wrangler', 'secret', 'put', 'RESET_TOKEN', '--name', 'aistudio'],
  {
    input: `${token}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
  },
);

if (result.error) {
  console.error('\nCould not run Wrangler:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\nRESET_TOKEN was not created. If Wrangler asks you to authenticate, run `npx wrangler login` and then run this script again.');
  process.exit(result.status ?? 1);
}

console.log('\nRESET_TOKEN created and deployed successfully.');
console.log('Save this token now — Cloudflare will not show it again:');
console.log(`\n${token}\n`);
console.log('Verify the binding at:');
console.log('https://aistudio.brandineildehaven.workers.dev/health');
console.log('You should see: "resetTokenConfigured": true');

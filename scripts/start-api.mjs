// `npm run start:api`: the Worker API on port 8787. Without a DATABASE_URL in .dev.vars it
// connects to the local database from `npm run start:db`.
import { spawn } from 'node:child_process';
import { LOCAL_DB_URL, readDevVar } from './dev-vars.mjs';

const args = ['wrangler', 'dev', '--port', '8787'];
if (!readDevVar('DATABASE_URL')) {
  args.push('--var', `DATABASE_URL:${LOCAL_DB_URL}`);
  console.log('Using the local database (no DATABASE_URL in .dev.vars).');
}

const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

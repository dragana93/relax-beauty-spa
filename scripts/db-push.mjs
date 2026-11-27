// `npm run db:push`: applies supabase/migrations to a Supabase database.
// The connection string comes from SUPABASE_DB_URL (Cloudflare build) or, when it is not set,
// is asked for in the terminal (hidden, never saved). Use the "Session pooler" string
// (port 5432) from Supabase → Connect, with the database password filled in.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { readDevVar } from './dev-vars.mjs';

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      // Show the question, hide what is typed or pasted.
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

let url = process.env.SUPABASE_DB_URL?.trim();
let source = 'the SUPABASE_DB_URL variable of this terminal';
if (!url) {
  url = readDevVar('SUPABASE_DB_URL')?.trim();
  source = '.dev.vars';
}
if (!url) {
  if (!process.stdin.isTTY) {
    console.error('SUPABASE_DB_URL is not set. See docs/SETUP.md.');
    process.exit(1);
  }
  console.log('Supabase → Connect → Direct → Session pooler (port 5432).');
  console.log('Paste it exactly as Supabase shows it, with [YOUR-DATABASE-PASSWORD] in it.');
  url = await askHidden('Connection string (hidden), then Enter: ');
  source = 'what you pasted';
}

// The password is asked for separately and encoded here, so special characters just work.
const placeholder = /\[YOUR-[A-Z-]*PASSWORD\]/;
if (placeholder.test(url) && process.stdin.isTTY) {
  const password = await askHidden('Database password (hidden), then Enter: ');
  if (!password) {
    console.error('No password entered.');
    process.exit(1);
  }
  url = url.replace(placeholder, encodeURIComponent(password));
}

// Show what is used, without the password, so a wrong or old string is easy to spot.
const shown = url.replace(/^(\w+:\/\/[^:@/]+:)([^@]*)@/, (_m, start, password) => {
  return `${start}${'*'.repeat(Math.min(password.length, 12))} (${password.length} characters)@`;
});
console.log(`Connection string from ${source}:\n  ${shown}`);
if (source.startsWith('the SUPABASE')) {
  console.log('  (To use another string: close this terminal, open a new one and run again.)');
}

if ((url.match(/postgres(ql)?:\/\//g) ?? []).length > 1) {
  console.error('The connection string was pasted twice. Copy it once and try again.');
  process.exit(1);
}
if (/@db\.[a-z0-9]+\.supabase\.co/.test(url)) {
  console.error(
    'This is the "Direct connection" (db....supabase.co), which often does not work from home\n' +
      'internet. In Supabase → Connect → Direct, choose "Session pooler" and copy that string\n' +
      '(it contains pooler.supabase.com:5432).',
  );
  process.exit(1);
}
if (placeholder.test(url)) {
  console.error('Replace [YOUR-PASSWORD] in the connection string with the database password.');
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error('That does not look like a connection string (it starts with postgresql://).');
  process.exit(1);
}
if (/:6543\//.test(url)) {
  console.error('This is the Transaction pooler (port 6543). Use the Session pooler (port 5432).');
  process.exit(1);
}

// Run the Supabase CLI directly (no shell), so special characters in the password are safe.
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('supabase/package.json')), 'dist', 'supabase.js');
const result = spawnSync(
  process.execPath,
  // In the Cloudflare build nobody can answer the confirmation question, so answer it there.
  [
    cli,
    'db',
    'push',
    `--remote=${url}`,
    '--include-all',
    ...(process.stdin.isTTY ? [] : ['--yes']),
  ],
  {
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 1);

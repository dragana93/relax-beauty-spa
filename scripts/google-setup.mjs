// `npm run google:setup`: prepares the owner's Google Sheet once (safe to run again).
// - sheet "Rezervacije": headers, formats, drop-downs for the owner's columns L–N
// - sheet "Promet": monthly and per-treatment totals, as formulas
// Needs GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SHEET_ID (environment or .dev.vars), and the
// sheet must be shared with the service account as an editor. See docs/SETUP.md.
import { importPKCS8, SignJWT } from 'jose';
import { readFileSync } from 'node:fs';
import { readDevVar } from './dev-vars.mjs';

const setting = (name) => process.env[name] || readDevVar(name);
const rawKey = setting('GOOGLE_SERVICE_ACCOUNT_KEY');
const sheetId = setting('GOOGLE_SHEET_ID');
if (!rawKey || !sheetId) {
  console.error('Set GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SHEET_ID first. See docs/SETUP.md.');
  process.exit(1);
}
// The key may be the JSON itself or a path to the downloaded .json file.
const key = JSON.parse(rawKey.trim().startsWith('{') ? rawKey : readFileSync(rawKey, 'utf8'));

const BOOKINGS = 'Rezervacije';
const TOTALS = 'Promet';
const HEADER = [
  'Broj rezervacije',
  'Datum',
  'Od',
  'Do',
  'Tretman',
  'Klijent',
  'Telefon',
  'E-mail',
  'Cijena (€)',
  'Status',
  'Rezervirano',
  'Došla',
  'Naplaćeno (€)',
  'Način plaćanja',
];

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/spreadsheets' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(key.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(key.private_key, 'RS256'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok)
    throw new Error(`Google login failed (${res.status}). Check the service account key.`);
  return (await res.json()).access_token;
}

const auth = { Authorization: `Bearer ${await token()}` };
const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 404
        ? ' Is the sheet shared with ' + key.client_email + '?'
        : '';
    throw new Error(`Google Sheets ${method} ${path} failed (${res.status}).${hint}`);
  }
  return res.json();
}

async function sheetIds() {
  const meta = await call('GET', '?fields=sheets.properties');
  return Object.fromEntries(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
}

// 1. Croatian locale (dates, "€", ";" in formulas) and the studio's time zone; both sheets.
let ids = await sheetIds();
await call('POST', ':batchUpdate', {
  requests: [
    {
      updateSpreadsheetProperties: {
        properties: { locale: 'hr_HR', timeZone: 'Europe/Zagreb' },
        fields: 'locale,timeZone',
      },
    },
    ...[BOOKINGS, TOTALS]
      .filter((title) => !(title in ids))
      .map((title) => ({ addSheet: { properties: { title } } })),
  ],
});
ids = await sheetIds();
const bookings = ids[BOOKINGS];
const totals = ids[TOTALS];

// 2. Formats and drop-downs on "Rezervacije".
const columns = (from, to) => ({
  sheetId: bookings,
  startRowIndex: 1,
  startColumnIndex: from,
  endColumnIndex: to,
});
const format = (from, to, numberFormat) => ({
  repeatCell: {
    range: columns(from, to),
    cell: { userEnteredFormat: { numberFormat } },
    fields: 'userEnteredFormat.numberFormat',
  },
});
const list = (column, values) => ({
  setDataValidation: {
    range: columns(column, column + 1),
    rule: {
      condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) },
      showCustomUi: true,
      strict: false,
    },
  },
});
const euro = { type: 'CURRENCY', pattern: '#,##0.00 "€"' };
await call('POST', ':batchUpdate', {
  requests: [
    {
      updateSheetProperties: {
        properties: { sheetId: bookings, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId: bookings, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.93, green: 0.89, blue: 0.84 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    },
    format(1, 2, { type: 'DATE', pattern: 'dd.mm.yyyy.' }),
    format(2, 4, { type: 'TIME', pattern: 'hh:mm' }),
    format(8, 9, euro),
    format(12, 13, euro),
    list(11, ['Da', 'Ne']),
    list(13, ['Gotovina', 'Kartica', 'Ostalo']),
  ],
});
await call('PUT', `/values/${encodeURIComponent(`${BOOKINGS}!A1:N1`)}?valueInputOption=RAW`, {
  values: [HEADER],
});

// 3. "Promet": the year in I1 (editable), one row per month, then one row per treatment.
// Formulas use ";" because the sheet's locale is Croatian.
const R = `${BOOKINGS}!`;
const inMonth = (cell) => `${R}$B:$B;">="&${cell};${R}$B:$B;"<"&EDATE(${cell};1)`;
const inYear = `${R}$B:$B;">="&DATE($I$1;1;1);${R}$B:$B;"<"&DATE($I$1+1;1;1)`;

const rows = [
  [
    'Mjesec',
    'Potvrđeni termini',
    'Otkazani termini',
    'Zakazani promet (€)',
    'Naplaćeno (€)',
    'Klijenti došli',
    '',
    'Godina',
    '=YEAR(TODAY())',
  ],
];
for (let month = 1; month <= 12; month++) {
  const r = month + 1;
  const m = `$A${r}`;
  rows.push([
    `=DATE($I$1;${month};1)`,
    `=COUNTIFS(${inMonth(m)};${R}$J:$J;"potvrđeno")`,
    `=COUNTIFS(${inMonth(m)};${R}$J:$J;"otkazano")`,
    `=SUMIFS(${R}$I:$I;${inMonth(m)};${R}$J:$J;"potvrđeno")`,
    `=SUMIFS(${R}$M:$M;${inMonth(m)})`,
    `=COUNTIFS(${inMonth(m)};${R}$L:$L;"Da")`,
  ]);
}
rows.push([
  'Ukupno',
  '=SUM(B2:B13)',
  '=SUM(C2:C13)',
  '=SUM(D2:D13)',
  '=SUM(E2:E13)',
  '=SUM(F2:F13)',
]);
rows.push([]);
rows.push(['Tretman (godina iz I1)', 'Potvrđeni termini', 'Zakazani promet (€)', 'Naplaćeno (€)']);
const firstTreatmentRow = rows.length + 1;
for (let i = 0; i < 40; i++) {
  const r = firstTreatmentRow + i;
  const t = `$A${r}`;
  rows.push([
    i === 0 ? `=IFERROR(SORT(UNIQUE(FILTER(${R}E2:E;${R}E2:E<>""))))` : '',
    `=IF(${t}="";"";COUNTIFS(${R}$E:$E;${t};${R}$J:$J;"potvrđeno";${inYear}))`,
    `=IF(${t}="";"";SUMIFS(${R}$I:$I;${R}$E:$E;${t};${R}$J:$J;"potvrđeno";${inYear}))`,
    `=IF(${t}="";"";SUMIFS(${R}$M:$M;${R}$E:$E;${t};${inYear}))`,
  ]);
}
await call('POST', `/values/${encodeURIComponent(`${TOTALS}!A1:I${rows.length + 5}`)}:clear`, {});
await call('PUT', `/values/${encodeURIComponent(`${TOTALS}!A1`)}?valueInputOption=USER_ENTERED`, {
  values: rows,
});

const totalsRange = (r1, r2, c1, c2) => ({
  sheetId: totals,
  startRowIndex: r1,
  endRowIndex: r2,
  startColumnIndex: c1,
  endColumnIndex: c2,
});
await call('POST', ':batchUpdate', {
  requests: [
    {
      repeatCell: {
        range: totalsRange(1, 13, 0, 1),
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'mmmm yyyy' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: totalsRange(1, 14, 3, 5),
        cell: { userEnteredFormat: { numberFormat: euro } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: totalsRange(firstTreatmentRow - 1, firstTreatmentRow + 40, 2, 4),
        cell: { userEnteredFormat: { numberFormat: euro } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: totalsRange(0, 1, 0, 9),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    {
      repeatCell: {
        range: totalsRange(13, 14, 0, 6),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    {
      repeatCell: {
        range: totalsRange(firstTreatmentRow - 2, firstTreatmentRow - 1, 0, 4),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
  ],
});

console.log(`Done. Sheets "${BOOKINGS}" and "${TOTALS}" are ready.`);

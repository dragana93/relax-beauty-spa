# Dijana Savanović – Relax, Beauty and Spa Studio

Angular 22 website with online booking, served by one Cloudflare Worker.

- **Database:** Supabase (Postgres, EU)
- **Email:** Brevo (EU, free up to 300 a day)
- **Owner tools:** Google Calendar (two-way) and a Google Sheet for bookings and revenue
- **Deploys:** GitHub → Cloudflare Workers Builds

The original plan is in [docs/SPECIFICATION.md](docs/SPECIFICATION.md). **Account setup step by
step: [docs/SETUP.md](docs/SETUP.md).**

## Requirements

- Node 22.22.3+, 24.15+ or 26+
- Windows: a current Microsoft Visual C++ Redistributable (x64), needed by Cloudflare's local runtime
- Run commands from a path with an uppercase drive letter (`C:\...`); Vitest fails from `c:\...`
- No accounts are needed for `npm start`. It also starts a local Postgres (data in
  `.wrangler/local-db`). To use the **staging** Supabase project instead, set `DATABASE_URL` in
  `.dev.vars`.

## Commands

| Command                | What it does                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm install`          | Install dependencies                                                            |
| `npm start`            | Development: Angular on http://localhost:4200, API on port 8787, local database |
| `npm run db:reset`     | Empty the local database (stop `npm start` first)                               |
| `npm run preview`      | Production build served with the API on http://localhost:8787                   |
| `npm test`             | All tests, against an in-memory Postgres (no accounts or Docker)                |
| `npm run typecheck`    | Type-check the Worker                                                           |
| `npm run ci`           | Type check, tests and build: what GitHub and Cloudflare run                     |
| `npm run db:push`      | Apply `supabase/migrations` to the database in `SUPABASE_DB_URL`                |
| `npm run db:bookings`  | List the latest bookings (local database, or `DATABASE_URL`)                    |
| `npm run google:setup` | Prepare the Google Sheet once (headers, drop-downs, revenue formulas)           |
| `npm run brand`        | Regenerate the logo files in `public/brand`                                     |
| `npm run deploy`       | Manual deploy (normally Cloudflare deploys `main` by itself)                    |

## Where to edit

| What                                                    | File                                                 |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Services, durations, prices (**currently samples**)     | `shared/catalog.ts`                                  |
| Opening hours and booking rules (**hours are samples**) | `shared/schedule.ts`                                 |
| Address, phone, email, photos, preview mode             | `shared/studio.ts`                                   |
| Google map: pins `address` (or `mapLocation` if set)    | `shared/studio.ts`                                   |
| Email texts                                             | `worker/email/templates.ts`                          |
| Texts (Croatian, English, German, Italian)              | `src/app/core/i18n/hr.ts`, `en.ts`, `de.ts`, `it.ts` |
| Colors                                                  | `src/styles/_tokens.scss`                            |
| Database tables (new file per change)                   | `supabase/migrations/`                               |

## How a booking flows

1. **The website checks free times.**
   - It reads the occupied 15-minute cells in Supabase.
   - It adds whatever the owner marked as busy in Google Calendar. If Google does not answer
     within 3 seconds, only the database is used.
2. **The booking is saved.** The booking and its cells go into Supabase in one transaction. The
   cells' primary key makes double booking impossible.
3. **Copies are made after the response.**
   - Brevo emails go out: the customer gets a confirmation with a calendar file, the owner gets
     a notice.
   - A Google Calendar event is created and a row is added to the Google Sheet.
   - A failure never loses a booking. The cron job retries every 15 minutes, up to 5 attempts.
   - The status is in the `customer_mail`, `owner_mail`, `calendar_sync` and `sheet_sync`
     columns.
4. **Evening list.** At 21:00 (studio time) `OWNER_EMAIL` gets the next day's bookings with a CSV
   copy. Change the time with `digestAtMin` in `shared/schedule.ts`.
5. **Cancelling.** Set `status` to `cancelled` in Supabase's table editor.
   - The time is free again at once.
   - Within 15 minutes the calendar event is removed and the sheet row says "otkazano".

Settings are in `.dev.vars` locally (see `.dev.vars.example`) and in Cloudflare in production.
Every integration is optional: without its settings it is skipped. With `EMAIL_PREVIEW=true`,
http://localhost:4200/api/dev/emails shows the emails without sending them.

## Status

**Done:**

- logo, pages in four languages, booking flow, API and database
- confirmation emails, owner notice and evening list
- Google Calendar and Google Sheets
- Google map with cookie consent
- CI/CD

**Not built yet:** online cancellation by the customer, removing old personal data, bot protection
(Turnstile), an admin page.

**Before real customers:**

- Add real content and set `sampleContent: false`.
- Add bot protection.
- Have the privacy text reviewed. It is still a draft.

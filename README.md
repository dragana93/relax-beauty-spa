# Dijana Savanović – Relax, Beauty and Spa Studio

Angular 22 website with online booking, served by one Cloudflare Worker with a D1 (SQLite) database.
The full plan is in [docs/SPECIFICATION.md](docs/SPECIFICATION.md).

## Requirements

- Node 22.22.3+, 24.15+ or 26+
- Windows: a current Microsoft Visual C++ Redistributable (x64), needed by Cloudflare's local runtime
- Run commands from a path with an uppercase drive letter (`C:\...`); Vitest fails from `c:\...`

## Commands

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm install`       | Install dependencies                                                        |
| `npm start`         | Development: Angular on http://localhost:4200, API on port 8787             |
| `npm run preview`   | Production build served with the API on http://localhost:8787               |
| `npm run db:bookings` | List the bookings in the local database                                   |
| `npm run db:clear`  | Delete all local test bookings (works while `npm start` runs)               |
| `npm run db:reset`  | Delete the local test database and re-create it (stop `npm start` first)    |
| `npm test`          | Booking logic and API tests against an in-memory D1                         |
| `npm run typecheck` | Type-check the Worker                                                       |
| `npm run brand`     | Regenerate the logo files in `public/brand`                                 |
| `npm run deploy`    | Test, build, migrate the remote database and deploy (read **Status** first) |

Restart `npm run preview` after rebuilding. A running server can return 404 for the new files.

## Where to edit

| What                                                    | File                               |
| ------------------------------------------------------- | ---------------------------------- |
| Services, durations, prices (**currently samples**)     | `shared/catalog.ts`                |
| Opening hours and booking rules (**hours are samples**) | `shared/schedule.ts`               |
| Address, phone, email, photos, preview mode             | `shared/studio.ts`                 |
| Email texts                                             | `worker/email/templates.ts`        |
| Texts (Croatian, English, German, Italian)              | `src/app/core/i18n/hr.ts`, `en.ts`, `de.ts`, `it.ts` |
| Colors                                                  | `src/styles/_tokens.scss`          |

## Confirmation emails

After each booking the customer gets a confirmation in their language (with a calendar file), and
the owner gets a notice in Croatian. Emails are sent through [Resend](https://resend.com) after the
booking is saved, so a mail problem never loses a booking. Failed emails are retried every
15 minutes, up to 5 attempts. The result is in the `customer_mail` and `owner_mail` columns.

Settings are in `.dev.vars` locally (see `.dev.vars.example`). Restart `npm start` after editing.

- **See the emails without sending:** with `EMAIL_PREVIEW=true`, open
  http://localhost:4200/api/dev/emails
- **Send real test emails:** create a free Resend account and an API key, then set
  `RESEND_API_KEY`, `MAIL_FROM="Relax, Beauty and Spa Studio <onboarding@resend.dev>"` and
  `OWNER_EMAIL`. Without your own domain, Resend delivers only to your Resend account's address,
  so book with that address.
- **Production:** verify your domain in Resend, use an address on it in `MAIL_FROM`, run
  `npx wrangler secret put RESEND_API_KEY` and set `MAIL_FROM` and `OWNER_EMAIL` in Cloudflare.
  Never set `EMAIL_PREVIEW` in production.

## Status

Done: milestones M0–M4 (logo, bilingual pages, booking flow, API, database).

Done from M5: confirmation emails with calendar file, owner notice, and email retry.

**Not built yet (M5):** online cancellation, removing old personal data, Turnstile, admin page and
its Access login.

**Do not deploy for real customers yet.** Bot protection is missing, bookings can only be viewed or
cancelled directly in the database, and the privacy text is a draft that describes features still
to be built.

Before the first deploy, create the database with
`npx wrangler d1 create relax-beauty-spa --jurisdiction=eu` (the jurisdiction cannot be changed
later) and put its id in `wrangler.jsonc`. Set `sampleContent: false` only after real content is
in place.

To view local bookings:

```
npx wrangler d1 execute relax-beauty-spa --local --command "SELECT reference, date, start_min, customer_name FROM bookings"
```

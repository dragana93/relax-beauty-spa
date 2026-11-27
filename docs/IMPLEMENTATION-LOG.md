# Implementation log: what was done, step by step

Date: 26 November 2026
Project folder: `C:\angular\relax-beauty-spa`
Full plan: [SPECIFICATION.md](SPECIFICATION.md)

This log records each step, why it was taken and its result. It also lists problems found on the
way and changes made to the computer outside the project.

---

## Summary

| Area | Status |
| --- | --- |
| Plan and specification | Done, saved in `docs/SPECIFICATION.md` |
| Logo (5 variants) | Done, **awaiting your approval** |
| Website in Croatian, English, German and Italian (home, services, booking, privacy, 404) | Done, with **sample content** |
| Booking API + SQLite database (Cloudflare D1, local) | Done and tested |
| Double-booking protection | Done and tested |
| Confirmation emails, cancellation, admin page, bot protection | **Not built yet** (milestone M5) |
| Deployment to the internet | **Not done** |

Nothing has been deployed or committed to git.

---

## Step 1: Analysis of the reference website

**What:** read `https://luxelleheadspa.com/`. This was a text-only read, so colors, fonts and
mobile behavior could not be observed.

**Findings:**
- One Croatian page with sections: hero, 7 service categories (93 services), team, gallery,
  Google reviews and a footer.
- Booking leaves the site to an external platform (Zoyya), and many "book" links don't preselect the
  service.
- Weak points: some durations don't match their titles, no opening hours or written address, a
  flag-only language switch, repeated image descriptions, and no FAQ or policies.

**Result:** the plan copies the *structure* only, never its text, photos or prices. Each weak point
has an improvement listed in the specification (section 1).

## Step 2: Decisions you made

I asked four questions:

| Question | Your answer |
| --- | --- |
| Logo text | Name + studio ("Dijana Savanović" + "Relax, Beauty and Spa Studio") |
| Language | Croatian (default) + English |
| Customers at the same time | One |
| Owner management | Small protected admin page |

## Step 3: Research on costs and limits

I checked official pricing pages:
- **Cloudflare D1 (SQLite)** free plan: 5 million reads/day, 100,000 writes/day, 500 MB per database,
  7-day restore. The data can be kept in the EU, but only if chosen when the database is created.
- **Cloudflare Workers:** visits to static pages are free and unlimited; the API allows 100,000
  requests/day for free.
- **Resend (email):** free plan of 3,000 emails/month and 100/day. It requires a domain you own.

**Conclusion:** SQLite is suitable. Hosting it on Cloudflare D1 avoids running a server, and the only
expected cost is a domain.

## Step 4: Plan saved

The specification was written and saved as `docs/SPECIFICATION.md`. It covers the design, pages,
database, double-booking protection, booking numbers, email, security, privacy, costs, milestones
M0–M6 and testing.

## Step 5: Project setup (milestone M0)

1. Created an **Angular 22** project in the existing folder with SCSS, standalone components and
   no zone.js. Your global Angular CLI is version 14, so I used `npx @angular/cli@22`.
2. Switched the build to **static prerendering**: every page is generated as a ready HTML file at
   build time. I removed the generated Express server because Cloudflare serves the files.
3. Installed:
   - **Backend:** `hono` (API router), `zod` (input checks), `jose` (for the later admin login)
   - **Cloudflare tools:** `wrangler`, `@cloudflare/workers-types`
   - **Fonts (self-hosted):** EB Garamond, Jost; for the logo only: Great Vibes, Allura, Marcellus
   - **Logo tools:** `opentype.js`, `sharp`
   - **Development:** `concurrently`
4. Added the Cloudflare configuration [wrangler.jsonc](../wrangler.jsonc). One Worker serves the
   pages and, under `/api/*`, the booking API. The database ID is a placeholder until the real
   database is created.
5. Added `npm` commands: `start`, `preview`, `test`, `typecheck`, `build`, `brand`, `deploy`.

## Step 6: Logo (milestone M1)

**What:** wrote [scripts/generate-brand.mjs](../scripts/generate-brand.mjs), which draws the logo as
vector SVG. Letters are converted to shapes, so the logo looks the same everywhere without fonts.

**How it follows your reference:** two gold ring arcs, "Dijana Savanović" in script with swashes,
"RELAX, BEAUTY AND SPA STUDIO" in spaced capitals with side lines, and a lotus. It uses a gold
gradient instead of the photographic 3D effect, which doesn't work well on screens.

**Problems found and fixed:**
- At first only "Dij" appeared. A bug in `opentype.js` wrote invalid numbers (`NaN`) into the
  shapes, so I added my own conversion.
- The favicon was unreadable at 32 px, so I made its lines thicker.

**Font choice:** I compared Great Vibes and Allura and chose **Great Vibes** as closer to the
reference.

**Files created in `public/brand/`:**

| File | Used for |
| --- | --- |
| `logo-full.svg` | Home page hero |
| `logo-compact.svg` | Header and footer (lotus + name) |
| `logo-mark.svg` | Lotus in a ring; browser tab icon |
| `favicon-32.png`, `apple-touch-icon.png` | Browser and phone home-screen icons |
| `logo-email.png` | For emails (many email apps block SVG) |
| `og-image.png` | Preview image when the link is shared |

To regenerate: `npm run brand`.

## Step 7: Shared booking rules (`shared/` folder)

These files are used by **both** the website and the API, so the rules can't differ between them.

| File | Contents |
| --- | --- |
| [catalog.ts](../shared/catalog.ts) | 4 categories and 9 **sample** services (name HR/EN, duration, price) |
| [schedule.ts](../shared/schedule.ts) | **Sample** hours: Mon–Fri 9–19, Sat 9–14, Sun closed; booking rules |
| [slots.ts](../shared/slots.ts) | Calculates free times; handles Croatian time incl. summer/winter time |
| [validation.ts](../shared/validation.ts) | Limits and patterns for name, email, phone, note |
| [api-types.ts](../shared/api-types.ts) | Data formats between website and API |

**Booking rules (editable in `schedule.ts`):**
- Appointments can start every 15 minutes (changed from 30 on 27 November 2026, so that every
  time that leaves room for the cleanup break is offered, before and after other bookings).
- 15 minutes of cleanup time is reserved after each appointment.
- Bookings need at least 12 hours' notice and can be made up to 60 days ahead.
- One email address can have at most 3 upcoming bookings.
- An appointment plus its cleanup must end by closing time.

## Step 8: Database (milestone M2)

[migrations/0001_init.sql](../migrations/0001_init.sql) creates three tables:

1. **`bookings`:** one row per booking. It stores the reference number, date, time, service, and a
   copy of the name and price at booking time. It also stores customer name, email, phone, note,
   language, status and email delivery status.
2. **`blocks`:** times the owner closes (breaks, holidays). Used by the future admin page.
3. **`occupied_slots`:** one row per occupied 15-minute piece of the day.

**How double booking is prevented:** a 60-minute booking at 10:00 occupies 10:00, 10:15, 10:30,
10:45 and 11:00 (cleanup). The booking and all its pieces are saved **together in one transaction**.
The database refuses a piece that is already taken. When that happens, the whole booking is
cancelled and the customer gets "this time was just taken". This works even when two people click
at the same moment.

## Step 9: Booking API (`worker/` folder)

| Address | Purpose |
| --- | --- |
| `GET /api/health` | Checks that the API is running |
| `GET /api/availability?serviceId=…&date=…` | Free start times for a service on a day |
| `POST /api/bookings` | Creates a booking |

**Protections built in:**
- **Price and duration:** taken from the server's own catalog, never from the browser.
- **Booking number:** format `RBS-7K3M9Q`. It uses no easily confused characters (0/O, 1/I/L), is
  generated with secure randomness, and is unique in the database.
- **Repeated clicks or network retries:** each attempt carries a unique key, so it can't create two
  bookings.
- **Spam:**
  - A hidden "honeypot" field that only bots fill in
  - Field length limits
  - Requests from other websites are refused
- **Privacy in logs:** errors are logged without any personal data.

## Step 10: Automated tests

[tests/slots.spec.ts](../tests/slots.spec.ts) and [tests/api.spec.ts](../tests/api.spec.ts) contain
**30 tests, all passing**. The API tests use a real temporary SQLite database. Examples:
- 8 simultaneous requests for one time → exactly 1 booking, 7 refused
- Two overlapping services at the same moment → only one succeeds
- A failed booking leaves no partial data
- A tampered price is ignored
- Summer/winter time change days are calculated correctly
- The 4th booking for the same email is refused

Run with: `npm test`

**Problems found and fixed:**
1. Tests did not start from `c:\...` (lowercase drive letter), a known Vitest problem on Windows.
   Running from `C:\...` fixed it, and this is noted in the README.
2. Cloudflare's local database runtime crashed because the **Microsoft Visual C++ Redistributable**
   was from 2019. With your permission, I updated it to 14.52. After that, all tests passed.

## Step 11: Website pages (milestones M1, M3, M4)

**Languages:** Croatian, English, German and Italian (German and Italian were added later; see
Step 16). All texts are in [hr.ts](../src/app/core/i18n/hr.ts), [en.ts](../src/app/core/i18n/en.ts),
[de.ts](../src/app/core/i18n/de.ts) and [it.ts](../src/app/core/i18n/it.ts). If a translation is
missing, the build fails, so nothing is left untranslated. The language comes from the address:

| Croatian | English | German | Italian | Page |
| --- | --- | --- | --- | --- |
| `/` | `/en` | `/de` | `/it` | Home: hero, service categories, about, gallery, FAQ, contact and hours |
| `/usluge` | `/en/services` | `/de/leistungen` | `/it/servizi` | All services with category filter |
| `/rezervacija` | `/en/booking` | `/de/termin` | `/it/prenotazione` | Booking |
| `/privatnost` | `/en/privacy` | `/de/datenschutz` | `/it/privacy` | Privacy and booking rules (**draft**) |
| unknown address | | | | "Page not found" with status 404 |

**Design:**
- Colors: ivory, sand and deep gold, from the logo
- Fonts: EB Garamond (headings) and Jost (text), self-hosted, so no requests to Google
- Built for phones first, and adapts to tablet and desktop
- Buttons at least 44 px tall for fingers
- A fixed "Book" button at the bottom on phones
- Hamburger menu on phones, with an HR/EN text switch

**Booking in 4 steps:**
1. Choose a treatment.
2. Choose a date (a scrollable strip of days), then a free time.
3. Enter name, email, phone and an optional note, and accept the privacy notice.
4. Check the summary and confirm. A screen shows the booking number.

If someone else takes the time while the customer is filling in the form, the entered details are
kept and new free times are loaded. Every "Book" button on the services page preselects its service.

**Other:**
- Page titles and descriptions for search engines
- Search engines are told **not to index** the site while it shows sample content
- A dark bar at the top says it's a preview with sample content
- Keyboard focus moves to each new step for accessibility

**Studio details** (address, phone, email, map, photos) go in
[studio.ts](../src/app/core/studio.ts). Empty values show "Uskoro" (coming soon).

## Step 12: Build and browser testing

- `npm run build` generates the pages in about 7 seconds. The first load is about 91 kB.
- I tested in **Microsoft Edge** with an automated script:
  - The full booking at phone width (360 px)
  - The language switch and menu
  - Form error messages
  - A forced "time just taken" case
  - No sideways scrolling at 360, 768 and 1440 px on all pages
  - No requests to outside servers

**Problems found and fixed:**
1. **Page error (NG0501):** the opening-hours table lacked a `<tbody>`. The browser added one, which
   confused Angular. Fixed.
2. **Heading font:** in Cormorant Garamond, the marks on č, š and ž looked detached, so I switched to
   **EB Garamond**.
3. **404 errors after rebuilding:** a server that was already running had the old file list. A
   restart fixed it, and this is noted in the README.

## Step 13: Finishing touches

- Wrote [README.md](../README.md): commands, where to edit what, current status and warnings.
- Formatted all code with Prettier.
- Added a helper so `npm start` also works before the first build.
- Excluded local database files, secrets and backups from git in `.gitignore`.

## Step 14: Mistake during the work (for transparency)

While writing the README through a shell command, the shell **ran some command names quoted inside
the text**, including `npm install` and `npm start`. I stopped it and closed every leftover process.
I rewrote the file safely and saved a note so it doesn't happen again.

The later deploy and database-creation commands showed no sign of running. You were also not logged
in to Cloudflare, so nothing could have been deployed.

## Step 15: Running the app on your PC

- `npm start` failed in your terminal because PowerShell blocked script files (`npm.ps1`).
- **Fix, at your request:** I set the PowerShell execution policy to **RemoteSigned for your Windows
  account only**. Scripts made on your PC can run; downloaded scripts still need a signature.
- To undo: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Undefined`

## Step 16: German and Italian added

- The list of languages lives in one place, [shared/lang.ts](../shared/lang.ts), with each
  language's name and its date and price format. Adding a language makes the build demand a
  translation everywhere it is needed.
- New text files [de.ts](../src/app/core/i18n/de.ts) (formal "Sie") and
  [it.ts](../src/app/core/i18n/it.ts) (friendly "tu", usual for Italian spa sites). The sample
  services and categories in [catalog.ts](../shared/catalog.ts) are translated too.
- The header has a **language dropdown**: a button with the current language (for example
  "DE ▾") opens a list of Hrvatski, English, Deutsch and Italiano. Each entry opens the same page
  in that language. The list closes on a choice, on a click outside it, or with Escape. The
  entries are real links, so search engines can find every language.
- The database accepts `de` and `it` as the booking language. Nothing is deployed yet, so the
  original database setup file was changed instead of adding a new one. The local test database
  must be rebuilt once with `npm run db:reset`.
- 5 new tests: a booking is accepted in each language, and an unknown language is rejected.
  All 35 tests pass. The build creates 17 pages, and the switch was checked in Edge at phone and
  desktop size.
- **Please have a native speaker check** the German and Italian texts before launch.

## Step 17: Confirmation emails

- **What is sent:** after a booking, the customer gets a confirmation in their language
  (booking number, treatment, date, time, duration, price, cancellation rule, address and phone
  once filled in) with a calendar file (`.ics`). The owner gets a notice in Croatian with the
  customer's contact details and note. Replying to the owner's notice writes to the customer.
- **How:** through Resend's web API, in [worker/email/](../worker/email/). The emails are sent
  **after** the booking is saved and the answer is shown, so a mail problem never loses a booking.
- **Retry:** each attempt is recorded in `customer_mail`, `owner_mail` and `mail_attempts`. A
  scheduled job every 15 minutes retries failed emails (up to 5 attempts, within 48 hours). Resend
  ignores repeats of the same message, so a retry never sends an email twice.
- **Safety:** everything the customer typed is escaped in the email. The free-text note goes only
  to the owner. Logs never contain names or addresses.
- **Settings:** in `.dev.vars` (not in git). Without an API key the site works as before and says
  that no email is sent.
- **Preview:** with `EMAIL_PREVIEW=true`, http://localhost:4200/api/dev/emails shows each
  booking's emails without sending. It works only on your PC.
- **Studio details** moved to [shared/studio.ts](../shared/studio.ts), because the emails need
  them too.
- 4 new tests (sending, escaping, failure and retry, preview protection). All 39 tests pass, and
  tests never contact Resend.

---

## Changes made outside the project folder

1. Microsoft Visual C++ Redistributable (x64) updated to 14.52 (with your permission).
2. PowerShell execution policy for your user set to RemoteSigned (at your request).

---

## How to run and test

```powershell
cd C:\angular\relax-beauty-spa
npm start
```

Open http://localhost:4200. Press **Ctrl+C** to stop.

To see test bookings:

```powershell
npx wrangler d1 execute relax-beauty-spa --local --command "SELECT reference, date, printf('%02d:%02d', start_min/60, start_min%60) AS time, service_name, customer_name FROM bookings"
```

To delete all local bookings and blocked times:

```powershell
npx wrangler d1 execute relax-beauty-spa --local --command "DELETE FROM occupied_slots; DELETE FROM bookings; DELETE FROM blocks;"
```

## Step 18: Required fields and clearer validation

Full name, email address and phone number were already checked, but the form did not show which
fields were required, and an empty field showed the same message as a wrongly filled one.

1. **Required marker.** Each required label ends with a red `*`, and a line above the form explains
   it. The `*` is hidden from screen readers (`aria-hidden`), because the `required` attribute on
   the input already tells them.
2. **Two kinds of message.** An empty field says "Enter your phone number." A wrong one says what
   is wrong, with an example: "Enter a valid phone number (6 to 15 digits), for example
   +385 91 123 4567." `errorText()` in `booking.ts` picks the message. The texts are in
   `booking.errors` in all four dictionaries (`nameRequired`, `emailRequired`, `phoneRequired`).
3. **Spaces alone count as empty.** `requiredText` replaces `Validators.required`, which accepts
   "   ".
4. **Stricter phone check.** `isValidPhone()` in `shared/validation.ts` allows only digits, spaces,
   `+ ( ) / . -`, and needs 6 to 15 digits, so "-- --" is rejected. The API uses the same function,
   so the browser and the server always agree.
5. **Focus.** After "Next" with errors, the cursor jumps to the first field that needs fixing.
   Messages appear when you leave a field or press "Next", not while typing.
6. **Tests.** Six new API cases: a phone with no digits, too few or too many digits, and an empty
   name, email or phone.

## Step 19: Evening list of the next day's bookings

Date: 27 November 2026

**Why emails were not arriving:** the Resend key in `.dev.vars` was commented out, so the Worker
had email switched off. Bookings were still saved. `.dev.vars.example` also suggested a Hotmail
address as the sender, which Resend refuses. It now explains that the sender must be on a
verified domain, or `onboarding@resend.dev` for tests.

**What:** at 21:00 studio time the owner gets every booking of the next day, sorted by time, with
cancellations apart. A CSV file for Excel is attached as a daily copy. Code:
[worker/email/daily-digest.ts](../worker/email/daily-digest.ts) and
[digest-template.ts](../worker/email/digest-template.ts). It runs from the existing 15-minute cron
and is recorded in the new `daily_digests` table (migration `0002`).

- **Why 21:00:** with 12 hours' notice, nobody can book a 09:00 appointment after 21:00 the
  evening before, so the list is final. A test checks this against the opening hours.
- **Retries:** a failed send is retried on every cron run until midnight, up to 5 attempts. A day
  is never sent twice.
- **Safety:** customer input is escaped in the email. CSV cells that Excel would run as formulas
  get an apostrophe, and phone numbers stay as text (`+385`, leading zero).
- **Preview:** http://localhost:4200/api/dev/digest/YYYY-MM-DD (and `.csv`), only with
  `EMAIL_PREVIEW=true` on your PC.
- **Tests:** [tests/digest.spec.ts](../tests/digest.spec.ts) plus API cases for missing name,
  email or phone. 73 tests, all passing.

---

## What is not done yet

**Milestone M5 (can mostly be built locally):**
- Online cancellation through a secure link in the email (confirmation emails are done, Step 17)
- Admin page: day view, cancel bookings, block time; login through Cloudflare Access
- Bot protection (Cloudflare Turnstile)
- Removing old personal data on a schedule (the email retry job exists)

**Milestone M6 (needs your input):**
- Real services, prices, opening hours, address, phone, emails, studio story and photos
- Cloudflare and Resend accounts and a domain
- Create the EU database, deploy, and test on real phones

**Not tested yet:** real phones, browsers other than Edge, keyboard-only use, color contrast,
Lighthouse scores.

**Waiting for you:** approval of the logo or the changes you want.

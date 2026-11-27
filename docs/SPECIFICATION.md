# Relax, Beauty and Spa Studio: Plan and Specification

## Context
A new public website for **Dijana Savanović, Relax, Beauty and Spa Studio**. It needs an elegant mobile-first design, a logo based on the supplied reference, and online booking without customer accounts. Priorities are low cost, little infrastructure and easy maintenance. The repo `c:\angular\relax-beauty-spa` is empty (no commits), so there is no existing code to reuse.

**Decisions made:** logo shows name + studio; Croatian (default), English, German and Italian; one customer at a time; small protected admin page.

**Assumptions to confirm:** the studio is in Croatia (time zone `Europe/Zagreb`, EUR).

**First implementation action:** save this document as `docs/SPECIFICATION.md`.

---

## 1. Reference site analysis (luxelleheadspa.com)
This comes from a text-only read of the page. Colors, fonts, mobile behavior, speed and the Zoyya booking steps were **not observed**.

**Structure:** one Croatian page with anchor navigation: hero, services (7 categories, 93 items, with durations, prices and some detail popups), team, gallery (about 25 photos, expandable), Google reviews, footer with contacts. Booking is off-site on **Zoyya**.

| Weakness observed | Our improvement |
|---|---|
| 93 services in one page | Separate services page with category filters; Home shows categories only |
| Booking leaves the site; many links don't preselect a service | Built-in booking; every "Book" button preselects the service |
| Some titles and durations disagree; seasonal offers look stale | One typed catalog is the only source of name, duration and price; `active` flag |
| No opening hours, written address, FAQ or policies seen | Contact block with hours, address and phone; short FAQ, cancellation rules, privacy page |
| "About" shows only team bios | A short studio story plus Dijana's introduction |
| Flag-only language switch; repeated image alt text | "HR / EN" text switch; meaningful alt text |
| Some items are links, others popups | One card pattern: details expand in place, one "Book" button |

Only the structure is borrowed. We will **not** copy its text, photos, prices or reviews.

## 2. Visual identity

**Mood:** warm, calm and airy, with ivory backgrounds, thin gold lines, lots of whitespace and the lotus as the repeated motif. Light theme only in v1.

| Token | Hex (matched by eye to the reference) | Use |
|---|---|---|
| `--ivory` | `#F7F2EA` | Page background |
| `--sand` | `#EDE4D6` | Alternate sections, cards |
| `--gold-deep` | `#7A5A22` | Buttons, links, small gold text |
| `--gold` | `#B68D45` | Lines, icons, decoration only (too light for small text) |
| `--gold-light` | `#E8CF98` | Logo gradient highlight |
| `--ink` | `#2E2822` | Body text |
| `--taupe` | `#6B5F52` | Secondary text |

Check contrast (WCAG AA) during build. Form errors also need a distinct red, shown with text.

**Typography:** *EB Garamond* for headings (chosen over Cormorant Garamond, whose carons on č š ž looked detached), *Jost* for body and forms. The script font (candidate *Great Vibes*; compare with *Allura*) is for the logo only. Load Latin-Extended subsets (č ć đ š ž) and self-host with `@fontsource`, so no visitor requests go to Google Fonts.

**Logo:** a vector SVG recreation of the reference with two ring arcs, script "Dijana Savanović" with side swashes, tagline "RELAX, BEAUTY AND SPA STUDIO" in spaced capitals with side rules, and the lotus. It will be a flat gold-gradient version, **not** the photographic 3D look, and not a pixel trace.
- Convert text to paths (small script using `opentype.js`) so it renders without fonts; confirm the font licence (OFL).
- Variants in `public/brand/`: `logo-full.svg` (hero, footer, email), `logo-compact.svg` (header, readable on phones), `logo-mark.svg` + favicons (lotus), `og-image.png` and a PNG for email (many email clients block SVG).
- **Review point:** the owner approves the logo before final polish.

**Design rules:** mobile-first at 360px; breakpoints 640 and 1024; touch targets at least 44px; plain SCSS with CSS variables; no UI library; subtle motion that respects reduced-motion.

## 3. Pages

German and Italian were added after the first version (2026-11-26).

| Croatian (default) | English | German | Italian | Content |
|---|---|---|---|---|
| `/` | `/en` | `/de` | `/it` | Hero + "Rezerviraj", service categories, about, gallery, contact/hours/map link, FAQ |
| `/usluge` | `/en/services` | `/de/leistungen` | `/it/servizi` | Catalog with category filter |
| `/rezervacija` | `/en/booking` | `/de/termin` | `/it/prenotazione` | Booking flow (`?service=id` preselects) |
| `/otkazivanje` | `/en/cancel` | `/de/stornieren` | `/it/disdetta` | Cancel through the email link (planned) |
| `/privatnost` | `/en/privacy` | `/de/datenschutz` | `/it/privacy` | Privacy notice and booking rules |
| `/admin` | (Croatian only) | | | Owner's page |

Mobile has a hamburger menu and a sticky bottom "Book" button (hidden on booking and admin). The map is a link, not an embed. A reviews section is added only when there are real reviews. The gallery uses lazy-loaded WebP and simple expand/collapse.

**Booking flow:** (1) service → (2) date from a horizontal day strip, then a time chip → (3) name, email, phone, optional note, privacy acknowledgement → (4) summary and confirm → success screen with the reference number. Show a summary throughout. Include loading, no-free-times and error states. On "slot taken", keep the form data, reload times and ask for a new one. No calendar library.

## 4. Storage: is SQLite suitable?
Yes. SQLite easily handles one studio's volume. What matters is **where the file lives**.

| Option | Cost | Verdict |
|---|---|---|
| **Cloudflare D1** (hosted SQLite) | Free tier | **Chosen.** SQL, constraints, transactional batches, no server |
| SQLite file on a VPS | Monthly fee | Works, but you maintain OS, TLS, updates and backups |
| SQLite file on free app hosting | Free | Risky: on many such hosts the disk is wiped on restart or redeploy |
| Google Sheets + Apps Script | Free | Least infrastructure; slower, quotas, weaker conflict protection, harder to test |
| Supabase / Firebase | Free tiers | More platform than needed |
| Ready-made booking service (e.g. Zoyya) | Varies | No code and the simplest of all, but not your own form, design or data model |

**D1 Free (official pages, checked 2026-11-26):** 5M rows read/day, 100k rows written/day, 500 MB per database, 5 GB total, 7-day Time Travel restore. Create with `--jurisdiction=eu`; **this cannot be changed later**.

Bookings are "organized by day" through an indexed `date` column. Do not create a table or database per day.

## 5. Architecture

```
Browser ─► one Cloudflare Worker
             ├─ static assets: prerendered Angular site
             └─ /api/* ─► D1 (SQLite) ─► Resend (email)
           Cron (every 15 min): retry failed emails, remove old personal data
           Turnstile: bot protection · Cloudflare Access: admin login
```
One repo, one deploy command, same origin (no CORS). Angular uses static prerendering with **no server-side rendering**.

**Versions:** Angular **22.3.0** (latest on npm today) works with your Node 26.13.1. Your global CLI is 14.2.7, so use `npx @angular/cli@22`. Wrangler is 4.168.0.

```
docs/SPECIFICATION.md
shared/        catalog.ts, schedule.ts, slots.ts (pure logic), api-types.ts, validation.ts
src/app/
  core/        i18n/ (service, hr.ts, en.ts), api/booking.api.ts, config.ts
  layout/      header, footer, sticky-book-button
  features/    home/, services/, booking/, cancel/, admin/, legal/
src/styles/    _tokens.scss, base styles
public/brand/  logos and favicons
worker/        index.ts, routes/, db/, email/, security/, cron.ts
migrations/    0001_init.sql
wrangler.jsonc
```

**Frontend:** standalone components, lazy routes, signals for state, `HttpClient`, Reactive Forms, no NgRx. For i18n, use a small service with typed dictionaries: `en.ts` must satisfy the type of `hr.ts`, so a missing key fails the build. Language comes from the URL. Set `<html lang>`, titles, meta and `hreflang`. Prerender every route (admin and cancel as loading shells) and serve a real 404 page.

**Backend:** TypeScript Worker with `Hono` as router, `zod` for validation, and parameterized D1 SQL without an ORM. `wrangler.jsonc` sets `run_worker_first: ["/api/*"]`. Static asset requests are free and unlimited; the Worker free plan allows 100k requests/day with 10 ms CPU each.

**Catalog and hours** live in `shared/`, used by both UI and API. The server takes duration and price from its own copy and never trusts the browser. Changing them needs a redeploy; holidays and absences are handled in admin.

**Scheduling defaults (editable config):** 15-min storage grid, start times every 15 min, 15-min cleanup buffer after each booking, minimum 12 h notice, 60-day window, customer cancellation up to 24 h before. Booking plus buffer must fit within opening hours.

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/availability?serviceId&date` | Free start times (no personal data) |
| `POST /api/bookings` | `201` reference; `409 SLOT_TAKEN`; `422` invalid; `429` limit |
| `POST /api/cancel/lookup`, `POST /api/cancel` | View and cancel with reference + token |
| `GET /api/admin/day?date` | Bookings and blocks for a day |
| `POST /api/admin/bookings/:id/cancel` | Cancel and email the customer |
| `POST /api/admin/blocks`, `DELETE /api/admin/blocks/:id` | Block or unblock time (breaks, holidays, phone bookings) |

## 6. Database

```sql
CREATE TABLE bookings (
  id               INTEGER PRIMARY KEY,
  reference        TEXT NOT NULL UNIQUE,
  idempotency_key  TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  date             TEXT NOT NULL,          -- YYYY-MM-DD, studio local date
  start_min        INTEGER NOT NULL,       -- minutes after local midnight
  end_min          INTEGER NOT NULL,       -- service end, without buffer
  service_id       TEXT NOT NULL,
  service_name     TEXT NOT NULL,          -- snapshot
  price_cents      INTEGER NOT NULL,       -- snapshot
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  note             TEXT,
  lang             TEXT NOT NULL CHECK (lang IN ('hr','en')),
  privacy_ack_at   TEXT NOT NULL,
  customer_mail    TEXT NOT NULL DEFAULT 'pending',  -- confirmation: pending|sent|failed
  owner_mail       TEXT NOT NULL DEFAULT 'pending',
  mail_attempts    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,          -- UTC
  cancelled_at     TEXT
);
CREATE INDEX idx_bookings_date  ON bookings(date, start_min);
CREATE INDEX idx_bookings_email ON bookings(email, date);

CREATE TABLE blocks (
  id INTEGER PRIMARY KEY, public_id TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
  reason TEXT, created_at TEXT NOT NULL
);

-- One row per occupied 15-minute cell. The primary key prevents double booking.
CREATE TABLE occupied_slots (
  date        TEXT NOT NULL,
  slot_min    INTEGER NOT NULL,
  booking_ref TEXT REFERENCES bookings(reference) ON DELETE CASCADE,
  block_ref   TEXT REFERENCES blocks(public_id) ON DELETE CASCADE,
  PRIMARY KEY (date, slot_min),
  CHECK ((booking_ref IS NULL) <> (block_ref IS NULL))
);
```

### Preventing double booking
Services overlap with different durations, so a unique `(date, start time)` is **not enough**.
1. A booking occupies every 15-min cell it covers, including the buffer. For 10:00, 60 min + 15 that is 10:00, 10:15, 10:30, 10:45 and 11:00.
2. Insert the booking and all its cells in one `db.batch()`, which D1 runs as a transaction.
3. If any cell is taken, the primary key fails, everything rolls back, and the API returns `409`.
4. Blocks use the same table. A block over an existing booking is rejected; the owner cancels that booking first.
5. Cancelling updates the status and deletes the cells in one batch.

Availability checks only help the UI; the database constraint is the guarantee. Test early that a failed batch leaves no partial rows.

**Time:** store studio wall-clock date and minutes. Compute "now", notice and cancellation cutoffs in `Europe/Zagreb` using `Intl`, and test daylight-saving dates.

**Duplicate submits:** the browser sends a UUID idempotency key per attempt. A retry with the same key and email returns the original booking.

### Booking reference
Format `RBS-7K3M9Q`: 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O, 1/I/L), generated with `crypto.getRandomValues` without modulo bias. That is about 887M combinations, enforced by `UNIQUE`; retry up to 3 times on a collision. Handle this separately from slot conflicts.

The reference alone **cannot** cancel a booking. The email link carries `HMAC-SHA256(CANCEL_SECRET, reference)`. Nothing extra is stored, and the link can be rebuilt for retries. Put it in the URL fragment. Cancellation needs a button press and a `POST`, so email link scanners cannot cancel.

## 7. Email confirmations
**Resend**, using its HTTP API through `fetch`. Free plan (official, checked today): **3,000/month, 100/day, 3 custom domains**. Customer + owner email per booking means about 50 bookings/day at most; cancellations and retries use the same quota.

- **A domain you own is required** to email real customers. Verify it in Resend (SPF/DKIM) and add DMARC. A free `workers.dev` address cannot serve as the sending domain.
- Fallback is Brevo (reportedly 300/day, from third-party sources). Keep sending behind one `sendEmail()` function.
- Cloudflare's own email sending was not chosen: third-party reports say sending to arbitrary customers needs the paid plan.
- **Flow:** commit the booking first, then send with `ctx.waitUntil`. A mail failure never loses a booking. Cron retries (up to 5 attempts) with a Resend idempotency key. The admin page flags failures.
- The success screen always shows the reference and says the email is on its way, not that it was delivered.
- **Customer email (HR or EN, HTML + text):** reference, service, date and time, duration, price, address, phone, cancellation rules and link, `.ics` calendar attachment.
- **Other emails:** owner notice for new and customer-cancelled bookings; customer notice when a booking is cancelled (record failures so they can be retried).
- Escape all user input and leave the free-text note out of customer emails.

## 8. Admin, security and privacy
- **Admin:** mobile-friendly day view with previous/next, upcoming bookings, tap to call or email, cancel with confirmation, block time or a whole day, email failure badge.
- **Login:** **Cloudflare Access** with an emailed one-time code, allowing only approved addresses on `/admin*` and `/api/admin*`. The Worker **must also verify** the Access JWT (signature, issuer, audience) and reject by default, including on `workers.dev` and preview URLs. A local-only bypass lives in `.dev.vars` and is honored only on localhost. Check Access signup terms during setup.
- **Spam:** Turnstile verified on the server, honeypot field, at most 3 upcoming bookings per email, length limits, same-origin checks on changes. Email ownership isn't verified, so some fake bookings remain possible; the owner can cancel them.
- **Secrets:** `RESEND_API_KEY`, `TURNSTILE_SECRET`, `CANCEL_SECRET` go in Wrangler secrets; `.dev.vars` is gitignored. Never log personal data.
- **Privacy (GDPR):** collect little; privacy page naming Cloudflare and Resend; EU database (Resend processing location to be reviewed separately); cron anonymizes bookings after 12 months (confirm the period); tell customers not to enter health details in the note. No analytics or marketing cookies in v1. Have the owner or an adviser review the legal text.
- **Backups:** Time Travel (7 days) plus a monthly `wrangler d1 export`, stored privately and outside the repo, deleted on the same retention schedule.

## 9. Hosting and cost

| Item | Expected cost at studio volume |
|---|---|
| Hosting + API (Cloudflare Workers) | €0 |
| Database (D1) | €0 |
| Email (Resend) | €0 within limits |
| Turnstile, Access | €0 on free tiers |
| **Domain** | **The one expected cost: a yearly fee.** Check whether you qualify for a free `.hr` domain through CARNET |

Free-tier requests fail when limits are exceeded; terms can change. Deploy with `npm run deploy` (build, then `wrangler deploy`), applying D1 migrations first. Automatic deploys from GitHub can come later.

## 10. Implementation steps
Today's goal is **M0–M4 working locally**, if time allows. M5–M6 depend on accounts, DNS and real content.

| # | Milestone | Done when |
|---|---|---|
| M0 | Save spec; scaffold with `npx @angular/cli@22 new` into the existing folder (SCSS, static prerender); add Wrangler, local D1, dev proxy, scripts, `.gitignore` | App and `/api/health` run locally |
| M1 | Design tokens, fonts, logo SVGs, header/footer, i18n, routes | HR/EN shell works at 360px; logo ready for approval |
| M2 | `shared/` catalog and slot logic with tests; migration; availability and booking APIs; atomic insert; references | Concurrency and slot tests pass |
| M3 | Booking UI | Full local booking on a phone-sized screen |
| M4 | Home, services, privacy pages with placeholders | All public pages render in both languages |
| M5 | Emails, `.ics`, cancel flow, cron, Turnstile, admin, Access check | Works locally with test keys |
| M6 | Real content; Cloudflare + Resend + domain setup; deploy; device testing | Live smoke test passes |

**Placeholders:** sample services, prices and hours are clearly marked as samples. The site stays blocked from search indexing and is not publicly launched until they are replaced. The admin API stays closed until Access is configured.

**You need to supply:** services (HR/EN names, durations, prices), opening hours, address, phone, public and owner email, studio story, photos you have rights to use, domain choice, Cloudflare and Resend accounts.

**Later, only if needed:** day-before reminder email, rescheduling, manual booking form in admin, catalog editing in admin, real reviews, gift vouchers, privacy-friendly analytics, `LocalBusiness` structured data once real details exist.

## 11. Verification
- **Unit tests:** slot generation (opening and closing edges, buffer, notice, blocks, daylight saving), reference format, cancel token, both dictionaries.
- **API tests on local D1:** parallel requests for the same and overlapping times give exactly one `201` and the rest `409`, with no orphan rows; idempotent retry; cancel frees the time; booking vs block conflict; tampered price or duration is ignored.
- **Email:** mock failures and confirm cron retry; check real HR/EN emails and `.ics` in Gmail, Outlook and a phone.
- **Security:** admin API rejects missing, invalid or wrong-audience tokens; bad Turnstile is rejected; user input is escaped.
- **UI:** `ng build` and tests pass; check 360, 768 and 1440px; keyboard-only booking; Lighthouse mobile target of 90+ for accessibility, performance and SEO.
- **Live:** book, receive the email, see it in admin, cancel, confirm the time is free again; test a database export.

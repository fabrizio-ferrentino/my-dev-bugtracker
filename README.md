# Bug Tracker

A minimal, self-hostable **bug tracker / helpdesk** template. Anyone can submit a bug report **without an account**; you manage everything from a private admin dashboard.

- Public report form (`/`) with screenshot upload + Cloudflare Turnstile
- Bilingual UI (Italian/English) with a language switcher — no extra dependencies
- Confirmation page with a personal status link (`/success`, `/status`)
- Private admin dashboard (`/admin`) — stats, search, filters, ticket detail, internal notes, history
- Email notification to the admin on every new ticket (Resend)
- `BUG-YYYY-NNNN` ticket numbers, per-ticket secret access tokens, rate limiting, Zod validation, Supabase RLS

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + Storage) · Resend · Cloudflare Turnstile**. Deploy anywhere Next.js runs (Vercel, etc.). Free tiers are enough.

> This is a generic template — no personal names, domains or emails are hardcoded. All branding comes from environment variables.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

Open http://localhost:3000.

## 1. Supabase setup

1. Create a free project at https://supabase.com.
2. **SQL editor → New query** → paste the contents of `supabase/schema.sql` → run it. This creates:
   - enums (`bug_status`, `bug_priority`, `bug_type`, `bug_event_type`)
   - tables `bug_reports`, `bug_events`, `ticket_counters`
   - the `mint_ticket_number()` function (`BUG-YYYY-NNNN`)
   - `updated_at` trigger, indexes, and **Row Level Security** policies (anon: insert-only; authenticated admin: full access).
3. **Storage → New bucket** → name `screenshots` → **Private** (admin views images via signed URLs; nothing is public).
4. **Authentication → Users → Add user** → create your admin with email + password (this is the login for `/admin/login`). Use the same email as `ADMIN_EMAIL` to enable the optional allowlist check.
5. Copy **Project URL** and **anon public key** (Settings → API) into `.env.local`. Copy the **service_role secret key** into `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose it).

## 2. Resend setup (admin notifications)

1. Create a free account at https://resend.com and verify your sending domain (or use their onboarding domain for testing).
2. Create an API key → `RESEND_API_KEY`.
3. Set `ADMIN_EMAIL` to the inbox that receives new-ticket alerts, and `RESEND_FROM_EMAIL` to a verified sender like `Bug Tracker <bugs@example.com>`.
4. If email is not configured, tickets still work — the app logs a warning and skips the notification.

## 3. Cloudflare Turnstile setup (anti-spam)

1. In the [Cloudflare dashboard](https://dash.cloudflare.com) go to **Turnstile → Add widget**, add your domain, and copy the **site key** and **secret key**.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
3. For local development you may skip this: without keys, verification is bypassed **only when `NODE_ENV !== "production"`** (a warning is logged). In production, missing keys reject all submissions.

## 4. Environment variables

See `.env.example` for the full list:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
ADMIN_EMAIL=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Bug Tracker
NEXT_PUBLIC_SITE_TAGLINE=

# Optional: reporter application picker (hidden when empty)
NEXT_PUBLIC_APPS=Website,Mobile App,API
```

`.env*` files are gitignored. Never commit secrets.

### Optional: application picker

Set `NEXT_PUBLIC_APPS` to a comma-separated list (e.g. `Website,Mobile App,API`)
to show a required **Application** dropdown in the public form. The choice is
stored on the ticket, shown in the dashboard (with filter), the ticket detail,
the reporter status page and the admin email. Leave it empty to hide the
field entirely. Changing the variable requires restarting `npm run dev`
(public env vars are inlined at build time).

### Languages

The UI is bilingual (Italian default, English) with a switcher in every
header. The language is stored in a `lang` cookie and rendered server-side,
so there is no content flicker. All strings live in
`src/lib/i18n/dictionaries.ts` (TypeScript enforces that both languages
define the same keys). API error messages follow the same cookie; admin
notification emails follow `EMAIL_LANG` (`it` default, `en` optional).

## 5. Deploy

1. Push to GitHub and import the repo in **Vercel** (or any Next.js host).
2. Add the same environment variables in the host dashboard, with `NEXT_PUBLIC_APP_URL` set to your public URL (e.g. `https://bugs.example.com`).
3. Point your domain/subdomain at the deployment (e.g. Vercel → Settings → Domains).
4. Create the admin user in Supabase (step 1.4) if you haven't already.

## How it works

| Route | Who | What |
|---|---|---|
| `/` | public | Report form (no login). Auto-collects browser/OS/viewport/language. |
| `/success` | public | Confirmation with ticket number + personal status link. |
| `/status` | public | Status lookup. Ticket number alone shows minimal info; the personal link (`?token=…`) shows full public-safe info. Internal notes are never exposed. |
| `/admin/login` | you | Supabase Auth email/password login. |
| `/admin` | you | Stats, search, filters (status/priority/type), sorting, pagination. |
| `/admin/bugs/[id]` | you | Full detail, screenshot, edit status/priority/type/notes, history timeline. |
| `POST /api/bugs` | public | Rate-limited (5/hour/IP), Turnstile-verified, Zod-validated ticket creation. |
| `GET /api/status` | public | Rate-limited (30/min/IP) public-safe lookup. |

Security notes: secrets live server-side only; RLS denies anon reads/updates; uploads validated (PNG/JPG/WEBP ≤ 5 MB) and stored in a private bucket; security headers in `next.config.js`; admin pages send `noindex, nofollow`.

## Project structure

```text
src/
├── app/
│   ├── page.tsx                 # public form
│   ├── success/page.tsx         # confirmation
│   ├── status/page.tsx          # public status lookup
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx             # dashboard
│   │   ├── actions.ts           # server actions (update ticket, signed URLs)
│   │   └── bugs/[id]/page.tsx   # ticket detail
│   └── api/
│       ├── bugs/route.ts        # POST create ticket
│       └── status/route.ts      # GET public lookup
├── components/
│   ├── ui/                      # minimal shadcn-style primitives
│   ├── public/                  # report form, Turnstile, tech info
│   └── admin/                   # badges, login/logout, ticket editor
├── lib/
│   ├── supabase/ (client, server, admin)
│   ├── constants.ts             # labels + centralized status/priority colors
│   ├── validation.ts            # Zod schemas
│   ├── turnstile.ts · rate-limit.ts · resend.ts · ticket.ts
└── types/bug.ts
supabase/schema.sql              # DB schema + RLS + counter function
```

## License

MIT — see [LICENSE](LICENSE).

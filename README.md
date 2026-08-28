# PhonicsFlow

Class scheduling, student progress, parent communication and trainer reporting
for a phonics academy. Built for a small team (25–50 users) on Next.js, Supabase
and Vercel.

## Modules

| Module | What it does |
|---|---|
| **Dashboard** | Today's classes, open homework, unread parent feedback, attendance trend. Team heads also see this week's trainer reporting. |
| **Students** | Profiles, weekly slot, parent contact details, per-student progress (attendance, homework completion, sounds covered). |
| **Classes** | Schedule sessions, mark attendance in one tap, write structured notes — revision, dictation, reading, pronunciation. |
| **Homework** | Assign with a due date, collect file submissions, return corrections and an optional score. |
| **Phonics diary** | The shared sound library — 47 sounds × 10 example words, searchable, editable in place. |
| **Parents** | Weekly check-in tracker, contact log, and expiring feedback links parents open without an account (text, rating and video). |
| **Trainers** *(team head)* | Roster with live student counts, weekly trainer details, role management. |
| **Reports** | Trainers submit their week; the team head generates and submits the monthly roll-up. |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · TanStack Query ·
React Hook Form + Zod · Supabase (Postgres, Auth, Storage) · Vercel.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase keys
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the URL and both keys from **Project Settings → API** into `.env.local`.
3. In the **SQL editor**, run `supabase/schema.sql` — tables, indexes, triggers,
   RLS policies and the two private storage buckets.
4. Run `supabase/seed.sql` to load the phonics diary.
   *Upgrading an existing database?* Run `supabase/migrations/0001_…` on its own
   first, then `0002_…` — Postgres will not let a newly added enum value be used
   in the transaction that created it.
5. Start the app, create the first account at `/login`, then promote it:

   ```sql
   update public.users set role = 'team_head' where email = 'you@example.com';
   ```

Everyone who signs up afterwards starts as a trainer; the team head can promote
them from the Trainers page.

### Regenerating the seed

Word lists live in `supabase/generate-seed.mjs`:

```bash
node supabase/generate-seed.mjs
```

Re-running `seed.sql` never overwrites an existing sound, so trainer edits
survive a reseed.

## Access model

Row-level security is the enforcement point — the UI only mirrors it.

| Role | Sees |
|---|---|
| **Trainer** | their own students, and everything hanging off them (classes, homework, parent contacts and feedback) |
| **Lead Trainer** | their own students *plus* every student of the trainers reporting to them |
| **Head** (`team_head`) | the whole academy, plus roles, reporting lines and monthly reports |
| **Parent** | only the child whose `students.parent_user_id` matches their account |

The hierarchy is one level deep by design: a lead trainer sees their *direct*
reports. It does not walk lead → lead → trainer chains, because the model is
three fixed tiers.

`public.manages_trainer()` is the single predicate behind it — "may I see this
trainer's students?" — and every student-scoped policy, `can_access_student()`,
and both storage buckets route through it, so the rule is stated once. Only the
Head can change a role or a reporting line; a database trigger enforces that, so
a lead trainer cannot promote themselves or reassign who reports to them.

Parent feedback links are the one anonymous path: `/feedback/<token>` is
validated server-side (unknown, expired and already-used tokens are all
rejected) before a service-role client writes the row. Videos go straight to
Storage through a one-shot signed upload URL, so large files never hit the
serverless body limit.

## Weekly report email

The Head can email the weekly digest from **Reports → Email weekly report**,
choosing the recipients. Subject and body are generated from the week's data —
classes, attendance, videos, homework, parent contacts, outstanding weekly
submissions and any issues trainers raised. A scheduled send also runs every
Sunday (`vercel.json`, `0 18 * * 0`) to everyone holding the Head role.

Two transports are supported; set one. SMTP wins if both are present.

**SMTP** — Gmail, Zoho, Outlook or your host. Mail is sent through your own
mailbox, so the From address is genuinely yours and a copy lands in Sent:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM=PhonicsFlow <you@gmail.com>   # optional; defaults to SMTP_USER
```

For Gmail this needs 2-Step Verification enabled, then an App Password from
[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) —
not the account password. Free accounts allow ~500 recipients a day.

**Resend** — HTTP API, no SMTP port required:

```
RESEND_API_KEY=re_...
EMAIL_FROM=PhonicsFlow <reports@yourdomain.com>
```

Here the From domain must be verified in Resend. It cannot be a personal
mailbox: providers only send from domains they can authenticate by DNS, and a
From of `@gmail.com` would fail DMARC and bounce. The sender travels as the
display name and `Reply-To` instead.

Either way, `CRON_SECRET` guards the scheduled Sunday send:

```
CRON_SECRET=            # openssl rand -hex 32
```

Adding another provider means editing `sendEmail()` in `src/lib/email/send.ts`
and nothing else.

## Deployment

1. Push to GitHub and import the repo in Vercel.
2. Add the three environment variables in the Vercel dashboard.
3. Pushes to `main` deploy automatically.

## Project layout

```
src/
  app/
    (app)/            # authenticated shell — dashboard, students, classes, …
    api/              # report aggregation, feedback links, public feedback
    feedback/[token]/ # public parent feedback form
    login/  setup/
  components/
    ui/               # buttons, inputs, modal, toast — no component library
    charts/           # inline-SVG charts with a table view
    features/         # the modals shared across pages
    layout/
  lib/
    queries/          # TanStack Query hooks, one file per domain
    supabase/         # browser, server, admin and middleware clients
    validations.ts    # Zod schemas — the single source of form truth
supabase/
  schema.sql  seed.sql  generate-seed.mjs
```

## Notes

- Charts are hand-rolled inline SVG/CSS — no charting library. The categorical
  palette is validated for colour-vision deficiency, and every chart ships a
  table view because some slots sit below 3:1 against the light surface.
- Seed example sentences are deliberately templated. The diary is editable, so
  trainers replace them with their own wording.

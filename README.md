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

- **Trainer** — their own students, and everything hanging off them (classes,
  homework, parent contacts and feedback).
- **Team head** — the whole academy, plus trainer roles and monthly reports.
- **Parent** — a student's row can carry `parent_user_id`; that account sees only
  their own child.

`public.can_access_student()` is the single predicate behind the student-scoped
tables and both storage buckets, so the rule is stated once. A user can edit
their own profile but not their own `role` — a trigger blocks that, so a trainer
cannot promote themselves.

Parent feedback links are the one anonymous path: `/feedback/<token>` is
validated server-side (unknown, expired and already-used tokens are all
rejected) before a service-role client writes the row. Videos go straight to
Storage through a one-shot signed upload URL, so large files never hit the
serverless body limit.

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

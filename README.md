# PW-Style EdTech Platform — Full Working App

A production-ready Physics-Wallah-style learning platform in a single Next.js 14 monorepo. Not a demo — real DB, real auth, real file uploads, real test-taking with timer & scoring, real admin panel, and a manual "Contact-on-Instagram" purchase flow so **you get paid directly and approve students by their unique ID**.

## Stack

- **Next.js 14** (App Router, TypeScript) — UI + API routes in one repo
- **Prisma** ORM + **PostgreSQL** (Docker-compose file included)
- **Tailwind CSS**
- **JWT** (httpOnly cookie) + **bcryptjs**
- **Zod** input validation
- Local file uploads to `public/uploads/` (swap for S3 later if you want)

## 🚀 Run it in 3 commands

Prereqs: **Node.js 20+** and **Docker** (for the Postgres container).

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install + set env + migrate + seed
cp .env.example .env
npm install
npm run db:push
npm run db:seed

# 3. Run
npm run dev
# → http://localhost:3000
```

No Docker? Point `DATABASE_URL` at any Postgres you have (Neon, Supabase, Railway, local install) and skip step 1.

## Demo accounts (created by seed)

All passwords: `password123`

| Email                | Role    | What they can do                                    |
| -------------------- | ------- | --------------------------------------------------- |
| `admin@pw.local`     | admin   | Full admin panel, approve requests, manage users    |
| `teacher@pw.local`   | teacher | Upload content, dashboard                           |
| `student@pw.local`   | student | Browse, enroll (free), take tests, community        |

The seed also prints the demo users' `publicId` (unique IDs) in the console so you can test the "Grant access by User ID" flow immediately.

## 💸 Purchase flow: Contact on Instagram → Manual approval

No online payment gateway. Instead:

1. Student clicks **"📸 Contact on Instagram to buy"** on any paid batch.
2. Their browser opens `instagram.com/codmaayush` **and** a pre-filled DM message is copied to their clipboard, which includes their unique **User ID**:
   > `Hi! I want to buy "Class 11 JEE Arjuna 2026" (₹5999). My User ID: clx8k…`
3. A pending row appears in your `/admin/enrollment-requests` queue.
4. When their UPI/payment lands in your DMs, you either:
   - Click **Approve** on the queue row, or
   - Use the **⚡ "Grant access by User ID"** form at the top of the page (paste ID + pick batch → done).

Change the Instagram handle once in `src/lib/config.ts`.

## What's fully working

### Public site
- Home with hero, category grid, free & paid batch strips
- `/batches` browse with search + sub-category filter
- Batch detail with locked-content gating, tests list
- `/learn/…` viewer — YouTube embeds **and** uploaded MP4/WebM videos, PDFs, DPPs, links
- `/community` — post doubts/discussions/announcements, reply, upvote posts & replies
- `/profile` — user's unique ID with copy button, enrollments, purchase-request status

### Test-taking (real, not a stub)
- Admin creates tests at `/admin/tests/new` with any number of questions & options, per-question marks & negative marks
- Student opens `/tests/[id]`, hits Start
- Real countdown timer, question palette showing answered/unanswered, next/prev navigation
- Auto-submit when timer hits zero
- Backend scores against DB-hidden correct answers (correctness never sent to client)
- Result screen shows score, percent, rank, per-question solutions with green/red highlighting

### Admin panel (`/admin`, admin-only)
- Dashboard with counters + highlighted pending-request badge
- **Enrollment requests** queue with tabs, one-click approve/reject, quick "grant by User ID"
- Categories CRUD, Sub-Categories CRUD (with tags), Batches list + creation + full edit (with thumbnail upload) + activate/archive + delete
- Content uploader: YouTube embed URL, or direct file upload (video/PDF/image), free-preview flag, chapter linkage
- Users list with role changer + activate/deactivate toggle
- Tests list with question & attempt counts, create new test

### Teacher panel (`/teacher`)
- Dashboard with open-doubt counter, batch list
- Content upload (same form as admin)

### File uploads
- Endpoint: `POST /api/upload` (form-data, field `file`)
- 100 MB limit, allow-list of MIME types (images, PDFs, mp4/webm/mov)
- Files land in `public/uploads/` and are served directly by Next.js
- Random filename with timestamp — safe from collisions

### Auth & security
- JWT in httpOnly cookie (`sameSite=lax`, `secure` in prod), 7-day expiry
- bcrypt 10-round password hashing
- Zod validation on every write endpoint
- Role guards on all admin/teacher routes and APIs
- `controlsList="nodownload"` on uploaded videos

## Scripts

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Next.js dev server                            |
| `npm run build`     | Prisma generate + Next build (verified: passes) |
| `npm run start`     | Production server                             |
| `npm run db:push`   | Sync schema to DB                             |
| `npm run db:migrate`| Create + apply a proper migration             |
| `npm run db:seed`   | Seed data                                     |
| `npm run db:studio` | Prisma Studio DB GUI                          |

## Deployment

- **Vercel** for the app + **Neon** for Postgres is the fastest path.
- Set `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` in Vercel project env.
- Run `npx prisma migrate deploy` on release.
- **Note:** local `public/uploads/` won't persist across Vercel deploys — for production, switch `/api/upload` to write to S3/R2 (see `ARCHITECTURE.md` §11).

## Project layout

```
edtech-pw/
├── docker-compose.yml         ← Postgres 16
├── prisma/
│   ├── schema.prisma          ← all tables incl. tests/questions/options + EnrollmentRequest
│   └── seed.ts                ← full category tree + sample batches + sample test
├── public/uploads/            ← where uploaded files land
├── src/
│   ├── app/
│   │   ├── (public)           home, batches, learn, tests, community, profile, login/register
│   │   ├── admin/             admin panel (guarded)
│   │   ├── teacher/           teacher panel (guarded)
│   │   └── api/               REST endpoints
│   ├── components/            ContactToBuy, CopyId
│   └── lib/                   prisma, auth, config (Instagram handle), utils
├── tailwind.config.ts
├── next.config.mjs
├── package.json
└── .env.example
```

See `ARCHITECTURE.md` for the full design doc (data model, API surface, security notes, roadmap for future add-ons).

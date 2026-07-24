# Architecture — PW-Style EdTech Platform

> Design doc for the codebase in this repo. Read `README.md` for how to run it.

## 1. Why this stack?

The master prompt lists many stack options. We pick one to avoid split effort and produce something you can actually deploy:

- **Next.js 14 (App Router) full-stack** — one repo, one deploy target, TypeScript SSR pages + `/api` routes eliminate a separate Express server.
- **Prisma + PostgreSQL** — type-safe DB access, easy migrations, drop-in swap to MySQL by changing `provider`.
- **Tailwind CSS** — matches the "clean, modern, blue/white, mobile-first" design brief.
- **JWT in an httpOnly cookie** — simple auth that works with Server Components (`cookies()` on the server) and API routes.

Alternatives (and when to pick them):

| Alternative                        | When to prefer                                                          |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Next.js + **Django REST**          | You want the free Django admin panel & mature Python ecosystem.         |
| Next.js + **FastAPI**              | Python team, heavy ML/AI features (doubt-solver, analytics).            |
| **MERN** (Mongo)                   | Content is very unstructured; you don't need strict relations.          |

## 2. High-level system

```
                    ┌──────────────┐
                    │   Browser    │
                    │  (Next.js UI)│
                    └──────┬───────┘
                           │  HTTPS
              ┌────────────┴────────────┐
              │   Next.js (Vercel/Node) │
              │  ┌───────────────────┐  │
              │  │ App Router SSR    │──┼──► Server Components read DB directly
              │  │ /admin /batches …│  │
              │  ├───────────────────┤  │
              │  │ /api/* handlers   │──┼──► JSON APIs (auth, CRUD, payments)
              │  └───────────────────┘  │
              └──────┬─────────┬────────┘
                     │         │
              Prisma │         │ Razorpay SDK
                     ▼         ▼
              ┌──────────┐  ┌───────────┐
              │Postgres  │  │ Razorpay  │
              │(Neon/RW) │  │  Orders   │
              └──────────┘  └───────────┘
                     ▲
                     │  presigned uploads (future)
                     │
                 ┌───┴────┐
                 │  S3    │
                 └────────┘
```

- Video hosting: YouTube embeds today; Mux/CloudFront when needed.
- File hosting: URL fields today; S3 with presigned uploads in Phase 3.
- Cache: Redis is optional; add for hot lists (home page, batch cards). Not required for MVP.

## 3. Data model

All tables from the master prompt are implemented in `prisma/schema.prisma`. Notable choices:

- **BigInt primary keys** — matches the prompt (`BIGINT PK`). We patch `BigInt.prototype.toJSON` in `lib/prisma.ts` so `NextResponse.json()` doesn't choke.
- **Snake-case column names via `@map`** — column names match the master-prompt spec exactly (`display_order`, `is_paid`, etc.) while Prisma models stay camelCase in code.
- **Cascade deletes** on child rows (`SubCategory → Batch → BatchContent`) so admin cleanup is safe.
- **Composite unique** `enrollments(userId, batchId)` prevents double-enrollment.
- **Enums** — `Role`, `BatchType`, `ContentType`, `PaymentStatus`, `TestType`, `PostType` map to Postgres enums for integrity.

### Simplified ER diagram

```
Category (1) ── (N) SubCategory (1) ── (N) Batch
                                          │
                                          ├── (N) BatchContent ── (0..1) Chapter ── Subject
                                          ├── (N) Test          ── (N) TestAttempt ── User
                                          ├── (N) CommunityPost ── (N) CommunityReply
                                          ├── (N) Enrollment    ── User, Order
                                          └── (N) Order         ── User
Coupon (standalone, referenced at checkout)
```

## 4. Auth & authorization

- Passwords: `bcryptjs`, 10 rounds.
- Tokens: JWT signed with `JWT_SECRET`, 7-day expiry, delivered as `pw_token` httpOnly cookie.
- Server helpers in `src/lib/auth.ts`:
  - `currentUser()` — read cookie in a Server Component, return the User row.
  - `requireRole([...])` — API-route guard.
- Roles: `student | teacher | admin | sub_admin`.
- Route protection is done inline in Server Components (redirect from `/admin/*`, `/teacher/*`) and in each API route handler.

## 5. API surface

All under `/api/*`. JSON in/out unless noted.

| Method | Path                              | Auth        | Purpose                                    |
| ------ | --------------------------------- | ----------- | ------------------------------------------ |
| POST   | `/api/auth/register`              | public      | Create account, set cookie                 |
| POST   | `/api/auth/login`                 | public      | Login, set cookie                          |
| POST   | `/api/auth/logout`                | public      | Clear cookie                               |
| GET    | `/api/auth/me`                    | user        | Current user (or `null`)                   |
| GET    | `/api/categories`                 | public      | Categories + sub-categories                |
| POST   | `/api/categories`                 | admin       | Create category                            |
| PATCH  | `/api/categories/[id]`            | admin       | Update                                     |
| DELETE | `/api/categories/[id]`            | admin       | Delete                                     |
| GET    | `/api/sub-categories`             | public      | List                                       |
| POST   | `/api/sub-categories`             | admin       | Create                                     |
| GET    | `/api/batches?sub=<slug>`         | public      | List (filter by sub-category)              |
| POST   | `/api/batches`                    | admin/sub   | Create                                     |
| GET    | `/api/batches/[id]`               | public      | Detail incl. content & tests               |
| PATCH  | `/api/batches/[id]`               | admin/sub   | Update                                     |
| DELETE | `/api/batches/[id]`               | admin       | Delete                                     |
| POST   | `/api/content`                    | admin/tch   | Add BatchContent                           |
| POST   | `/api/enrollments`  (form)        | user        | Enroll (free batches only)                 |
| GET    | `/api/enrollments`                | user        | My enrollments                             |
| POST   | `/api/enrollment-requests`        | user        | Log a "contact-to-buy" request              |
| GET    | `/api/enrollment-requests?status=pending` | admin | List queue                                  |
| PATCH  | `/api/enrollment-requests/[id]`   | admin       | Approve / reject (approving auto-enrolls)   |
| POST   | `/api/enrollment-requests/grant`  | admin       | Enroll a user by `publicId` (no request needed) |
| GET    | `/api/tests`                      | public      | List                                       |
| POST   | `/api/tests`                      | admin/tch   | Create test                                |
| GET    | `/api/community/posts`            | public      | Feed                                       |
| POST   | `/api/community/posts`            | user        | Ask a doubt / post                         |
| POST   | `/api/community/replies`          | user        | Reply                                      |

**Validation:** every write route uses a Zod schema. Failed validation returns HTTP 400 with `{ error }`.

## 6. Pages (Server Components except where marked)

Public:
- `/` — hero, category grid, free & paid batch strips
- `/batches` — searchable/filterable list
- `/batches/[slug]` — detail w/ content list & sidebar CTA
- `/learn/[batchSlug]/[contentId]` — video/PDF viewer w/ sidebar TOC
- `/community` (client) — post + feed
- `/profile` — enrollments, order history
- `/tests/[id]` — test lobby (question UI TODO)
- `/login`, `/register` (client)

Admin (guarded in layout):
- `/admin` — stats dashboard (users, batches, orders, revenue, recent orders)
- `/admin/categories` (client), `/admin/sub-categories` (client)
- `/admin/batches`, `/admin/batches/new` (client form)
- `/admin/content` (client form for videos/PDFs/DPPs/links)
- `/admin/users`, `/admin/tests`, `/admin/orders`, `/admin/coupons`

Teacher:
- `/teacher` — assigned batches, open-doubt count
- `/teacher/upload` — reuses admin content form

## 7. Purchase flow — Contact-to-buy (Instagram DM + manual approval)

No online payment gateway. The flow is:

```
Student on /batches/[slug]
        │  clicks "📸 Contact on Instagram to buy"
        ▼
┌───────────────────────────────────┐
│ ContactToBuy client component     │
│ 1. POST /api/enrollment-requests  │──► EnrollmentRequest row (status=pending)
│ 2. Copies pre-filled DM message   │     — includes user.publicId & batch name
│ 3. window.open(IG profile)        │
└───────────────────────────────────┘
        │
        ▼
   Student DMs @codmaayush,
   pastes message (contains User ID),
   pays via UPI/etc. off-platform.
        │
        ▼
Admin opens /admin/enrollment-requests
   Option A: finds the pending row → Approve
   Option B: uses "⚡ Grant access by User ID" form
        │
        ▼
POST /api/enrollment-requests/[id]    (approve)
   or /api/enrollment-requests/grant  (by publicId + batchId)
        │
        ▼
Transaction:
  · upsert Enrollment (userId, batchId, expiresAt = now + validityMonths)
  · increment Batch.enrollmentCount
  · mark any matching pending request → approved
        │
        ▼
Student refreshes /batches/[slug] → "Continue learning"
```

**Key implementation bits:**

- `User.publicId` (`cuid`, unique) is the shareable "unique id" — Prisma generates it on insert, so all new signups get one automatically. Shown on `/profile` with a Copy button.
- `EnrollmentRequest` model has an `@@index([status, createdAt])` so the admin queue paginates well.
- Approving is transactional (`prisma.$transaction`) so an Enrollment either fully exists or the request stays pending.
- Instagram handle is one constant in `src/lib/config.ts` — change it once and every button/message updates.

**Later, if you want to add online payments back:**
Bring back the deleted `/api/payments/razorpay` route + a sibling `/verify` route that HMAC-checks `SHA256(order_id + "|" + payment_id, key_secret)`, then run the same transactional enrollment code. The `Order` model in `schema.prisma` is still there and unused, ready to hold gateway data.

## 8. Video & content strategy

| Option              | Pros                                | Cons                                      |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| YouTube unlisted    | Free, easy, CDN'd (**current MVP**) | Content leak risk, YouTube UI limitations |
| Mux / Vimeo         | DRM, analytics, adaptive bitrate    | Paid                                      |
| S3 + CloudFront + HLS + signed cookies | Full control                | Ops overhead                              |

`BatchContent` already carries both `videoUrl` (direct) and `embedUrl` (YouTube-style iframe). The viewer at `/learn/…` picks based on `contentType` + which URL is set.

## 9. Security checklist

- ✅ Passwords hashed (bcrypt)
- ✅ JWT in httpOnly cookie, `sameSite=lax`, `secure` in prod
- ✅ Zod validation on every write endpoint
- ✅ Role checks on admin/teacher endpoints
- 🚧 CSRF: forms use POST + same-site cookies (fine for MVP); add double-submit token if you expose XHR to other origins
- 🚧 Rate limiting: add `@upstash/ratelimit` in front of auth & community endpoints
- 🚧 Content authorization: paid content served via signed URLs (S3/CloudFront) once real files are uploaded

## 10. Roadmap (mapped to your Phases)

### ✅ Phase 1 — Setup & DB (done)
- Prisma schema, seed, JWT auth, project scaffolding.

### ✅ Phase 2 — Admin Panel (done)
- Dashboard, categories/sub-categories/batches/content CRUD, users/orders/tests/coupons views.

### 🟡 Phase 3 — Student App (partly done)
- ✅ Home, browse, batch detail, learn (video/PDF)
- 🚧 Test-taking UX + `TestQuestion`/`TestOption`/`TestAnswer` models
- 🚧 Video player with resume position, speed, quality (swap iframe for [Mux Player] or [video.js])
- 🚧 Offline download (PWA + `IndexedDB`)

### 🟡 Phase 4 — Community & Payments (partly done)
- ✅ Doubt feed & replies
- ✅ Local order + free enrollment
- 🚧 Real Razorpay checkout + signature verification + webhooks
- 🚧 Upvote endpoints, accepted-answer flow

### 🟡 Phase 5 — Teacher (partly done)
- ✅ Dashboard + content upload (via shared admin form)
- 🚧 "Assigned batches" model (needs a `BatchTeacher` join table)
- 🚧 Doubt-queue UI filtered to teacher's batches

### 🔵 Phase 6 — Advanced (TODO)
- AI doubt solver (embed OpenAI / on-device LLM behind `/api/ai/solve`)
- Analytics dashboards (Recharts on top of `TestAttempt`, `Enrollment`, `Order`)
- Push notifications (Web Push / FCM)
- Mobile apps (React Native + reuse the same API)

## 11. Deployment (recommended)

- **App:** Vercel (auto-CI from GitHub). Add env vars in project settings.
- **DB:** Neon Postgres (free tier, serverless, plays well with Vercel).
- **Storage:** AWS S3 (or Cloudflare R2). Configure a bucket with presigned uploads and CloudFront in front.
- **CDN:** Vercel handles static + ISR out of the box.
- **CI/CD:** GitHub Actions running `npm run build` + `prisma migrate deploy` on push to `main`.

## 12. Where to extend next

1. Wire real Razorpay (`/api/payments/razorpay/verify/route.ts`).
2. Add `Question`/`Option`/`Attempt` models & test player UI.
3. Add S3 presigned-URL upload endpoint + swap the URL text-boxes for file inputs.
4. Add `BatchTeacher` many-to-many; scope `/teacher/*` queries by teacher id.
5. Add `Review` model + star display on batch cards.
6. Add PWA manifest + service worker for offline notes.

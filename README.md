# Leadline

A shared lead pipeline for small teams that sell — built for the Digital Heroes
Full Stack Development task.

**Why this instead of a generic "lead form + admin table":** the brief asked for
a lead *platform*, not a form, so I built it around the actual failure mode a
small agency hits — leads arrive from multiple places, someone has to own each
one, and if there's no durable record of who touched a lead and when, deals
quietly die between "reply" and "proposal sent." Leadline's core object isn't
the lead's current state, it's the **activity trail** — every status change,
assignment, and note is a permanent row, not a field that gets overwritten.

Live demo: `<add your deployed URL here>`
Demo accounts (after seeding): `admin@leadline.dev` / `admin1234` and
`member@leadline.dev` / `member1234`

## Architecture, and why

| Decision | Reasoning |
|---|---|
| **Next.js App Router, one deployable** | Frontend and API live in one project, one deploy target (Vercel). For a team of this size, a separate backend service is operational overhead with no payoff yet. |
| **Custom JWT auth (`jose`) instead of NextAuth/Auth.js** | Only two roles, one credential type, no OAuth providers needed. NextAuth's abstraction earns its keep once you have multiple providers or SSO; here it would be more surface area to secure for no functional gain. `jose` specifically (not `jsonwebtoken`) because middleware runs on the Edge runtime, which doesn't have Node's `crypto` — `jose` works in both. |
| **Prisma + Postgres** | Type-safe queries, migrations as code, and Postgres because a real pipeline needs real concurrent writes (two reps updating different leads at once) — SQLite's single-writer lock isn't a fit even at this scale. |
| **Role enforcement server-side, not just UI-hidden** | The assign control is hidden from members in the UI, but `/api/leads/:id/assign` independently checks the session role. UI hiding is a courtesy; the server check is the actual boundary — see `tests/leads-api.test.ts` for the test that hits the endpoint directly as a member and expects a 403. |
| **Activity log as its own table, not derived** | Statuses get overwritten; a table of "what happened, when, who did it" doesn't. This is what makes the activity trail requirement real rather than cosmetic. |
| **Zod at every input boundary** | Public capture endpoint, internal creation, status updates, notes, assignment — all validated before touching the database. The public endpoint gets an additional in-memory rate limit since it's the one route anyone on the internet can hit. |

**Known limitation, stated rather than hidden:** the public-endpoint rate
limiter is in-memory and per-process. Fine for a single instance; on a
multi-instance deploy it'd need to move to Redis or a similar shared store.
Flagging this because pretending it isn't a limitation would be worse than
having it.

## Local setup

1. **Get a Postgres database.** Fastest path: a free [Neon](https://neon.tech)
   project (no card required) — create one, copy the pooled connection string.
2. `cp .env.example .env` and fill in `DATABASE_URL` and `AUTH_SECRET`
   (generate the secret with `openssl rand -base64 32`).
3. `npm install`
4. `npx prisma generate && npx prisma db push` — creates the schema in your database.
5. `npm run db:seed` — creates the two demo accounts and a few sample leads.
6. `npm run dev` — visit `http://localhost:3000` for the public form,
   `http://localhost:3000/login` to sign in.

## Tests

`npm test` — runs the Vitest suite (auth core + the two required API flows).
See `docs/CI-NOTE.md` for what's covered in CI versus what needs a live
database and why that split exists.

## API reference

All endpoints return JSON. Authenticated endpoints read the `leadline_session`
httpOnly cookie set at login — there's no separate bearer-token flow.

### `POST /api/auth/login`
Public. Body: `{ email, password }`. Sets the session cookie on success.
`401` on bad credentials (same error for unknown email and wrong password,
deliberately — doesn't leak which one it was).

### `POST /api/auth/logout`
Clears the session cookie.

### `GET /api/auth/me`
Requires auth. Returns the current user (id, name, email, role).

### `POST /api/leads/capture`
**Public, unauthenticated.** The target of the public lead form.
Body: `{ fullName, email, company?, message?, source? }`.
Rate-limited to 5 requests/minute per IP. Returns `201` with the new lead's id.

### `GET /api/leads`
Requires auth (any role). Lists leads for the shared pipeline view.

Query params:
- `page` (default 1), `pageSize` (default 20, max 100)
- `status` — one of `NEW | CONTACTED | QUALIFIED | PROPOSAL_SENT | WON | LOST`
- `assignedToId` — filter to one owner
- `q` — case-insensitive search across name, email, company

Response:
```json
{
  "data": [ { "id": "...", "fullName": "...", "status": "NEW", "assignedTo": null } ],
  "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```

### `POST /api/leads`
Requires auth. Internal creation (e.g. a rep logging a lead from a phone call).
Body: `{ fullName, email, company?, message?, source? }`. Returns `201`.

### `GET /api/leads/:id`
Requires auth. Full lead detail including `notes[]` and `activities[]`,
each newest-first.

### `PATCH /api/leads/:id`
Requires auth (**any role** — moving a lead through the pipeline is day-to-day
sales work, not an admin privilege). Body: `{ status }`. Writes a
`STATUS_CHANGED` activity row only when the status actually changes.

### `PATCH /api/leads/:id/assign`
**Admin only** — the one endpoint gated beyond "is logged in." Body:
`{ assignedToId: string | null }` (`null` unassigns). Returns `403` for a
member. This is deciding who owns a lead, which in a small team is a
team-lead call, not rep self-service.

### `POST /api/leads/:id/notes`
Requires auth (any role). Body: `{ body }`. Adds a timestamped note attributed
to the caller.

### `GET /api/users`
**Admin only** — populates the assignment dropdown. Not exposed to members
since they can't assign anyway.

## A note on scope

I did not add email notifications, a real-time layer (websockets for live
pipeline updates), or CSV export, even though a real version of this product
would eventually want all three. I'd rather ship a smaller set of things done
correctly — real permission enforcement, a real audit trail, real tests — than
a longer feature list with the actual hard parts skipped.

---

### Where I used AI on this task
*(personalize this before you submit — this is a starting draft, not a script)*

I used Claude to scaffold the Next.js/Prisma project structure and generate
the first pass of the API routes, auth logic, and UI components, then went
through and changed [specific things you changed — e.g. "swapped jsonwebtoken
for jose after realizing the middleware runs on the Edge runtime," "rewrote
the activity-log design after deciding a derived view wouldn't actually
satisfy the audit-trail requirement," "cut the feature list down after the
first draft tried to do too much"]. I did not submit the first output — the
architecture decisions in the table above and the test cases in
`tests/leads-api.test.ts` are the parts I'd stand behind in the interview.

# Why CI runs tests but not a full Prisma build

The GitHub Actions workflow runs lint and the Vitest suite on every push.
It deliberately does **not** run `prisma generate` / `prisma db push` / `next build`
in CI, because those need a real `DATABASE_URL` pointed at a live Postgres
instance, and I didn't want to commit a shared database credential into a
public repo for a take-home task.

If this were a real production repo, the fix is a Neon (or Supabase) **branch
database** created fresh per CI run via their GitHub Action, torn down after —
so tests run against a real, disposable Postgres rather than mocks. That's a
15-minute addition (`neondatabase/create-branch-action` + a migrate step) and
I've left it out on purpose rather than half-wire it with a shared secret.

What CI *does* cover honestly: the auth core (password hashing, session
signing/verification, the admin-only assignment rule) and the two request
flows in `tests/leads-api.test.ts`, all against an in-memory fake of the
Prisma calls those routes make — not a mocking-library stub that just counts
calls, but one that actually tracks state, so a test like "member changes
status, activity log gets one row" is exercising real logic, not a rubber
stamp.

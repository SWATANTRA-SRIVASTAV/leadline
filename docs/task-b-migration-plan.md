# Task B — Phased migration plan

No big-bang rewrite. Each phase ships behind normal deploys, and the app stays
live and correct throughout.

## Week 1

- Rotate all committed secrets (API keys, DB credentials, signing secrets).
  Move them to environment variables / a secrets manager. Confirm nothing in
  the current deploy pipeline still reads from the committed values.
- Scrub secrets from git history and force-push (coordinated with the team —
  this rewrites shared history, so everyone needs to re-clone or hard-reset).
- Stand up a CI pipeline if one doesn't exist: lint + whatever tests already
  pass, even if that's zero tests. The goal in week 1 is a pipeline that
  *can* grow, not one that's already strict.
- Pick the single highest-risk entity currently reachable directly from the
  frontend and put a real API endpoint in front of it. Point the frontend at
  the new endpoint. Nothing else about that entity changes yet.

## Month 1

- Repeat the "put an API in front of it" step for the remaining entities the
  frontend talks to directly, one at a time, each behind its own PR and
  deploy — not as one large migration branch that diverges from main for
  weeks.
- Write characterization tests for the two or three business-logic-in-routes
  modules that change most often (git log frequency is a reasonable proxy
  for "most likely to be touched, and therefore most valuable to protect
  before you touch it again").
- Extract the logic those characterization tests cover into plain functions
  the route handlers call, rather than contain. Route handlers become thin:
  parse input, call the function, shape the response.
- Start requiring tests on new code via a lightweight CI check (doesn't have
  to be a hard coverage gate yet — even "PRs touching business logic need at
  least one test" is a real improvement over zero).

## Quarter 1

- Extend the extraction pattern to the rest of the route handlers.
- Introduce a real coverage threshold in CI once coverage has organically
  risen enough that the threshold isn't purely aspirational — a target set
  before the codebase can plausibly meet it just trains people to write
  tests that pad the number.
- Revisit the API layer built in week 1/month 1 for consistency (naming,
  error shapes, auth patterns) now that it's had a few entities' worth of
  real usage to reveal what the pattern should actually be.
- Retire any remaining direct frontend-to-database paths. By this point they
  should be rare enough that the last few are a known, scoped list rather
  than a discovery exercise.

## What "done" looks like at each checkpoint

- End of week 1: no live secret is sitting in the repo; the single riskiest
  data path no longer bypasses the server.
- End of month 1: the frontend no longer talks to the database directly for
  anything; the most-changed business logic has a test around it before
  anyone edits it again.
- End of quarter 1: new code is tested by default because CI asks for it,
  not because someone remembers to; the codebase looks like a system that was
  designed, not one that grew a new API layer bolted onto an old one.

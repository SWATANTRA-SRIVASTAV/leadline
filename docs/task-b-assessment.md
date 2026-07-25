# Task B — Assessment: inheriting a codebase with no tests, fat route handlers, frontend-to-DB calls, and committed secrets

## The situation, restated plainly

Four separate problems, each with a different blast radius if left alone:

1. **No tests.** Not a bug itself, but it's why every other fix on this list
   is dangerous — there's no safety net telling you when a change broke
   something. This is the multiplier on every other risk here.
2. **Business logic inside route handlers.** Works, but it means the rules of
   the system only exist as a side effect of how HTTP requests happen to be
   shaped. You can't unit test a discount calculation without spinning up a
   server and faking a request.
3. **Frontend calling the database directly.** The most dangerous item on
   this list. It means there is no enforcement point for authorization,
   validation, or business rules — the client is trusted to do the right
   thing, and a client is never a trust boundary.
4. **Secrets committed to the repo.** The most *urgent* item, separate from
   "dangerous" — every person who has ever had read access to this repo,
   including former employees and any public fork, has those credentials
   right now, whether or not the repo is currently private.

## Order of operations, and why this order

**Immediately (before anything else, hours not days): rotate every committed
secret and scrub them from git history.**
Rotation is non-negotiable and can't wait for a "cleanup sprint" — a leaked
credential is compromised the moment it's pushed, not the moment someone
notices it. History-scrubbing (`git filter-repo` or BFG) matters too, but
rotation is what actually closes the hole; scrubbing just tidies up after.
Risk of leaving this in place even one more day: unbounded — you don't
control who already has the old value.

**Next: stop the frontend-to-database calls, one entity at a time.**
This is the one architectural flaw that makes every other layer of the app
unenforceable — you can't add auth checks, validation, or rate limiting to a
call the server never sees. I'd put a thin API layer in front of the
highest-risk entity first (whichever table holds customer PII or payment
data — that's a judgment call specific to this app, but it's rarely the
lowest-traffic table), proxy reads/writes through it, and only then touch the
next entity. Doing all entities at once is how a "migration" becomes a
rewrite.

**In parallel, starting now but running for weeks: characterization tests
around existing behavior before refactoring it.**
Not unit tests of clean code — tests that pin down what the *current*, messy
code actually does, so a refactor has something to fail loudly against if it
changes behavior by accident. Write these for whatever module you're about
to touch, not the whole app at once.

**Then: extract business logic out of route handlers, module by module, each
one following the same characterization-test-first pattern.**
Lower urgency than the two items above because a fat route handler is a
*maintainability* cost, not a live security or data-integrity risk. It gets
worse the longer it's left, but it doesn't get worse *suddenly*.

**Ongoing, not a phase: raise test coverage on new and touched code as a
standing rule**, rather than a separate "add tests" project that competes for
priority against feature work and always loses.

## What I'm not doing

Not proposing a rewrite. A working system serving real customers has
survivorship value a clean rewrite doesn't — every edge case it handles
correctly is one you'd otherwise have to rediscover the hard way. The plan
above is entirely about changing the system while it keeps running, not
replacing it.

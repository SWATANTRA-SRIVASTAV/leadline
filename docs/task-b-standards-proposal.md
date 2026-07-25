# Task B — Engineering standards proposal, and getting a resistant team to adopt them

## The standards

Kept short on purpose — a 40-item style guide gets skimmed once and ignored;
five rules people can actually hold in their head get followed.

1. **Route handlers parse, call, and respond. Business logic lives in plain
   functions.** The test: could you unit test this rule without a database or
   an HTTP mock? If not, it's not a plain function yet.
2. **No secrets in the repo, ever — including in commit history.**
   Environment variables or a secrets manager, checked in CI with a
   secret-scanning step (e.g. gitleaks) that fails the build if it finds one.
3. **The frontend never talks to the database directly.** Every data access
   goes through an API endpoint that can enforce auth and validation.
4. **New or changed business logic ships with a test.** Not a coverage
   percentage — a rule that a PR touching `discounts.js` (or its future
   equivalents) isn't mergeable without a test that exercises the change.
5. **Every PR gets one review before merge**, specifically checking the first
   four rules — not a general "does this look okay" pass.

## Why five and not more

Standards that require memorizing a long document get followed exactly until
the first deadline crunch, at which point they're the first thing skipped.
Five rules that map directly onto the four real problems in this codebase
(untested logic, leaked secrets, unenforceable data access, no review gate)
are easier to defend in a PR comment than to argue around.

## Getting adoption from a team that likes its current habits

**Don't lead with the document.** Leading with "here are the new standards"
invites the team to relitigate each rule in the abstract, which is a fight
nobody wins. Instead, introduce each rule at the point it would have caught a
real problem — when reviewing the PR that fixes the frontend-to-database
issue is the moment to propose rule 3, not before.

**Make the easy path the compliant path.** If following a rule requires
remembering to do something extra, it will eventually not happen. Secret
scanning in CI (rule 2) and a lint rule that flags direct DB imports outside
the API layer (rule 3) turn "please remember" into "the build fails if you
don't." Rules 1 and 4 are harder to fully automate, which is exactly why rule
5's review gate exists — a human check for the two rules a machine can't
fully verify.

**Start on new code, not a retroactive sweep.** Announcing that the whole
existing codebase now needs to meet a new bar creates a mountain nobody wants
to climb, and it's demoralizing to be told existing working code is
"non-compliant." The standards apply going forward; existing code gets
brought into line as it's naturally touched (which is what the migration
plan's "module by module, following characterization tests" approach already
does).

**Credit the fix, not the rule.** When rule 3 catches a real bug before it
ships, that's the story that gets retold in standup — not "the standards
document says." People adopt practices they've seen save them, not practices
they were told to follow.

# Task B — What the refactor actually improved

Compare `task-b-refactor-before.js` and `task-b-refactor-after.js`.

**The rule became something you can reason about without a server.**
Before, understanding the VIP10 rule meant reading it inside a function that
also does a database read, a second database read, and a database write —
you have to hold all of that in your head to trust that the 10%-vs-5% logic
is correct. After, `calculateDiscount` takes plain values in and returns a
number out. No database, no request object, no response object. That's the
entire difference between "logic that happens to run inside a route handler"
and "logic that's a function."

**The cap stopped being a landmine.**
In the before version, the 50% cap is a bare `if` bolted on after the two
rule branches, with a comment admitting it was "added later." Someone editing
VIP10's rate six months from now has no signal that the cap exists unless
they scroll past it. After, the cap is the last line of the same small
function every rule flows through — it can't be edited around by accident
because there's nowhere else for a new rule to go.

**It's now testable per rule, not just per endpoint.**
The five tests in the after-file each pin down one specific behavior: the
gold-tier rate, the non-gold rate, the first-order cap, the first-order
denial for repeat customers, and the interaction between a rule's own math
and the global cap. Before, testing any of this meant spinning up a server,
faking an HTTP request, and stubbing two separate database calls just to
check one multiplication. That gap — "technically testable" versus
"realistically going to get tested" — is most of why untested route-handler
logic stays untested.

**The route handler now matches what a route handler should be.**
Four lines: load the order, gather the one extra fact the rule needs, call
the pure function, persist and respond. If the discount rules change, this
file doesn't. If the route needs a new step (say, an audit log entry), that
change is obviously scoped to this file and doesn't risk touching the pricing
math.

**What this pattern does *not* claim to fix on its own:** it doesn't remove
the database calls, add validation, or add auth — those are separate,
already-covered items in the assessment and migration plan. This refactor is
scoped to exactly one thing: getting business logic out of a place where it
can't be tested and into a place where it can.

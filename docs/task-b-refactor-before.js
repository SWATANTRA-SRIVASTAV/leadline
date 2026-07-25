// BEFORE — a realistic example of the pattern described in the assessment:
// business logic, validation, and a raw DB call all tangled inside one route
// handler. This is Express-style pseudocode representative of what "logic
// inside route handlers" looks like in practice, written from scratch as a
// stand-in for the (non-existent, per the brief) actual legacy repo.

app.post("/api/orders/:id/apply-discount", async (req, res) => {
  const order = await db.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!order.rows[0]) {
    return res.status(404).send("not found");
  }
  const o = order.rows[0];

  // discount business rules, inline, untested, and unreadable at a glance
  let discount = 0;
  if (req.body.code === "VIP10") {
    if (o.customer_tier === "gold" || o.customer_tier === "platinum") {
      discount = o.subtotal * 0.1;
    } else {
      discount = o.subtotal * 0.05;
    }
  } else if (req.body.code === "FIRSTORDER") {
    const priorOrders = await db.query(
      "SELECT count(*) FROM orders WHERE customer_id = $1 AND status = 'completed'",
      [o.customer_id]
    );
    if (parseInt(priorOrders.rows[0].count) === 0) {
      discount = Math.min(o.subtotal * 0.15, 20);
    }
  }

  if (discount > o.subtotal * 0.5) {
    discount = o.subtotal * 0.5; // cap, added later, easy to miss on re-read
  }

  await db.query("UPDATE orders SET discount = $1, total = subtotal - $1 WHERE id = $2", [
    discount,
    o.id,
  ]);

  res.json({ discount, total: o.subtotal - discount });
});

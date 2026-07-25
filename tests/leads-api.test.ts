import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the session before importing anything that reads it, so route handlers
// see whichever user each test sets up.
const mockSession = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => mockSession.current),
}));

// In-memory fake of the one Prisma model surface the leads routes touch.
// This is deliberately a hand-rolled fake, not a mocking library spy —
// it behaves like a tiny real database so the tests exercise real logic
// (existing-status comparisons, 404s, etc.) rather than just call counts.
const db = vi.hoisted(() => ({
  leads: new Map<string, Record<string, unknown>>(),
  users: new Map<string, Record<string, unknown>>(),
  activities: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.leads.get(id) ?? null
      ),
      update: vi.fn(
        async ({
          where: { id },
          data,
          include,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
          include?: Record<string, unknown>;
        }) => {
          const existing = db.leads.get(id)!;
          const updated = { ...existing, ...data };
          db.leads.set(id, updated);
          if (include?.assignedTo && updated.assignedToId) {
            return { ...updated, assignedTo: db.users.get(updated.assignedToId as string) };
          }
          if (include?.assignedTo) return { ...updated, assignedTo: null };
          return updated;
        }
      ),
    },
    user: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
        db.users.get(id) ?? null
      ),
    },
    activity: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.activities.push(data);
        return data;
      }),
    },
  },
}));

const { PATCH: patchLead } = await import("@/app/api/leads/[id]/route");
const { PATCH: patchAssign } = await import("@/app/api/leads/[id]/assign/route");

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  db.leads.clear();
  db.users.clear();
  db.activities.length = 0;
  db.leads.set("lead_1", {
    id: "lead_1",
    fullName: "Priya Nair",
    status: "NEW",
    assignedToId: null,
  });
  db.users.set("admin_1", { id: "admin_1", name: "Amara", role: "ADMIN" });
  db.users.set("member_1", { id: "member_1", name: "Jonah", role: "MEMBER" });
  mockSession.current = null;
});

describe("flow: moving a lead through the pipeline", () => {
  it("lets any authenticated user (member included) change status", async () => {
    mockSession.current = { sub: "member_1", email: "jonah@leadline.dev", role: "MEMBER" };
    const res = await patchLead(
      makeRequest("http://test/api/leads/lead_1", { status: "CONTACTED" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("CONTACTED");
    expect(db.activities).toHaveLength(1);
    expect(db.activities[0].detail).toBe("NEW -> CONTACTED");
  });

  it("rejects an unauthenticated request", async () => {
    mockSession.current = null;
    const res = await patchLead(
      makeRequest("http://test/api/leads/lead_1", { status: "CONTACTED" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for a lead that doesn't exist", async () => {
    mockSession.current = { sub: "member_1", email: "jonah@leadline.dev", role: "MEMBER" };
    const res = await patchLead(
      makeRequest("http://test/api/leads/does-not-exist", { status: "CONTACTED" }),
      { params: Promise.resolve({ id: "does-not-exist" }) }
    );
    expect(res.status).toBe(404);
  });

  it("rejects an invalid status value", async () => {
    mockSession.current = { sub: "member_1", email: "jonah@leadline.dev", role: "MEMBER" };
    const res = await patchLead(
      makeRequest("http://test/api/leads/lead_1", { status: "ON_THE_MOON" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("flow: assigning a lead (the one admin-gated action)", () => {
  it("blocks a member from assigning a lead", async () => {
    mockSession.current = { sub: "member_1", email: "jonah@leadline.dev", role: "MEMBER" };
    const res = await patchAssign(
      makeRequest("http://test/api/leads/lead_1/assign", { assignedToId: "member_1" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(403);
    expect(db.leads.get("lead_1")!.assignedToId).toBeNull();
  });

  it("lets an admin assign a lead to a valid user", async () => {
    mockSession.current = { sub: "admin_1", email: "amara@leadline.dev", role: "ADMIN" };
    const res = await patchAssign(
      makeRequest("http://test/api/leads/lead_1/assign", { assignedToId: "member_1" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(200);
    expect(db.leads.get("lead_1")!.assignedToId).toBe("member_1");
  });

  it("rejects assignment to a user that doesn't exist", async () => {
    mockSession.current = { sub: "admin_1", email: "amara@leadline.dev", role: "ADMIN" };
    const res = await patchAssign(
      makeRequest("http://test/api/leads/lead_1/assign", { assignedToId: "ghost" }),
      { params: Promise.resolve({ id: "lead_1" }) }
    );
    expect(res.status).toBe(400);
  });
});

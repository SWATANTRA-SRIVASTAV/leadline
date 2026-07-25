import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import type { LeadStatus } from "@prisma/client";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUSES).optional(),
  assignedToId: z.string().optional(),
  q: z.string().trim().max(200).optional(), // search on name/email/company
});

/**
 * GET /api/leads?page=1&pageSize=20&status=NEW&assignedToId=...&q=acme
 *
 * Every authenticated user (admin or member) can list leads — Leadline is a
 * shared pipeline, not siloed per-user data. Filtering and pagination are
 * server-side so the client never has to fetch the whole table to filter it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { page, pageSize, status, assignedToId, q } = parsed.data;

  const where = {
    ...(status ? { status: status as LeadStatus } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    data: leads,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

const createSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(100).optional(),
});

/** POST /api/leads — internal creation (e.g. a rep adding a lead from a call). */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the fields.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: { ...parsed.data, source: parsed.data.source ?? "manual" },
  });
  await logActivity(lead.id, "CREATED", `Lead added manually by ${auth.session.email}`, auth.session.sub);

  return NextResponse.json({ data: lead }, { status: 201 });
}

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ data: lead });
}

const patchSchema = z.object({
  status: z.enum(STATUSES),
});

/**
 * PATCH /api/leads/:id — move a lead through the pipeline.
 * Any authenticated user can do this (admin or member): status changes are
 * day-to-day sales work, not an admin privilege. Assignment is the one that's
 * gated — see /assign.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "status must be one of " + STATUSES.join(", ") },
      { status: 400 }
    );
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: parsed.data.status as LeadStatus },
  });

  if (existing.status !== lead.status) {
    await logActivity(
      lead.id,
      "STATUS_CHANGED",
      `${existing.status} -> ${lead.status}`,
      auth.session.sub
    );
  }

  return NextResponse.json({ data: lead });
}

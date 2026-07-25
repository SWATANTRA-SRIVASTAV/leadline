import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";

const assignSchema = z.object({
  // null unassigns
  assignedToId: z.string().nullable(),
});

/**
 * PATCH /api/leads/:id/assign — admin only.
 * This is the one place role is enforced server-side beyond "is logged in":
 * deciding who owns a lead is a team-lead decision, not a rep self-service
 * action. The client also hides the assign control from members, but that's
 * a UX nicety — this check is what actually stops a member curling the
 * endpoint directly.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "assignedToId is required (or null)." }, { status: 400 });
  }

  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found." }, { status: 400 });
    }
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { assignedToId: parsed.data.assignedToId },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity(
    id,
    "ASSIGNED",
    updated.assignedTo ? `Assigned to ${updated.assignedTo.name}` : "Unassigned",
    auth.session.sub
  );

  return NextResponse.json({ data: updated });
}

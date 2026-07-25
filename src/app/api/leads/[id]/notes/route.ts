import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";

const noteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: { leadId: id, authorId: auth.session.sub, body: parsed.data.body },
  });
  await logActivity(id, "NOTE_ADDED", "Note added", auth.session.sub);

  return NextResponse.json({ data: note }, { status: 201 });
}

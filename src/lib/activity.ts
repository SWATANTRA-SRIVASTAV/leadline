import { prisma } from "@/lib/prisma";

export async function logActivity(
  leadId: string,
  type: string,
  detail: string,
  actorId?: string | null
) {
  await prisma.activity.create({
    data: { leadId, type, detail, actorId: actorId ?? null },
  });
}

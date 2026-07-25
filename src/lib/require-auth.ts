import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/auth";

type Ok = { ok: true; session: SessionPayload };
type Err = { ok: false; response: NextResponse };

export async function requireAuth(): Promise<Ok | Err> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export async function requireAdmin(): Promise<Ok | Err> {
  const result = await requireAuth();
  if (!result.ok) return result;
  if (result.session.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin role required for this action." },
        { status: 403 }
      ),
    };
  }
  return result;
}

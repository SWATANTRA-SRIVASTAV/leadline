import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// Deliberately narrow: a public endpoint should accept the smallest payload
// that does the job. No status, no assignment, no internal fields — those only
// exist once a lead is inside the pipeline.
const captureSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(100).optional(),
});

// Very small in-memory throttle: a public form is the one endpoint anyone on
// the internet can hit, so it gets a rate limit even without full infra.
// Per-process only — fine for a single-instance deploy, called out as a known
// limitation in the README rather than left silent.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > MAX_HITS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again in a minute." },
      { status: 429 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = captureSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form fields.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      company: parsed.data.company,
      message: parsed.data.message,
      source: parsed.data.source ?? "website",
    },
  });

  await logActivity(lead.id, "CREATED", `Lead captured from ${lead.source}`);

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}

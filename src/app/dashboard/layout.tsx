import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.sub },
        select: { name: true, email: true, role: true },
      })
    : null;

  return (
    <div>
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Leadline
          </Link>
          <span className="ml-2 text-xs text-neutral-500">pipeline</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          {user && (
            <span>
              {user.name}{" "}
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs uppercase text-neutral-400">
                {user.role}
              </span>
            </span>
          )}
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-900"
    >
      Sign out
    </button>
  );
}

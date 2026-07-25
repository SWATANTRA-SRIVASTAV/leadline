"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function CapturePage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      company: form.get("company") || undefined,
      message: form.get("message") || undefined,
      source: "website",
    };

    const res = await fetch("/api/leads/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setStatus("done");
      e.currentTarget.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Leadline</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Tell us a bit about what you&apos;re building. A real person reads every
          message here — usually within a day.
        </p>
      </div>

      {status === "done" ? (
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-5 text-sm text-emerald-300">
          Thanks — that&apos;s in. We&apos;ll be in touch shortly.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Full name</label>
            <input
              name="fullName"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Work email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Company <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              name="company"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              What are you looking for?
            </label>
            <textarea
              name="message"
              rows={4}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
          >
            {status === "submitting" ? "Sending…" : "Get in touch"}
          </button>
        </form>
      )}

      <p className="mt-10 text-center text-xs text-neutral-600">
        Team member?{" "}
        <Link href="/login" className="underline hover:text-neutral-400">
          Sign in
        </Link>
      </p>
    </main>
  );
}

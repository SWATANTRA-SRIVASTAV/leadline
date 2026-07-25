"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"];

type Note = { id: string; body: string; createdAt: string; author: { name: string } };
type Activity = {
  id: string;
  type: string;
  detail: string;
  createdAt: string;
  actor: { name: string } | null;
};
type LeadDetail = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  message: string | null;
  status: string;
  source: string;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
  notes: Note[];
  activities: Activity[];
};
type CurrentUser = { id: string; name: string; role: "ADMIN" | "MEMBER" };

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    const [leadRes, meRes] = await Promise.all([
      fetch(`/api/leads/${id}`),
      fetch(`/api/auth/me`),
    ]);
    if (leadRes.ok) setLead((await leadRes.json()).data);
    if (meRes.ok) {
      const meData = (await meRes.json()).user;
      setMe(meData);
      if (meData?.role === "ADMIN") {
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) setUsers((await usersRes.json()).data);
      }
    }
  }, [id]);

  useEffect(() => {
    // Standard fetch-on-mount pattern; the effect synchronizes with an
    // external system (the API), which is what useEffect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function updateStatus(status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function assignTo(assignedToId: string | null) {
    await fetch(`/api/leads/${id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    load();
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    await fetch(`/api/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    setNoteBody("");
    setSavingNote(false);
    load();
  }

  if (!lead) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Back to pipeline
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{lead.fullName}</h1>
          <p className="text-sm text-neutral-400">
            {lead.email} {lead.company && `· ${lead.company}`}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Source: {lead.source} · Received{" "}
            {new Date(lead.createdAt).toLocaleString()}
          </p>
        </div>
        <select
          value={lead.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {lead.message && (
        <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-300">
          {lead.message}
        </div>
      )}

      <div className="mt-4">
        <span className="text-xs uppercase text-neutral-500">Assigned to</span>
        {me?.role === "ADMIN" ? (
          <select
            value={lead.assignedTo?.id ?? ""}
            onChange={(e) => assignTo(e.target.value || null)}
            className="ml-3 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="ml-3 text-sm">
            {lead.assignedTo?.name || "Unassigned"}
            <span className="ml-2 text-xs text-neutral-600">
              (only admins reassign)
            </span>
          </span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-500">
            Notes
          </h2>
          <div className="mb-3 space-y-2">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              onClick={addNote}
              disabled={savingNote}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {savingNote ? "Saving…" : "Add note"}
            </button>
          </div>
          <div className="space-y-3">
            {lead.notes.length === 0 && (
              <p className="text-sm text-neutral-600">No notes yet.</p>
            )}
            {lead.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-md border border-neutral-800 p-3 text-sm"
              >
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {n.author.name} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-500">
            Activity
          </h2>
          <ol className="space-y-2 border-l border-neutral-800 pl-4">
            {lead.activities.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-neutral-300">{a.detail}</p>
                <p className="text-xs text-neutral-600">
                  {a.actor?.name ?? "System"} ·{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

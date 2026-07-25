"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"];

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-950 text-blue-300 border-blue-900",
  CONTACTED: "bg-amber-950 text-amber-300 border-amber-900",
  QUALIFIED: "bg-purple-950 text-purple-300 border-purple-900",
  PROPOSAL_SENT: "bg-cyan-950 text-cyan-300 border-cyan-900",
  WON: "bg-emerald-950 text-emerald-300 border-emerald-900",
  LOST: "bg-neutral-900 text-neutral-500 border-neutral-800",
};

type Lead = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  status: string;
  source: string;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/leads?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [status, q, page]);

  useEffect(() => {
    // Fetch on mount and on filter/page change; synchronizing with the API
    // is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-neutral-500">
            {pagination ? `${pagination.total} leads` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search name, email, company…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="w-64 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody>
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-neutral-800 hover:bg-neutral-900/50"
              >
                <td className="px-4 py-3">
                  <Link href={`/dashboard/${lead.id}`} className="hover:underline">
                    <div className="font-medium">{lead.fullName}</div>
                    <div className="text-xs text-neutral-500">{lead.email}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-400">{lead.company || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[lead.status]}`}
                  >
                    {lead.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {lead.assignedTo?.name || "Unassigned"}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-neutral-400">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-neutral-800 px-2 py-1 disabled:opacity-30"
          >
            Prev
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-neutral-800 px-2 py-1 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

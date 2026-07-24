"use client";
import { useEffect, useState } from "react";

type Req = {
  id: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  createdAt: string;
  user: { publicId: string; name: string; email: string };
  batch: { id: string; name: string; slug: string; price: string; discountedPrice: string | null };
};

export default function EnrollmentRequestsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [requests, setRequests] = useState<Req[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [grant, setGrant] = useState({ publicId: "", batchId: "", adminNote: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const qs = tab === "all" ? "" : `?status=${tab}`;
    const r = await fetch(`/api/enrollment-requests${qs}`).then((r) => r.json());
    setRequests(r);
  };
  useEffect(() => {
    fetch("/api/batches").then((r) => r.json()).then(setBatches);
  }, []);
  useEffect(() => { load(); }, [tab]);

  async function decide(id: string, status: "approved" | "rejected") {
    await fetch(`/api/enrollment-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function grantByID(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/enrollment-requests/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grant),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`✓ Enrolled ${data.user.name} (${data.user.publicId})`);
      setGrant({ publicId: "", batchId: "", adminNote: "" });
      load();
    } else {
      setMsg(`✗ ${data.error ?? "Failed"}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enrollment requests</h1>
        <p className="text-sm text-slate-500">
          Students who clicked <b>Contact on Instagram to buy</b>. Approve after payment lands in your DMs.
        </p>
      </div>

      {/* Quick grant */}
      <form onSubmit={grantByID} className="card p-4 space-y-3">
        <div className="font-semibold">⚡ Grant access by User ID</div>
        <p className="text-xs text-slate-500">
          Use this when a student DM&apos;d you their unique ID + which batch they paid for.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="input md:col-span-1"
            placeholder="User ID (from DM)"
            value={grant.publicId}
            onChange={(e) => setGrant({ ...grant, publicId: e.target.value })}
            required
          />
          <select
            className="input md:col-span-2"
            value={grant.batchId}
            onChange={(e) => setGrant({ ...grant, batchId: e.target.value })}
            required
          >
            <option value="">Select batch…</option>
            {batches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn-primary">Grant access</button>
        </div>
        <input
          className="input"
          placeholder="Optional note (e.g. UPI txn ref)"
          value={grant.adminNote}
          onChange={(e) => setGrant({ ...grant, adminNote: e.target.value })}
        />
        {msg && <p className="text-sm">{msg}</p>}
      </form>

      {/* Tabs */}
      <div className="flex gap-2 text-sm">
        {(["pending", "approved", "rejected", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 ${
              tab === t ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr>
              <th className="p-3">Student</th>
              <th>User ID</th>
              <th>Batch</th>
              <th>Amount</th>
              <th>Requested</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <div className="font-medium">{r.user.name}</div>
                  <div className="text-xs text-slate-500">{r.user.email}</div>
                </td>
                <td>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                    {r.user.publicId}
                  </code>
                </td>
                <td>{r.batch.name}</td>
                <td>₹{r.batch.discountedPrice ?? r.batch.price}</td>
                <td className="text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td>
                  <span
                    className={`badge ${
                      r.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {r.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => decide(r.id, "approved")}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(r.id, "rejected")}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No {tab === "all" ? "" : tab} requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

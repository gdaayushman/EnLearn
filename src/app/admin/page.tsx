import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [users, batches, enrollments, pendingRequests, recent] = await Promise.all([
    prisma.user.count(),
    prisma.batch.count(),
    prisma.enrollment.count(),
    prisma.enrollmentRequest.count({ where: { status: "pending" } }),
    prisma.enrollmentRequest.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true, batch: true },
    }),
  ]);

  const stats = [
    { label: "Users",             v: users },
    { label: "Batches",           v: batches },
    { label: "Enrollments",       v: enrollments },
    { label: "Pending requests",  v: pendingRequests, highlight: pendingRequests > 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`card p-4 ${s.highlight ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : ""}`}
          >
            <div className="text-xs uppercase text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent purchase requests</h2>
          <Link href="/admin/enrollment-requests" className="btn-primary text-sm">Open queue</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th>Student</th><th>User ID</th><th>Batch</th><th>Status</th><th>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {recent.map((r) => (
              <tr key={r.id.toString()}>
                <td className="py-2">{r.user.name}</td>
                <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{r.user.publicId}</code></td>
                <td>{r.batch.name}</td>
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
                <td>{r.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

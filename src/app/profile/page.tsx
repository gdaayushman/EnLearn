import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/utils";
import CopyId from "@/components/CopyId";
import { CONTACT } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [enrollments, pending] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      include: { batch: true },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.enrollmentRequest.findMany({
      where: { userId: user.id },
      include: { batch: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <aside className="card p-5 space-y-3">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
          {user.name[0]?.toUpperCase()}
        </div>
        <div className="text-lg font-semibold">{user.name}</div>
        <div className="text-sm text-slate-500">{user.email}</div>
        <span className="badge bg-slate-100 text-slate-700 w-fit">{user.role}</span>

        <div className="mt-2 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 p-3 dark:from-brand-900/30 dark:to-indigo-900/20">
          <div className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Your unique User ID</div>
          <CopyId value={user.publicId} />
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Share this ID when you DM{" "}
            <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              @{CONTACT.instagramHandle}
            </a>{" "}
            to buy a batch — that&apos;s how we recognise and approve you.
          </p>
        </div>
      </aside>

      <section className="md:col-span-2 space-y-6">
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">My enrollments</h2>
          {enrollments.length === 0 ? (
            <p className="text-slate-500 text-sm">
              You haven&apos;t enrolled in any batch yet. <Link href="/batches" className="text-brand-600">Browse batches</Link>.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {enrollments.map((e) => (
                <li key={e.id.toString()} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="font-medium">{e.batch.name}</div>
                  <div className="text-xs text-slate-500">Enrolled {e.enrolledAt.toLocaleDateString()}</div>
                  <Link href={`/batches/${e.batch.slug}`} className="btn-primary mt-2 text-xs w-full">Continue</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Purchase requests</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">
              No requests yet. Click <b>Contact on Instagram to buy</b> on any paid batch to start.
            </p>
          ) : (
            <ul className="text-sm divide-y divide-slate-200 dark:divide-slate-800">
              {pending.map((r) => (
                <li key={r.id.toString()} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{r.batch.name}</div>
                    <div className="text-xs text-slate-500">
                      Requested {r.createdAt.toLocaleDateString()}
                    </div>
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

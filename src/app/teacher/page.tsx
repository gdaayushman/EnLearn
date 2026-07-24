import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherDashboard() {
  const user = await currentUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const [openDoubts, batches] = await Promise.all([
    prisma.communityPost.count({ where: { postType: "doubt", isAnswered: false } }),
    prisma.batch.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teacher dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4"><div className="text-sm text-slate-500">Open doubts</div><div className="text-2xl font-bold">{openDoubts}</div></div>
        <div className="card p-4"><div className="text-sm text-slate-500">Batches</div><div className="text-2xl font-bold">{batches.length}</div></div>
        <div className="card p-4"><div className="text-sm text-slate-500">Actions</div>
          <Link href="/teacher/upload" className="btn-primary mt-2 text-sm">Upload content</Link>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Batches</h2>
        <ul className="space-y-2 text-sm">
          {batches.map(b => (
            <li key={b.id.toString()} className="flex items-center justify-between">
              <span>{b.name}</span>
              <Link href={`/batches/${b.slug}`} className="btn-ghost text-xs">Open</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTestsPage() {
  const tests = await prisma.test.findMany({
    include: { batch: true, _count: { select: { questions: true, attempts: true } } },
    orderBy: { id: "desc" },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tests</h1>
        <Link href="/admin/tests/new" className="btn-primary">+ New test</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr><th className="p-3">Title</th><th>Batch</th><th>Type</th><th>Questions</th><th>Marks</th><th>Duration</th><th>Attempts</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {tests.map(t => (
              <tr key={t.id.toString()}>
                <td className="p-3 font-medium">{t.title}</td>
                <td>{t.batch.name}</td>
                <td>{t.testType}</td>
                <td>{t._count.questions}</td>
                <td>{t.totalMarks}</td>
                <td>{t.durationMinutes} min</td>
                <td>{t._count.attempts}</td>
              </tr>
            ))}
            {tests.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No tests yet. Click <b>+ New test</b> above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBatchesPage() {
  const batches = await prisma.batch.findMany({
    include: { subCategory: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Batches</h1>
        <Link href="/admin/batches/new" className="btn-primary">+ New batch</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr><th className="p-3">Name</th><th>Category</th><th>Type</th><th>Price</th><th>Status</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {batches.map(b => (
              <tr key={b.id.toString()}>
                <td className="p-3 font-medium">
                  <Link href={`/batches/${b.slug}`} className="hover:text-brand-600">{b.name}</Link>
                </td>
                <td>{b.subCategory.category.name} · {b.subCategory.name}</td>
                <td>{b.batchType}</td>
                <td>{b.isFree ? "FREE" : inr(Number(b.discountedPrice ?? b.price))}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{b.isActive ? "Active" : "Archived"}</span></td>
                <td className="p-3 text-right">
                  <Link href={`/admin/batches/${b.id}`} className="text-brand-600 hover:underline text-sm">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
